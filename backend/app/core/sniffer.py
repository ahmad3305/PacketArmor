import time
import random
import threading
import socket
import psutil
from typing import Dict, List, Any, Optional

from app.storage.memory_store import memory_store
from app.core.rule_engine import rule_engine
from app.core.anomaly_detector import anomaly_detector
from app.core.flow_tracker import flow_tracker
from app.response.firewall import firewall_manager
from app.response.mitigation import mitigation_engine
from app.response.notifier import alert_notifier

class NetworkSniffer:
    def __init__(self):
        self.is_running = False
        self.mode = "simulation" # "live" or "simulation"
        self.selected_interface = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.dropped_packets_count = 0
        self.callbacks = [] # WebSocket subscriber callbacks

    def register_callback(self, cb):
        if cb not in self.callbacks:
            self.callbacks.append(cb)

    def unregister_callback(self, cb):
        if cb in self.callbacks:
            self.callbacks.remove(cb)

    def get_interfaces(self) -> List[Dict[str, Any]]:
        interfaces = []
        try:
            addrs = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
            for name, addr_list in addrs.items():
                ipv4 = None
                mac = None
                for addr in addr_list:
                    if addr.family == socket.AF_INET:
                        ipv4 = addr.address
                    elif hasattr(psutil, "AF_LINK") and addr.family == psutil.AF_LINK:
                        mac = addr.address

                is_up = stats[name].isup if name in stats else False
                interfaces.append({
                    "name": name,
                    "ip": ipv4 or "No IPv4",
                    "mac": mac or "Unknown",
                    "is_up": is_up
                })
        except Exception as e:
            interfaces.append({"name": "Default Ethernet / Wi-Fi", "ip": "192.168.1.100", "is_up": True})
        return interfaces

    def process_packet_meta(self, pkt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core NIDS inspection pipeline for each packet.
        """
        src_ip = pkt.get("src_ip", "")

        # 1. Active Firewall Drop Check
        if firewall_manager.is_blocked(src_ip):
            pkt["status"] = "DROPPED"
            pkt["drop_reason"] = "Firewall Active Blocklist"
            self.dropped_packets_count += 1
            memory_store.add_packet(pkt)
            self._notify_subscribers("packet", pkt)
            return pkt

        pkt["status"] = "ACCEPTED"

        # 2. Signature-based Rule Evaluation (Snort/Suricata rules)
        matched_rules = rule_engine.evaluate_packet(pkt)
        for rule in matched_rules:
            alert_payload = {
                "sid": rule.sid,
                "rev": rule.rev,
                "msg": rule.msg,
                "classtype": rule.classtype,
                "severity": rule.severity,
                "priority": rule.priority,
                "action": rule.action,
                "src_ip": pkt.get("src_ip"),
                "src_port": pkt.get("src_port"),
                "dst_ip": pkt.get("dst_ip"),
                "dst_port": pkt.get("dst_port"),
                "protocol": pkt.get("protocol"),
                "payload_preview": pkt.get("payload_preview", ""),
                "length": pkt.get("length", 0)
            }
            # Automated mitigation
            mit_res = mitigation_engine.handle_alert(alert_payload)
            eve = alert_notifier.process_and_record_alert(alert_payload, mit_res)
            self._notify_subscribers("alert", eve)

        # 3. Anomaly & Heuristic Detection (Port Scans, SYN Floods, ICMP Floods)
        anomalies = anomaly_detector.inspect_packet(pkt)
        for anom in anomalies:
            alert_payload = {
                "sid": anom["sid"],
                "rev": 1,
                "msg": anom["msg"],
                "classtype": anom["classtype"],
                "severity": anom["severity"],
                "priority": anom["priority"],
                "action": "alert",
                "src_ip": pkt.get("src_ip"),
                "src_port": pkt.get("src_port"),
                "dst_ip": pkt.get("dst_ip"),
                "dst_port": pkt.get("dst_port"),
                "protocol": pkt.get("protocol"),
                "payload_preview": anom.get("evidence", ""),
                "length": pkt.get("length", 0)
            }
            mit_res = mitigation_engine.handle_alert(alert_payload)
            eve = alert_notifier.process_and_record_alert(alert_payload, mit_res)
            self._notify_subscribers("alert", eve)

        # 4. Record to memory store and flow tracker
        memory_store.add_packet(pkt)
        flow_tracker.record_packet(pkt)
        self._notify_subscribers("packet", pkt)

        return pkt

    def inject_packet(self, pkt: Dict[str, Any]):
        """Injects a packet directly into the inspection pipeline."""
        if "timestamp" not in pkt:
            pkt["timestamp"] = time.time()
        return self.process_packet_meta(pkt)

    def _notify_subscribers(self, event_type: str, data: Any):
        for cb in list(self.callbacks):
            try:
                cb(event_type, data)
            except Exception:
                pass

    def _simulation_worker(self):
        """Generates realistic baseline background network traffic."""
        public_hosts = [
            ("142.250.190.46", 443, "TCP", "Google Services (TLS 1.3 Application Data)"),
            ("1.1.1.1", 53, "UDP", "Cloudflare DNS Query (A api.github.com)"),
            ("151.101.65.140", 80, "TCP", "Reddit CDN GET /static/logo.png HTTP/1.1"),
            ("185.199.108.153", 443, "TCP", "GitHub Pages TLS Handshake"),
            ("8.8.8.8", 0, "ICMP", "Echo Request (Ping healthcheck)"),
            ("192.168.1.1", 80, "TCP", "Gateway Router Keepalive GET /status HTTP/1.1")
        ]

        client_ip = "192.168.1.105"

        while not self._stop_event.is_set():
            # Periodically emit 1-3 normal packets
            burst = random.randint(1, 3)
            for _ in range(burst):
                target_ip, target_port, proto, desc = random.choice(public_hosts)
                src_port = random.randint(49152, 65535) if proto != "ICMP" else None
                length = random.randint(64, 1420)
                flags = "PA" if proto == "TCP" else ""

                pkt = {
                    "timestamp": time.time(),
                    "src_ip": client_ip,
                    "src_port": src_port,
                    "dst_ip": target_ip,
                    "dst_port": target_port if target_port > 0 else None,
                    "protocol": proto,
                    "flags": flags,
                    "length": length,
                    "payload_preview": desc,
                    "summary": f"{proto} {client_ip}:{src_port} -> {target_ip}:{target_port} len={length}"
                }
                self.process_packet_meta(pkt)

            # Sleep between bursts (0.3 - 0.9s)
            time.sleep(random.uniform(0.3, 0.9))

    def start(self, interface: Optional[str] = None, mode: str = "simulation"):
        if self.is_running:
            return

        self.selected_interface = interface
        self.mode = mode
        self.is_running = True
        self._stop_event.clear()

        # Start background worker thread
        self._thread = threading.Thread(target=self._simulation_worker, daemon=True)
        self._thread.start()

    def stop(self):
        if not self.is_running:
            return

        self._stop_event.set()
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        self._thread = None

sniffer = NetworkSniffer()

