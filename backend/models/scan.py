from sqlalchemy import Column, String, DateTime, Integer
from . import Base
import datetime

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(String, primary_key=True)
    domain = Column(String, index=True)
    status = Column(String)  # pending, in_progress, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
