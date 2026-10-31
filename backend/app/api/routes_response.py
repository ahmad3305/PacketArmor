from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.storage.json_store import json_store
from app.response.mitigation import mitigation_engine

router = APIRouter(prefix="/api/response", tags=["Response"])

class BlockIPRequest(BaseModel):
    ip: str
    reason: Optional[str] = "Manual Administrator Block"
    severity: Optional[str] = "HIGH"
    duration_sec: Optional[int] = 300

class UnblockIPRequest(BaseModel):
    ip: str

class MitigationConfigRequest(BaseModel):
    auto_mitigation_enabled: bool
    min_block_severity: str
    block_duration_sec: int

@router.get("/blocked")
def get_blocked_ips():
    return {
        "blocked_ips": json_store.get_all(active_only=False)
    }

@router.post("/block")
def block_ip_endpoint(req: BlockIPRequest):
    if not req.ip:
        raise HTTPException(status_code=400, detail="Target IP is required.")
    
    result = mitigation_engine.block_ip(
        ip=req.ip,
        reason=req.reason or "Manual Administrator Block",
        severity=req.severity or "HIGH",
        duration_sec=req.duration_sec if req.duration_sec is not None else 300
    )
    return {
        "status": "success",
        "result": result
    }

@router.post("/unblock")
def unblock_ip_endpoint(req: UnblockIPRequest):
    if not req.ip:
        raise HTTPException(status_code=400, detail="Target IP is required.")
        
    result = mitigation_engine.unblock_ip(req.ip)
    return {
        "status": "success",
        "result": result
    }

@router.get("/config")
def get_mitigation_config():
    return {
        "auto_mitigation_enabled": mitigation_engine.auto_mitigation_enabled,
        "min_block_severity": mitigation_engine.min_block_severity,
        "block_duration_sec": mitigation_engine.block_duration_sec
    }

@router.post("/config")
def update_mitigation_config(req: MitigationConfigRequest):
    mitigation_engine.auto_mitigation_enabled = req.auto_mitigation_enabled
    mitigation_engine.min_block_severity = req.min_block_severity
    mitigation_engine.block_duration_sec = req.block_duration_sec
    return {
        "status": "success",
        "config": {
            "auto_mitigation_enabled": mitigation_engine.auto_mitigation_enabled,
            "min_block_severity": mitigation_engine.min_block_severity,
            "block_duration_sec": mitigation_engine.block_duration_sec
        }
    }

