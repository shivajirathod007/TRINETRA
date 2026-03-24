from .schemas import ClassifierInput

def preprocess_response(payload: ClassifierInput, tokenizer=None) -> tuple[str, int]:
    """
    Combines HTTP headers and body into a single string for AI classification.
    Truncates the body if the total length exceeds the transformer token limit (512).
    """
    header_str = " | ".join(f"{k}: {v}" for k, v in payload.response_headers.items())
    body_str = payload.response_body
    
    # Lowercase everything as requested in technical brief
    combined_text = f"HEADERS: {header_str}\nBODY: {body_str}".lower()
    
    token_count = 0
    if tokenizer:
        # Get actual token count
        tokens = tokenizer(combined_text, truncation=False)
        token_count = len(tokens.get("input_ids", []))
    else:
        token_count = len(combined_text) // 4
        
    return combined_text, token_count
