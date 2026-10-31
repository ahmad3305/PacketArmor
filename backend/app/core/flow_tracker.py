import time
from collections import defaultdict
from typing import Dict, Any, List

class FlowTracker:
    def __init__(self):
        # 5-tuple -> flow record
        # (src_ip, src_port, dst_ip, dst_port, proto) -> {start_time, last_seen, packets, bytes}
        self.flows: Dict[str, Dict[str, Any]] = {}
        self.flow_timeout = 30.0 # seconds of inactivity to expire flow

    def record_packet(self, pkt_meta: Dict[str, Any]):
        src_ip = pkt_meta.get("src_ip")
        dst_ip = pkt_meta.get("dst_ip")
        src_port = pkt_meta.get("src_port", 0)
        dst_port = pkt_meta.get("dst_port", 0)
        proto = pkt_meta.get("protocol", "OTHER")
        length = pkt_meta.get("length", 0)

        if not src_ip or not dst_ip:
            return

        flow_id = f"{src_ip}:{src_port}->{dst_ip}:{dst_port}[{proto}]"
        reverse_flow_id = f"{dst_ip}:{dst_port}->{src_ip}:{src_port}[{proto}]"

        now = time.time()

        if flow_id in self.flows:
            rec = self.flows[flow_id]
            rec["last_seen"] = now
            rec["packets"] += 1
            rec["bytes"] += length
        elif reverse_flow_id in self.flows:
            rec = self.flows[reverse_flow_id]
            rec["last_seen"] = now
            rec["packets"] += 1
            rec["bytes"] += length
        else:
            self.flows[flow_id] = {
                "flow_id": flow_id,
                "src_ip": src_ip,
                "src_port": src_port,
                "dst_ip": dst_ip,
                "dst_port": dst_port,
                "protocol": proto,
                "start_time": now,
                "last_seen": now,
                "packets": 1,
                "bytes": length
            }

        # Periodic cleanup if flow table grows large
        if len(self.flows) > 500:
            self.cleanup()

    def cleanup(self):
        now = time.time()
        expired = [fid for fid, rec in self.flows.items() if (now - rec["last_seen"]) > self.flow_timeout]
        for fid in expired:
            del self.flows[fid]

    def get_active_flows(self, limit: int = 50) -> List[Dict[str, Any]]:
        self.cleanup()
        records = sorted(self.flows.values(), key=lambda x: x["last_seen"], reverse=True)
        return records[:limit]

flow_tracker = FlowTracker()

