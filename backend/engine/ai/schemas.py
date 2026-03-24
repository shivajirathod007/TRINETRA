from pydantic import BaseModel
from typing import Optional, Literal

class ClassifierInput(BaseModel):
    asset_url: str                    
    asset_type: str                   
    status_code: int                  
    response_headers: dict[str, str]  
    response_body: str                
    request_method: str               
    request_url: str                  
    tls_cipher_suite: Optional[str] = None   
    cert_algorithm: Optional[str] = None     

class SingleDetection(BaseModel):
    algorithm_detected: str           
    quantum_safe: bool                
    risk_class: Literal[
        "QUANTUM_VULNERABLE",
        "CLASSICAL_SAFE",
        "PQC_READY",
        "UNKNOWN"
    ]
    confidence: float                 
    location: str                     
    evidence_text: str                
    reason: str                       

class ClassifierOutput(BaseModel):
    asset_url: str                    
    detections: list[SingleDetection] 
    fallback_used: bool               
    fallback_reason: Optional[str] = None    
    model_version: str                
    processing_time_ms: float         
    raw_input_tokens: int             
