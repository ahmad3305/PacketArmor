from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.core.sniffer import sniffer
from app.storage.memory_store import memory_store

router = APIRouter(prefix="/api/system", tags=["System"])

class StartRequest(BaseModel):
    interface: Optional[str] = None
    mode: Optional[str] = "simulation"

@router.get("/status")
def get_system_status():
    return {
        "status": "RUNNING" if sniffer.is_running else "STOPPED",
        "mode": sniffer.mode,
        "selected_interface": sniffer.selected_interface,
        "packets_processed": memory_store.packets_total,
        "alerts_triggered": memory_store.alerts_total,
        "dropped_packets": sniffer.dropped_packets_count
    }

@router.get("/interfaces")
def list_interfaces():
    return {
        "interfaces": sniffer.get_interfaces()
    }

@router.post("/start")
def start_engine(req: StartRequest):
    sniffer.start(interface=req.interface, mode=req.mode or "simulation")
    return {
        "status": "RUNNING",
        "mode": sniffer.mode,
        "interface": sniffer.selected_interface
    }

@router.post("/stop")
def stop_engine():
    sniffer.stop()
    return {
        "status": "STOPPED"
    }

