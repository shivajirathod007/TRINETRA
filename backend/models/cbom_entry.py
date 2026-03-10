from sqlalchemy import Column, String, ForeignKey
from . import Base

class CBOMEntry(Base):
    __tablename__ = "cbom_entries"
    
    id = Column(String, primary_key=True)
    scan_id = Column(String, ForeignKey("scans.id"))
    component_name = Column(String)
    algorithm = Column(String)
    key_size = Column(String)
