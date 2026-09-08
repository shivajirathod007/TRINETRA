"""
TRINETRA — AI Crypto Pattern Classifier
Uses fine-tuned DistilBERT to classify cryptographic asset risk
based on HTTP response text and headers.
"""

import os
import re
import time
import torch
from typing import Tuple, List, Optional
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizerFast
)
from core.config import settings
from core.logging import get_logger
from engine.ai.schemas import ClassifierInput, ClassifierOutput, SingleDetection
from engine.ai.preprocessor import preprocess_response
from engine.ai.llm_fallback import llm_classify
from engine.ai.patterns import (
    CRYPTO_PATTERNS,
    VULNERABILITY_PATTERNS,
    IMPLEMENTATION_PATTERNS,
    CLASSICAL_SAFE_PATTERNS,
)

log = get_logger(__name__)

# Model directory. Configurable via settings.ai_model_dir so v2 can be rolled
# back to v1 ("crypto_classifier") without a code change.
LOADED_MODEL_ROOT = os.path.join(os.path.dirname(__file__), "loaded_model")
MODEL_DIR = os.path.join(LOADED_MODEL_ROOT, settings.ai_model_dir)

PQC_READY_LABELS = {"ML-KEM-768", "ML-DSA-65", "SPHINCS+", "PQC_READY", "FALCON", "Kyber", "Dilithium"}

# Version tag derived from the loaded directory, so a rollback to v1 reports v1
# instead of silently claiming to be v2.
_version_match = re.search(r"_v(\d+)$", settings.ai_model_dir)
MODEL_VERSION = f"distilbert-crypto-v{_version_match.group(1)}" if _version_match else "distilbert-crypto-v1"

# HS* is HMAC over SHA-2: symmetric, so classical-safe. It lives in
# CRYPTO_PATTERNS alongside RS/ES/PS, so _create_detection needs it named here
# or it would fall through to QUANTUM_VULNERABLE with the rest of that dict.
CLASSICAL_SAFE_JWT_LABELS = {"HS256"}

# Appended to a regex CLASSICAL_SAFE detection when the model disagreed.
# classify_http_response() looks for this marker to set model_version.
REGEX_CS_OVERRIDE_NOTE = "Regex override: model disagreed"

