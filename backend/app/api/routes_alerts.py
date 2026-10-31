from fastapi import APIRouter, Query, Response
from typing import Optional, List
import csv
import io
import json
from app.storage.memory_store import memory_store

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
def get_alerts(
    limit: int = Query(50, ge=1, le=500),
    severity: Optional[str] = None,
    src_ip: Optional[str] = None
):
    alerts = memory_store.get_recent_alerts(limit=limit, severity=severity)
    if src_ip:
        alerts = [a for a in alerts if a.get("src_ip") == src_ip]
    return {
        "count": len(alerts),
        "alerts": alerts
    }

@router.delete("")
def clear_all_alerts():
    memory_store.clear_alerts()
    return {"status": "success", "message": "Alert buffer cleared."}

@router.get("/export")
def export_alerts(format: str = Query("json", pattern="^(json|csv)$")):
    alerts = memory_store.get_recent_alerts(limit=1000)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Severity", "Signature", "Category", "Source IP", "Source Port", "Dest IP", "Dest Port", "Protocol", "Mitigation"])
        for a in alerts:
            al = a.get("alert", {})
            mit = a.get("mitigation", {}).get("status", "none")
            writer.writerow([
                a.get("timestamp"),
                al.get("severity"),
                al.get("signature"),
                al.get("category"),
                a.get("src_ip"),
                a.get("src_port"),
                a.get("dest_ip"),
                a.get("dest_port"),
                a.get("proto"),
                mit
            ])
        csv_data = output.getvalue()
        return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=packetarmor_alerts.csv"})

    return Response(content=json.dumps(alerts, indent=2), media_type="application/json", headers={"Content-Disposition": "attachment; filename=packetarmor_alerts.json"})
