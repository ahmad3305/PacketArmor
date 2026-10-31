import json
import time
from typing import Dict, Any, List
from app.config import ALERTS_LOG_PATH
from app.storage.memory_store import memory_store

class AlertNotifier:
    def __init__(self, log_path=ALERTS_LOG_PATH):
        self.log_path = log_path

    def process_and_record_alert(
        self,
        alert_dict: Dict[str, Any],
        mitigation_result: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Formats alert in Suricata EVE-JSON format and appends to persistent log and memory store.
        """
        now = time.time()
        iso_time = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now))

        eve_record = {
            "timestamp": iso_time,
            "epoch": now,
            "event_type": "alert",
            "src_ip": alert_dict.get("src_ip"),
            "src_port": alert_dict.get("src_port"),
            "dest_ip": alert_dict.get("dst_ip"),
            "dest_port": alert_dict.get("dst_port"),
            "proto": alert_dict.get("protocol", "IP").upper(),
            "severity": alert_dict.get("severity", "MEDIUM"),
            "category": alert_dict.get("classtype", "misc-attack"),
            "msg": alert_dict.get("msg", "Intrusion detected"),
            "alert": {
                "action": alert_dict.get("action", "alert"),
                "gid": 1,
                "signature_id": alert_dict.get("sid", 1),
                "rev": alert_dict.get("rev", 1),
                "signature": alert_dict.get("msg", "Intrusion detected"),
                "category": alert_dict.get("classtype", "misc-attack"),
                "severity": alert_dict.get("severity", "MEDIUM")
            },
            "payload_preview": alert_dict.get("payload_preview", ""),
            "packet_length": alert_dict.get("length", 0),
            "mitigation": mitigation_result if mitigation_result else {"status": "none"}
        }

        # Store in memory ring buffer
        memory_store.add_alert(eve_record)

        # Append to persistent EVE JSONL log
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(eve_record) + "\n")
        except Exception as e:
            pass

        return eve_record

alert_notifier = AlertNotifier()
