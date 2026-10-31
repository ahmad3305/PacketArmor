import time
from typing import Dict, Any, Optional
from app.config import (
    DEFAULT_AUTO_MITIGATION,
    DEFAULT_MIN_BLOCK_SEVERITY,
    DEFAULT_BLOCK_DURATION_SEC
)
from app.storage.json_store import json_store
from app.response.firewall import firewall_manager

SEVERITY_ORDER = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4
}

class MitigationEngine:
    def __init__(self):
        self.auto_mitigation_enabled = DEFAULT_AUTO_MITIGATION
        self.min_block_severity = DEFAULT_MIN_BLOCK_SEVERITY
        self.block_duration_sec = DEFAULT_BLOCK_DURATION_SEC

        # Sync persisted active blocks to firewall manager
        for rec in json_store.get_all(active_only=True):
            firewall_manager.active_blocks.add(rec["ip"])

    def handle_alert(self, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Evaluates whether an alert warrants automatic intrusion response.
        """
        if not self.auto_mitigation_enabled:
            return None

        src_ip = alert_data.get("src_ip")
        if not src_ip or src_ip in ("127.0.0.1", "0.0.0.0", "localhost"):
            return None

        alert_sev = alert_data.get("severity", "MEDIUM").upper()
        min_sev = self.min_block_severity.upper()

        if SEVERITY_ORDER.get(alert_sev, 0) >= SEVERITY_ORDER.get(min_sev, 3):
            # Check if already blocked
            if not json_store.is_blocked(src_ip):
                reason = f"Automated Mitigation: {alert_data.get('msg', 'Malicious Traffic')}"
                block_res = self.block_ip(
                    ip=src_ip,
                    reason=reason,
                    severity=alert_sev,
                    duration_sec=self.block_duration_sec
                )
                return block_res

        return None

    def block_ip(
        self,
        ip: str,
        reason: str = "Manual Security Block",
        severity: str = "HIGH",
        duration_sec: int = 300
    ) -> Dict[str, Any]:
        fw_res = firewall_manager.block_ip(ip)
        record = json_store.block_ip(
            ip=ip,
            reason=reason,
            severity=severity,
            duration_sec=duration_sec,
            system_firewall=fw_res.get("system_applied", False)
        )
        record["firewall_details"] = fw_res
        return record

    def unblock_ip(self, ip: str) -> Dict[str, Any]:
        fw_res = firewall_manager.unblock_ip(ip)
        unblocked = json_store.unblock_ip(ip)
        return {
            "ip": ip,
            "success": unblocked,
            "firewall_details": fw_res
        }

    def check_expired_blocks(self):
        """Called periodically to unblock expired temporary bans."""
        now = time.time()
        for rec in json_store.get_all(active_only=False):
            if rec.get("active", False):
                exp = rec.get("expires_at", 0)
                if 0 < exp < now:
                    ip = rec.get("ip")
                    self.unblock_ip(ip)

mitigation_engine = MitigationEngine()

