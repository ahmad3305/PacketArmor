from fastapi import APIRouter, Query
from app.storage.memory_store import memory_store
from app.core.flow_tracker import flow_tracker

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

@router.get("")
def get_metrics():
    return memory_store.get_metrics_snapshot()

@router.get("/flows")
def get_active_flows(limit: int = Query(30, ge=1, le=100)):
    return {
        "flows": flow_tracker.get_active_flows(limit=limit)
    }

@router.get("/packets")
def get_recent_packets(limit: int = Query(50, ge=1, le=200)):
    packets = memory_store.get_recent_packets(limit=limit)
    return {
        "count": len(packets),
        "packets": list(reversed(packets))
    }

