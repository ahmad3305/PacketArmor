import json
import time
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional
from app.config import BLOCKED_IPS_PATH

class JsonStore:
    def __init__(self, file_path: Path = BLOCKED_IPS_PATH):
        self.file_path = file_path
        self._lock = Lock()
        self._data: Dict[str, Dict] = {}
        self._load()

    def _load(self):
        with self._lock:
            if self.file_path.exists():
                try:
                    with open(self.file_path, "r", encoding="utf-8") as f:
                        self._data = json.load(f)
                except Exception as e:
                    self._data = {}
            else:
                self._data = {}
                self._save_unlocked()

    def _save_unlocked(self):
        try:
            temp_path = self.file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2)
            temp_path.replace(self.file_path)
        except Exception as e:
            pass

    def get_all(self, active_only: bool = True) -> List[Dict]:
        with self._lock:
            now = time.time()
            results = []
            for ip, record in self._data.items():
                if active_only:
                    if record.get("active", True):
                        expires_at = record.get("expires_at")
                        if expires_at and expires_at > 0 and expires_at < now:
                            continue # expired
                        results.append(record)
                else:
                    results.append(record)
            return sorted(results, key=lambda x: x.get("blocked_at", 0), reverse=True)

    def is_blocked(self, ip: str) -> bool:
        with self._lock:
            record = self._data.get(ip)
            if not record or not record.get("active", True):
                return False
            expires_at = record.get("expires_at")
            if expires_at and expires_at > 0 and expires_at < time.time():
                record["active"] = False
                self._save_unlocked()
                return False
            return True

    def block_ip(
        self,
        ip: str,
        reason: str = "Malicious Activity Detected",
        severity: str = "HIGH",
        duration_sec: int = 300,
        system_firewall: bool = False
    ) -> Dict:
        with self._lock:
            now = time.time()
            expires_at = (now + duration_sec) if duration_sec > 0 else 0
            record = {
                "ip": ip,
                "reason": reason,
                "severity": severity.upper(),
                "blocked_at": now,
                "duration_sec": duration_sec,
                "expires_at": expires_at,
                "active": True,
                "system_firewall": system_firewall
            }
            self._data[ip] = record
            self._save_unlocked()
            return record

    def unblock_ip(self, ip: str) -> bool:
        with self._lock:
            if ip in self._data:
                self._data[ip]["active"] = False
                self._save_unlocked()
                return True
            return False

    def remove_ip(self, ip: str) -> bool:
        with self._lock:
            if ip in self._data:
                del self._data[ip]
                self._save_unlocked()
                return True
            return False

json_store = JsonStore()

