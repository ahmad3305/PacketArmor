import time
from collections import deque, Counter
from threading import Lock
from typing import List, Dict, Any, Optional
from app.config import MAX_BUFFER_PACKETS, MAX_BUFFER_ALERTS

class MemoryStore:
    def __init__(self):
        self._lock = Lock()
        
        # Ring buffers
        self.packets: deque = deque(maxlen=MAX_BUFFER_PACKETS)
        self.alerts: deque = deque(maxlen=MAX_BUFFER_ALERTS)
        
        # Counters
        self.packets_total = 0
        self.bytes_total = 0
        self.alerts_total = 0
        
        self.severity_counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0
        }
        
        self.protocol_counts = Counter()
        self.category_counts = Counter()
        self.top_sources = Counter()
        self.top_destinations = Counter()
        self.top_targeted_ports = Counter()
        
        # 60-second sliding window for real-time graphs (1 sample per second)
        self.history_window_sec = 60
        self.traffic_history: deque = deque(maxlen=60)
        self._current_bucket = {
            "timestamp": int(time.time()),
            "packets": 0,
            "bytes": 0,
            "alerts": 0
        }
        
    def add_packet(self, packet_data: Dict[str, Any]):
        with self._lock:
            self.packets.append(packet_data)
            self.packets_total += 1
            length = packet_data.get("length", 0)
            self.bytes_total += length
            
            proto = packet_data.get("protocol", "OTHER")
            self.protocol_counts[proto] += 1
            
            src = packet_data.get("src_ip")
            if src:
                self.top_sources[src] += 1
                
            dst = packet_data.get("dst_ip")
            if dst:
                self.top_destinations[dst] += 1
                
            dst_port = packet_data.get("dst_port")
            if dst_port:
                self.top_targeted_ports[dst_port] += 1
                
            self._update_bucket(packets_inc=1, bytes_inc=length, alerts_inc=0)

    def add_alert(self, alert_data: Dict[str, Any]):
        with self._lock:
            self.alerts.append(alert_data)
            self.alerts_total += 1
            
            sev = alert_data.get("severity", "MEDIUM").upper()
            if sev in self.severity_counts:
                self.severity_counts[sev] += 1
            else:
                self.severity_counts["MEDIUM"] += 1
                
            cat = alert_data.get("category", "Unclassified")
            self.category_counts[cat] += 1
            
            self._update_bucket(packets_inc=0, bytes_inc=0, alerts_inc=1)

    def _update_bucket(self, packets_inc: int, bytes_inc: int, alerts_inc: int):
        now_sec = int(time.time())
        if self._current_bucket["timestamp"] == now_sec:
            self._current_bucket["packets"] += packets_inc
            self._current_bucket["bytes"] += bytes_inc
            self._current_bucket["alerts"] += alerts_inc
        else:
            # Push finished bucket
            self.traffic_history.append(dict(self._current_bucket))
            # Start new bucket
            self._current_bucket = {
                "timestamp": now_sec,
                "packets": packets_inc,
                "bytes": bytes_inc,
                "alerts": alerts_inc
            }

    def get_recent_packets(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self.packets)[-limit:]

    def get_recent_alerts(self, limit: int = 100, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            if not severity:
                return list(reversed(list(self.alerts)))[:limit]
            filtered = [a for a in reversed(self.alerts) if a.get("severity", "").upper() == severity.upper()]
            return filtered[:limit]

    def get_metrics_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            # Snapshot sliding window
            history = list(self.traffic_history)
            history.append(dict(self._current_bucket))
            
            # Fill empty history if just started
            now_sec = int(time.time())
            if len(history) < 20:
                pad_count = 20 - len(history)
                padding = [{
                    "timestamp": now_sec - (pad_count - i),
                    "packets": 0,
                    "bytes": 0,
                    "alerts": 0
                } for i in range(pad_count)]
                history = padding + history
                
            # Current rates (last 5 seconds average)
            recent_secs = history[-5:] if len(history) >= 5 else history
            pps = sum(h["packets"] for h in recent_secs) / max(len(recent_secs), 1)
            bps = sum(h["bytes"] for h in recent_secs) / max(len(recent_secs), 1)
            
            return {
                "packets_total": self.packets_total,
                "bytes_total": self.bytes_total,
                "alerts_total": self.alerts_total,
                "packets_per_sec": round(pps, 1),
                "bytes_per_sec": round(bps, 1),
                "severity_counts": dict(self.severity_counts),
                "protocol_counts": dict(self.protocol_counts),
                "category_counts": dict(self.category_counts.most_common(8)),
                "top_sources": dict(self.top_sources.most_common(5)),
                "top_destinations": dict(self.top_destinations.most_common(5)),
                "top_targeted_ports": dict(self.top_targeted_ports.most_common(6)),
                "traffic_history": history[-30:] # return last 30 sec for chart
            }

    def clear_alerts(self):
        with self._lock:
            self.alerts.clear()
            self.alerts_total = 0
            for k in self.severity_counts:
                self.severity_counts[k] = 0
            self.category_counts.clear()

    def clear_packets(self):
        with self._lock:
            self.packets.clear()

memory_store = MemoryStore()

