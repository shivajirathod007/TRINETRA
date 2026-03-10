from sqlalchemy import Column, String, Float, ForeignKey
from . import Base

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String, primary_key=True)
    scan_id = Column(String, ForeignKey("scans.id"))
    hostname = Column(String)
    ip_address = Column(String, nullable=True)
    exposure_score = Column(Float, nullable=True)
