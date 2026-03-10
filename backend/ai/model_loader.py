from transformers import pipeline
import logging

_classifier = None

def load_models():
    """
    Loads and caches the HuggingFace models.
    """
    global _classifier
    if _classifier is None:
        try:
            # For demonstration, using a standard text-classification pipeline
            # In a real app, this would be a fine-tuned crypto entity extractor
            _classifier = pipeline("text-classification", model="distilbert-base-uncased")
            logging.info("Model loaded successfully.")
        except Exception as e:
            logging.error(f"Failed to load model: {e}")

def get_classifier():
    if _classifier is None:
        load_models()
    return _classifier
