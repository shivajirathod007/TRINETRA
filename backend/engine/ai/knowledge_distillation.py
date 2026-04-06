"""
Knowledge Distillation Pipeline for JARSH Chatbot
Uses Ollama as teacher to generate training data for DistilBERT student model
"""

import json
import asyncio
import aiohttp
from typing import List, Dict, Tuple
from pathlib import Path
import logging

log = logging.getLogger(__name__)


# ============================================================================
#                   STEP 1: Generate Training Data with Ollama
# ============================================================================

class OllamaTeacher:
    """Uses Ollama to generate labeled training examples"""
    
    def __init__(self, model: str = "mistral:7b", host: str = "http://localhost:11434"):
        self.model = model
        self.host = host
        self.system_prompt = """You are JARSH, a Quantum Security Intelligence Assistant for TRINETRA.
        
Your expertise:
- Cryptographic vulnerability analysis
- Post-Quantum Cryptography (PQC) migration planning
- NIST standards and compliance
- Risk assessment and mitigation strategies
- Certificate and TLS analysis

Respond with technical accuracy but in accessible language."""

    async def generate_training_examples(self, queries: List[str]) -> List[Dict[str, str]]:
        """Generate responses for a list of queries to create training dataset"""
        try:
            import aiohttp
            
            training_data = []
            
            async with aiohttp.ClientSession() as session:
                for i, query in enumerate(queries, 1):
                    try:
                        log.info(f"Processing query {i}/{len(queries)}: {query[:50]}...")
                        response = await self._call_ollama(session, query)
                        
                        if response and len(response.strip()) > 10:
                            training_data.append({
                                "query": query,
                                "response": response,
                                "label": self._classify_intent(query)
                            })
                            log.info(f"✓ Generated training example {i}/{len(queries)}")
                        else:
                            log.warning(f"Empty response for query: {query[:50]}")
                            
                    except Exception as e:
                        log.error(f"Failed to generate example for query '{query[:50]}...': {str(e)}")
                        continue
            
            log.info(f"Successfully generated {len(training_data)} training examples out of {len(queries)} queries")
            return training_data
            
        except ImportError:
            log.error("aiohttp not installed. Run: pip install aiohttp")
            return []
    
    async def _call_ollama(self, session, query: str, max_retries: int = 3) -> str:
        """Call Ollama API to generate response with retry logic"""
        url = f"{self.host}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": f"{self.system_prompt}\n\nUser: {query}\n\nAssistant:",
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 500,  # Limit response length
            }
        }
        
        for attempt in range(max_retries):
            try:
                timeout = aiohttp.ClientTimeout(total=120)  # 2 minute timeout
                async with session.post(url, json=payload, timeout=timeout) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        response_text = result.get('response', '').strip()
                        
                        if response_text:
                            return response_text
                        else:
                            log.warning(f"Empty response from Ollama (attempt {attempt + 1}/{max_retries})")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(2)  # Wait before retry
                                continue
                    else:
                        error_text = await resp.text()
                        raise Exception(f"Ollama API error {resp.status}: {error_text}")
                        
            except asyncio.TimeoutError:
                log.warning(f"Timeout calling Ollama (attempt {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                else:
                    raise Exception("Ollama timeout after all retries")
                    
            except Exception as e:
                if attempt < max_retries - 1:
                    log.warning(f"Error calling Ollama (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    await asyncio.sleep(2)
                    continue
                else:
                    raise
        
        raise Exception("Failed to get response from Ollama after all retries")
    
    def _classify_intent(self, query: str) -> str:
        """Classify query intent for training labels"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["scan", "analyze", "vulnerability", "found"]):
            return "scan_analysis"
        elif any(word in query_lower for word in ["mitigation", "fix", "remediate", "how to"]):
            return "mitigation"
        elif any(word in query_lower for word in ["quantum", "pqc", "crqc", "threat"]):
            return "quantum_threat"
        elif any(word in query_lower for word in ["readiness", "compliance", "posture"]):
            return "readiness"
        elif any(word in query_lower for word in ["hello", "hi", "help"]):
            return "greeting"
        else:
            return "general"


# ============================================================================
#                   STEP 2: Training Queries Dataset
# ============================================================================

TRAINING_QUERIES = [
    # Greetings
    "Hello, what can you help me with?",
    "Hi JARSH, I need assistance",
    "Help me understand my security posture",
    
    # Scan Analysis
    "What vulnerabilities were found in my last scan?",
    "Analyze the scan results for example.com",
    "Show me critical issues from scan-123",
    "What are the most severe problems detected?",
    "Explain the RSA-2048 vulnerability",
    "Why is my TLS configuration weak?",
    "Summarize my recent scans",
    "Show me scan history",
    "What scans have been completed?",
    "Tell me about my last scan results",
    
    # Mitigation
    "How do I fix the RSA vulnerability?",
    "Show me mitigation steps for my domain",
    "What's the remediation plan?",
    "How long will it take to migrate to PQC?",
    "Give me a step-by-step migration guide",
    "What are the costs of upgrading?",
    
    # Quantum Threats - Generic PQC Questions
    "What is the quantum threat?",
    "When will quantum computers break encryption?",
    "Explain harvest now, decrypt later attacks",
    "What is Post-Quantum Cryptography?",
    "Which algorithms are quantum-safe?",
    "What is ML-KEM-768?",
    "What is ML-DSA-65?",
    "Explain NIST PQC standards",
    "Why should I care about quantum computing?",
    "What is a CRQC?",
    "How does quantum computing threaten current encryption?",
    "What is Shor's algorithm?",
    "What is Grover's algorithm?",
    
    # Readiness
    "Am I ready for quantum threats?",
    "What's my PQC readiness score?",
    "Show me compliance status",
    "Which assets need urgent attention?",
    "Generate a readiness report",
    "Compare my security posture with industry standards",
    
    # Technical Details
    "What is a CBOM?",
    "Explain certificate transparency",
    "What are NIST PQC standards?",
    "How does hybrid cryptography work?",
    "What is OCSP stapling?",
    "What is TLS 1.3?",
    "Explain RSA encryption",
    "What is ECDSA?",
    "What is key encapsulation?",
    
    # Planning
    "Create a migration timeline",
    "What should I prioritize first?",
    "Show me the risk assessment",
    "Generate an executive summary",
    "What are the compliance deadlines?",
    
    # No Scans Scenario
    "I haven't run any scans yet",
    "What should I do first?",
    "How do I start scanning?",
]


# ============================================================================
#                   STEP 3: Save Training Dataset
# ============================================================================

async def generate_training_dataset(output_path: str = "training_data.json"):
    """Generate complete training dataset using Ollama"""
    
    teacher = OllamaTeacher()
    
    log.info(f"Generating training data with {len(TRAINING_QUERIES)} queries...")
    log.info("This may take 10-15 minutes depending on your hardware...")
    
    training_data = await teacher.generate_training_examples(TRAINING_QUERIES)
    
    if len(training_data) == 0:
        log.error("Failed to generate any training data!")
        log.error("Please check:")
        log.error("  1. Ollama server is running: ollama serve")
        log.error("  2. Mistral model is available: ollama list")
        log.error("  3. Try manually: ollama run mistral:7b")
        raise Exception("No training data generated")
    
    if len(training_data) < len(TRAINING_QUERIES) * 0.5:
        log.warning(f"Only generated {len(training_data)}/{len(TRAINING_QUERIES)} examples")
        log.warning("This may affect model quality. Consider:")
        log.warning("  1. Checking Ollama server stability")
        log.warning("  2. Increasing timeout values")
        log.warning("  3. Running setup again")
    
    # Save to JSON
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, indent=2, ensure_ascii=False)
    
    log.info(f"Training dataset saved to {output_path}")
    log.info(f"Generated {len(training_data)} examples ({len(training_data)/len(TRAINING_QUERIES)*100:.1f}% success rate)")
    
    return training_data


# ============================================================================
#                   STEP 4: Fine-tune DistilBERT Student Model
# ============================================================================

class DistilBERTStudent:
    """Fine-tune DistilBERT on Ollama-generated data"""
    
    def __init__(self, model_name: str = "distilbert-base-uncased"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
    
    def prepare_training_data(self, training_data: List[Dict]) -> Tuple[List[str], List[str]]:
        """Prepare data for fine-tuning"""
        queries = [item['query'] for item in training_data]
        responses = [item['response'] for item in training_data]
        return queries, responses
    
    def fine_tune(self, training_data_path: str, output_dir: str = "./models/jarsh_distilbert"):
        """Fine-tune DistilBERT on the generated dataset"""
        try:
            from transformers import (
                DistilBertTokenizer, 
                DistilBertForSequenceClassification,
                Trainer,
                TrainingArguments
            )
            from datasets import Dataset
            import torch
            
            # Load training data
            with open(training_data_path, 'r') as f:
                training_data = json.load(f)
            
            # Prepare dataset
            queries, responses = self.prepare_training_data(training_data)
            labels = [item['label'] for item in training_data]
            
            # Create label mapping
            unique_labels = list(set(labels))
            label2id = {label: idx for idx, label in enumerate(unique_labels)}
            id2label = {idx: label for label, idx in label2id.items()}
            
            # Tokenize
            tokenizer = DistilBertTokenizer.from_pretrained(self.model_name)
            
            def tokenize_function(examples):
                return tokenizer(
                    examples['query'],
                    padding='max_length',
                    truncation=True,
                    max_length=128
                )
            
            # Create dataset
            dataset_dict = {
                'query': queries,
                'label': [label2id[label] for label in labels]
            }
            dataset = Dataset.from_dict(dataset_dict)
            tokenized_dataset = dataset.map(tokenize_function, batched=True)
            
            # Load model
            model = DistilBertForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=len(unique_labels),
                id2label=id2label,
                label2id=label2id
            )
            
            # Training arguments
            training_args = TrainingArguments(
                output_dir=output_dir,
                num_train_epochs=3,
                per_device_train_batch_size=8,
                warmup_steps=100,
                weight_decay=0.01,
                logging_dir=f'{output_dir}/logs',
                logging_steps=10,
                save_strategy="epoch",
            )
            
            # Train
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=tokenized_dataset,
            )
            
            log.info("Starting fine-tuning...")
            trainer.train()
            
            # Save model
            model.save_pretrained(output_dir)
            tokenizer.save_pretrained(output_dir)
            
            # Save label mapping
            with open(f"{output_dir}/label_mapping.json", 'w') as f:
                json.dump({"label2id": label2id, "id2label": id2label}, f, indent=2)
            
            log.info(f"Model fine-tuned and saved to {output_dir}")
            
        except ImportError as e:
            log.error(f"Required packages not installed: {e}")
            log.error("Run: pip install transformers datasets torch")


# ============================================================================
#                   STEP 5: CLI Interface
# ============================================================================

async def main():
    """Main pipeline execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="JARSH Knowledge Distillation Pipeline")
    parser.add_argument(
        "--step",
        choices=["generate", "train", "all"],
        default="all",
        help="Pipeline step to execute"
    )
    parser.add_argument(
        "--data-path",
        default="./backend/engine/ai/training_data.json",
        help="Path to save/load training data"
    )
    parser.add_argument(
        "--model-output",
        default="./backend/engine/ai/models/jarsh_distilbert",
        help="Path to save fine-tuned model"
    )
    
    args = parser.parse_args()
    
    if args.step in ["generate", "all"]:
        log.info("Step 1: Generating training data with Ollama...")
        await generate_training_dataset(args.data_path)
    
    if args.step in ["train", "all"]:
        log.info("Step 2: Fine-tuning DistilBERT student model...")
        student = DistilBERTStudent()
        student.fine_tune(args.data_path, args.model_output)
    
    log.info("✅ Knowledge distillation pipeline complete!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