class AIClassifier:
    """Singleton wrapper for the AI classification model."""
    _instance = None
    tokenizer = None
    model = None
    device = None
    id2label: dict = {}
    is_loaded: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIClassifier, cls).__new__(cls)
            cls._instance._init_once()
        return cls._instance

    def _init_once(self):
        self.load_model()

    def load_model(self):
        """Loads Tokenizer and Model from disk if available."""
        if self.is_loaded:
            return
            
        if not os.path.exists(MODEL_DIR):
            log.warning(
                "ai_model_not_found",
                path=MODEL_DIR,
                model_dir=settings.ai_model_dir,
                hint="drop the fine-tuned weights here, or set AI_MODEL_DIR to roll back",
            )
            return

        try:
            log.info("loading_ai_tokenizer", path=MODEL_DIR)
            self.tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)

            log.info("loading_ai_model", path=MODEL_DIR)
            self.model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
            self.model.eval()  # ensure inference mode
            
            self.device = torch.device("cpu")
            self.model = self.model.to(self.device)
            
            self.id2label = self.model.config.id2label
            self.is_loaded = True
            log.info(
                "ai_model_loaded",
                model_dir=settings.ai_model_dir,
                path=MODEL_DIR,
                device=str(self.device),
                labels=list(self.id2label.values()),
            )
        except Exception as e:
            log.error("ai_model_load_failed", error=str(e),
                      model_dir=settings.ai_model_dir, path=MODEL_DIR)
            self.is_loaded = False

    def predict(self, text: str) -> Tuple[List[SingleDetection], float]:
        """
        Runs rule-based pre-pass followed by DistilBERT model on text.
        Returns a list of SingleDetection and max confidence.
        """
        detections = []
        max_conf = 0.0

        if not text:
            return [], 0.0

        # ── 1. Rule-based Pre-pass (Regex) ────────────────────────────────────
        for label, pattern in CRYPTO_PATTERNS.items():
            if pattern.search(text):
                detections.append(self._create_detection(label, "regex_pattern_match", 1.0))
                max_conf = 1.0

        for label, pattern in VULNERABILITY_PATTERNS.items():
            if pattern.search(text):
                detections.append(self._create_detection(label, "vulnerability_pattern_match", 1.0))
                max_conf = 1.0

        for label, pattern in CLASSICAL_SAFE_PATTERNS.items():
            if pattern.search(text):
                detections.append(self._create_detection(label, "classical_safe_pattern_match", 1.0))
                max_conf = 1.0

        # ── 2. DistilBERT Model Prediction ──────────────────────────────────
        if not self.is_loaded:
            return detections, max_conf

        model_detection, model_conf = self._predict_model(text)
        if model_detection:
            detections.append(model_detection)
            max_conf = max(max_conf, model_conf)

        # ── 3. CLASSICAL_SAFE regex override ────────────────────────────────
        # v2 scores 0.00 F1 on CLASSICAL_SAFE, so for that class only the regex
        # verdict wins. The regex detection is annotated, never dropped.
        #
        # Deliberately additive: the model's own detection is left in place. A
        # response can legitimately carry both AES-256 and RSA, and suppressing a
        # QUANTUM_VULNERABLE finding to honour a CLASSICAL_SAFE one would hide the
        # very risk this scanner exists to report.
        model_said_cs = (
            model_detection is not None
            and model_detection.risk_class == "CLASSICAL_SAFE"
        )
        if not model_said_cs:
            for i, d in enumerate(detections):
                if (
                    d.risk_class == "CLASSICAL_SAFE"
                    and REGEX_CS_OVERRIDE_NOTE not in d.evidence_text
                    and d.evidence_text != "Detected via distilbert_model"
                ):
                    detections[i] = d.model_copy(update={
                        "evidence_text": f"{d.evidence_text} | {REGEX_CS_OVERRIDE_NOTE}",
                    })

        return detections, max_conf

    def _predict_model(self, text: str) -> Tuple[Optional[SingleDetection], float]:
        """Internal model-only prediction logic."""
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=512
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)

            probs = torch.softmax(outputs.logits, dim=-1)[0]
            pred_id = torch.argmax(probs).item()
            confidence = probs[pred_id].item()
            label = self.id2label.get(pred_id, "UNKNOWN")

            if label == "UNKNOWN" or label == "CLEAN":
                return None, confidence

            return self._create_detection(label, "distilbert_model", confidence), confidence
        except Exception as e:
            log.error("ai_model_prediction_failed", error=str(e))
            return None, 0.0

    def _create_detection(self, label: str, source: str, confidence: float) -> SingleDetection:
        """Helper to create SingleDetection object with consistent risk logic."""
        risk_class = "UNKNOWN"
        quantum_safe = False
        if label in PQC_READY_LABELS or label == "PQC_READY":
            risk_class = "PQC_READY"
            quantum_safe = True
        elif (
            label == "CLASSICAL_SAFE"
            or label in CLASSICAL_SAFE_PATTERNS
            or label in CLASSICAL_SAFE_JWT_LABELS
        ):
            # Classical-safe is not quantum-safe: AES/SHA-2 survive Shor but are
            # weakened by Grover, so quantum_safe stays False.
            risk_class = "CLASSICAL_SAFE"
        else:
            risk_class = "QUANTUM_VULNERABLE"

        return SingleDetection(
            algorithm_detected=label,
            quantum_safe=quantum_safe,
            risk_class=risk_class, # type: ignore
            confidence=round(confidence, 3),
            location="response_body_or_header",
            evidence_text=f"Detected via {source}",
            reason=f"{label} detected by {source}"
        )


async def classify_http_response(payload: ClassifierInput) -> ClassifierOutput:
    """
    Main entry point. Called by the Celery AI task worker.
    
    Flow:
    1. Preprocess payload into combined text
    2. Run DistilBERT inference
    3. If max confidence < 0.60 (including 0.0 = nothing detected), call LLM fallback
    4. Return ClassifierOutput
    """
    start = time.time()
    
    try:
        classifier = AIClassifier()
        combined_text, token_count = preprocess_response(payload, classifier.tokenizer)
        
        detections, max_conf = classifier.predict(combined_text)

        # model_version reflects what actually contributed, not what was available
        model_contributed = any(
            d.evidence_text == "Detected via distilbert_model" for d in detections
        )
        cs_override_fired = any(
            REGEX_CS_OVERRIDE_NOTE in d.evidence_text for d in detections
        )
        if cs_override_fired:
            model_version = f"{MODEL_VERSION}+regex-cs-override"
        elif model_contributed:
            model_version = MODEL_VERSION
        else:
            model_version = "regex-only"
        
        fallback_used = False
        fallback_reason = None
        
        if max_conf < 0.60:
            llm_detections = await llm_classify(payload)
            if llm_detections:
                detections = llm_detections
                fallback_used = True
                fallback_reason = f"low_confidence:{max_conf:.2f}"
                model_version = "llm-fallback"

        return ClassifierOutput(
            asset_url=payload.asset_url,
            detections=detections,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            model_version=model_version,
            processing_time_ms=(time.time() - start) * 1000,
            raw_input_tokens=token_count
        )
        
    except Exception as e:
        log.error("classifier_error", error=str(e))
        return ClassifierOutput(
            asset_url=payload.asset_url,
            detections=[],
            fallback_used=False,
            fallback_reason=f"classifier_error:{str(e)[:100]}",
            model_version="error",
            processing_time_ms=(time.time() - start) * 1000,
            raw_input_tokens=0
        )
