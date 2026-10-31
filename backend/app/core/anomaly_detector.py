import time
from collections import defaultdict, deque
from typing import Dict, List, Optional, Any
from app.config import (
    PORT_SCAN_PORT_COUNT,
    PORT_SCAN_WINDOW_SEC,
    SYN_FLOOD_COUNT,
    SYN_FLOOD_WINDOW_SEC,
    ICMP_FLOOD_COUNT,
    ICMP_FLOOD_WINDOW_SEC,
    VOLUMETRIC_DOS_RATE
)

class AnomalyDetector:
    def __init__(self):
        # Tracking structures
        # src_ip -> deque of (timestamp, dst_port)
        self.port_scan_tracker: Dict[str, deque] = defaultdict(deque)
        
        # src_ip -> deque of timestamps (SYN packets)
        self.syn_tracker: Dict[str, deque] = defaultdict(deque)
        
        # src_ip -> deque of timestamps (ICMP packets)
        self.icmp_tracker: Dict[str, deque] = defaultdict(deque)
        
        # src_ip -> deque of timestamps (any packet for volumetric DoS)
        self.volumetric_tracker: Dict[str, deque] = defaultdict(deque)

        # Alert cooldown to prevent alert flooding: (src_ip, alert_type) -> last_alert_time
        self.alert_cooldowns: Dict[str, float] = {}
        self.cooldown_duration = 5.0 # seconds

    def _should_suppress(self, key: str, now: float) -> bool:
        last_time = self.alert_cooldowns.get(key, 0)
        if (now - last_time) < self.cooldown_duration:
            return True
        self.alert_cooldowns[key] = now
        return False

    def inspect_packet(self, pkt_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
        anomalies = []
        now = time.time()
        src_ip = pkt_meta.get("src_ip")
        if not src_ip or src_ip in ("127.0.0.1", "0.0.0.0"):
            return anomalies

        proto = pkt_meta.get("protocol", "").upper()
        flags = pkt_meta.get("flags", "")
        dst_port = pkt_meta.get("dst_port")

        # -------------------------------------------------------------
        # 1. Port Scan Detection (Reconnaissance)
        # -------------------------------------------------------------
        if dst_port is not None:
            q = self.port_scan_tracker[src_ip]
            q.append((now, dst_port))
            # Expire old records outside time window
            while q and (now - q[0][0]) > PORT_SCAN_WINDOW_SEC:
                q.popleft()

            unique_ports = {item[1] for item in q}
            if len(unique_ports) >= PORT_SCAN_PORT_COUNT:
                cooldown_key = f"{src_ip}_portscan"
                if not self._should_suppress(cooldown_key, now):
                    anomalies.append({
                        "sid": 9000001,
                        "msg": f"ANOMALY - Network Port Scan Detected ({len(unique_ports)} ports targeted in {PORT_SCAN_WINDOW_SEC}s)",
                        "classtype": "attempted-recon",
                        "severity": "HIGH",
                        "priority": 2,
                        "category": "Reconnaissance / Port Scan",
                        "evidence": f"Targeted ports sample: {sorted(list(unique_ports))[:10]}"
                    })

        # -------------------------------------------------------------
        # 2. TCP SYN Flood (Denial of Service)
        # -------------------------------------------------------------
        if proto == "TCP" and "S" in flags and "A" not in flags:
            sq = self.syn_tracker[src_ip]
            sq.append(now)
            while sq and (now - sq[0]) > SYN_FLOOD_WINDOW_SEC:
                sq.popleft()

            if len(sq) >= SYN_FLOOD_COUNT:
                cooldown_key = f"{src_ip}_synflood"
                if not self._should_suppress(cooldown_key, now):
                    anomalies.append({
                        "sid": 9000002,
                        "msg": f"ANOMALY - TCP SYN Flood Attack Detected ({len(sq)} half-open SYNs in {SYN_FLOOD_WINDOW_SEC}s)",
                        "classtype": "denial-of-service",
                        "severity": "CRITICAL",
                        "priority": 1,
                        "category": "DoS / SYN Flood",
                        "evidence": f"Rate: {round(len(sq) / SYN_FLOOD_WINDOW_SEC, 1)} SYNs/sec"
                    })

        # -------------------------------------------------------------
        # 3. ICMP Ping Flood
        # -------------------------------------------------------------
        if proto == "ICMP":
            iq = self.icmp_tracker[src_ip]
            iq.append(now)
            while iq and (now - iq[0]) > ICMP_FLOOD_WINDOW_SEC:
                iq.popleft()

            if len(iq) >= ICMP_FLOOD_COUNT:
                cooldown_key = f"{src_ip}_icmpflood"
                if not self._should_suppress(cooldown_key, now):
                    anomalies.append({
                        "sid": 9000003,
                        "msg": f"ANOMALY - ICMP Ping Flood Detected ({len(iq)} echo requests in {ICMP_FLOOD_WINDOW_SEC}s)",
                        "classtype": "denial-of-service",
                        "severity": "HIGH",
                        "priority": 2,
                        "category": "DoS / ICMP Flood",
                        "evidence": f"Rate: {round(len(iq) / ICMP_FLOOD_WINDOW_SEC, 1)} pings/sec"
                    })

        # -------------------------------------------------------------
        # 4. Volumetric Flood / Packet Spam
        # -------------------------------------------------------------
        vq = self.volumetric_tracker[src_ip]
        vq.append(now)
        while vq and (now - vq[0]) > 1.0: # 1-second window
            vq.popleft()

        if len(vq) >= VOLUMETRIC_DOS_RATE:
            cooldown_key = f"{src_ip}_volumetric"
            if not self._should_suppress(cooldown_key, now):
                anomalies.append({
                    "sid": 9000004,
                    "msg": f"ANOMALY - Volumetric Packet Flood ({len(vq)} pkts/sec exceeding threshold {VOLUMETRIC_DOS_RATE})",
                    "classtype": "denial-of-service",
                    "severity": "CRITICAL",
                    "priority": 1,
                    "category": "DoS / Volumetric Flood",
                    "evidence": f"Rate: {len(vq)} pkts/sec"
                })

        return anomalies

anomaly_detector = AnomalyDetector()

