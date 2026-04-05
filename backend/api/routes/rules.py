from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from db.session import get_db
from db.models import CustomScanRule
from api.dependencies import get_current_user

router = APIRouter()

class RuleCreateReq(BaseModel):
    match_type: str = Field(..., description="HOSTNAME, CIPHER_SUITE, PROTOCOL")
    pattern: str = Field(..., description="Pattern to match, allows wildcards like *.example.com")
    override_status: str = Field(..., description="PQC_READY, VULNERABLE, FULLY_QUANTUM_SAFE, etc.")
    is_active: bool = True

class RuleResponse(RuleCreateReq):
    id: uuid.UUID
    created_at: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[RuleResponse])
async def list_rules(db: AsyncSession = Depends(get_db)):
    """List all custom scan rules."""
    result = await db.execute(select(CustomScanRule).order_by(CustomScanRule.created_at.desc()))
    rules = result.scalars().all()
    # Format dates
    return [
        RuleResponse(
            id=r.id,
            match_type=r.match_type,
            pattern=r.pattern,
            override_status=r.override_status,
            is_active=r.is_active,
            created_at=r.created_at.isoformat() if r.created_at else ""
        ) for r in rules
    ]

@router.post("/", response_model=RuleResponse)
async def create_rule(
    req: RuleCreateReq, 
    db: AsyncSession = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    """Create a new manual scan rule."""
    rule = CustomScanRule(
        match_type=req.match_type,
        pattern=req.pattern,
        override_status=req.override_status,
        is_active=req.is_active
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    
    return RuleResponse(
        id=rule.id,
        match_type=rule.match_type,
        pattern=rule.pattern,
        override_status=rule.override_status,
        is_active=rule.is_active,
        created_at=rule.created_at.isoformat() if rule.created_at else ""
    )

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    """Delete a custom scan rule."""
    result = await db.execute(select(CustomScanRule).where(CustomScanRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    await db.delete(rule)
    await db.commit()
    return {"status": "success", "message": "Rule deleted"}
