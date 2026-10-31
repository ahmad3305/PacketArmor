from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.rule_engine import rule_engine

router = APIRouter(prefix="/api/rules", tags=["Rules"])

class CustomRuleRequest(BaseModel):
    rule: str

class ToggleRuleRequest(BaseModel):
    enabled: bool

@router.get("")
def list_rules():
    rules = rule_engine.get_rules()
    return {
        "count": len(rules),
        "rules": rules
    }

@router.post("")
def add_rule(req: CustomRuleRequest):
    res = rule_engine.add_custom_rule(req.rule)
    if not res:
        raise HTTPException(
            status_code=400,
            detail="Invalid Snort rule format or duplicated SID. Ensure valid syntax: alert proto src_ip src_port -> dst_ip dst_port (options...)"
        )
    return {
        "status": "success",
        "message": "Custom rule successfully registered and saved.",
        "rule": res
    }

@router.put("/{sid}/toggle")
def toggle_rule(sid: int, req: ToggleRuleRequest):
    success = rule_engine.toggle_rule(sid=sid, enabled=req.enabled)
    if not success:
        raise HTTPException(status_code=404, detail=f"Rule with SID {sid} not found.")
    return {
        "status": "success",
        "sid": sid,
        "enabled": req.enabled
    }

@router.post("/reload")
def reload_rules():
    rule_engine.reload_rules()
    return {
        "status": "success",
        "total_rules": len(rule_engine.rules)
    }

