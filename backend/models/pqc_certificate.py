from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from . import Base

class PQCCertificate(Base):
    __tablename__ = "pqc_certificates"
    
    id = Column(String, primary_key=True)
    asset_id = Column(String, ForeignKey("assets.id"))
    cert_type = Column(String) # QUANTUM_VULNERABLE, PQC_READY, FULLY_QUANTUM_SAFE
    score = Column(Float)
    issued_at = Column(DateTime)
