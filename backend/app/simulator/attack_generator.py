import time
import random
import threading
from typing import Dict, Any, List

class AttackSimulator:
    def __init__(self, sniffer_instance=None):
        self.sniffer = sniffer_instance
        self.is_simulating = False

    def set_sniffer(self, sniffer_instance):
        self.sniffer = sniffer_instance

    def run_port_scan(self, attacker_ip: str = "45.33.32.156", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates an Nmap-style TCP SYN sweep across sensitive ports."""
        ports = [21, 22, 23, 25, 53, 80, 110, 139, 443, 445, 1433, 3306, 3389, 5432, 8080]
        packets_sent = 0

        for port in ports:
            pkt = {
                "timestamp": time.time(),
                "src_ip": attacker_ip,
                "src_port": random.randint(40000, 60000),
                "dst_ip": target_ip,
                "dst_port": port,
                "protocol": "TCP",
                "flags": "S",
                "length": 60,
                "payload_preview": f"SYN probe -> port {port}",
                "summary": f"TCP {attacker_ip} -> {target_ip}:{port} [SYN]"
            }
            if self.sniffer:
                self.sniffer.inject_packet(pkt)
            packets_sent += 1
            time.sleep(0.05)

        return {
            "attack_type": "Port Scan",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "ports_targeted": len(ports),
            "packets_sent": packets_sent,
            "status": "Completed"
        }

    def run_sqli_attack(self, attacker_ip: str = "185.190.140.22", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates a Web Application SQL Injection attempt."""
        payload = "POST /api/v1/auth/login HTTP/1.1\r\nHost: internal-portal\r\nContent-Type: application/json\r\n\r\n{\"user\": \"admin' UNION SELECT 1,username,password_hash FROM users--\", \"pass\": \"123456\"}"
        pkt = {
            "timestamp": time.time(),
            "src_ip": attacker_ip,
            "src_port": 51234,
            "dst_ip": target_ip,
            "dst_port": 80,
            "protocol": "TCP",
            "flags": "PA",
            "length": len(payload),
            "payload_preview": payload,
            "summary": f"TCP {attacker_ip}:51234 -> {target_ip}:80 SQLi Attack"
        }
        if self.sniffer:
            self.sniffer.inject_packet(pkt)

        return {
            "attack_type": "SQL Injection",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "signature": "UNION SELECT",
            "status": "Completed"
        }

    def run_xss_attack(self, attacker_ip: str = "103.208.220.4", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates Cross-Site Scripting (XSS)."""
        payload = "GET /search?query=<script>alert('PacketArmor_Pwned')</script> HTTP/1.1\r\nHost: corporate-app\r\nUser-Agent: Mozilla/5.0"
        pkt = {
            "timestamp": time.time(),
            "src_ip": attacker_ip,
            "src_port": 49821,
            "dst_ip": target_ip,
            "dst_port": 8080,
            "protocol": "TCP",
            "flags": "PA",
            "length": len(payload),
            "payload_preview": payload,
            "summary": f"TCP {attacker_ip}:49821 -> {target_ip}:8080 XSS Probe"
        }
        if self.sniffer:
            self.sniffer.inject_packet(pkt)

        return {
            "attack_type": "Cross-Site Scripting (XSS)",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "signature": "<script>",
            "status": "Completed"
        }

    def run_path_traversal(self, attacker_ip: str = "91.240.118.89", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates Directory / Path Traversal Attack."""
        payload = "GET /download.php?file=../../../../etc/passwd HTTP/1.1\r\nHost: intranet-server"
        pkt = {
            "timestamp": time.time(),
            "src_ip": attacker_ip,
            "src_port": 55102,
            "dst_ip": target_ip,
            "dst_port": 80,
            "protocol": "TCP",
            "flags": "PA",
            "length": len(payload),
            "payload_preview": payload,
            "summary": f"TCP {attacker_ip}:55102 -> {target_ip}:80 LFI Probe"
        }
        if self.sniffer:
            self.sniffer.inject_packet(pkt)

        return {
            "attack_type": "Path Traversal (LFI)",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "signature": "../etc/passwd",
            "status": "Completed"
        }

    def run_syn_flood(self, attacker_ip: str = "185.220.101.5", target_ip: str = "192.168.1.105", count: int = 40) -> Dict[str, Any]:
        """Simulates a TCP SYN Flood DoS."""
        for i in range(count):
            pkt = {
                "timestamp": time.time(),
                "src_ip": attacker_ip,
                "src_port": random.randint(1024, 65535),
                "dst_ip": target_ip,
                "dst_port": 443,
                "protocol": "TCP",
                "flags": "S",
                "length": 64,
                "payload_preview": "FLOOD SYN Payload",
                "summary": f"TCP {attacker_ip} -> {target_ip}:443 [SYN] seq={i}"
            }
            if self.sniffer:
                self.sniffer.inject_packet(pkt)
            time.sleep(0.02)

        return {
            "attack_type": "TCP SYN Flood",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "packets_sent": count,
            "status": "Completed"
        }

    def run_ping_of_death(self, attacker_ip: str = "194.26.29.112", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates oversized ICMP Ping of Death."""
        for _ in range(5):
            pkt = {
                "timestamp": time.time(),
                "src_ip": attacker_ip,
                "src_port": None,
                "dst_ip": target_ip,
                "dst_port": None,
                "protocol": "ICMP",
                "flags": "",
                "length": 1500, # Oversized jumbo ICMP
                "payload_preview": "A" * 1400,
                "summary": f"ICMP {attacker_ip} -> {target_ip} Echo Request (Oversized 1500B)"
            }
            if self.sniffer:
                self.sniffer.inject_packet(pkt)
            time.sleep(0.05)

        return {
            "attack_type": "Ping of Death",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "packet_size": 1500,
            "status": "Completed"
        }

    def run_scanner_probe(self, attacker_ip: str = "198.51.100.42", target_ip: str = "192.168.1.105") -> Dict[str, Any]:
        """Simulates automated security scanner probe (Nikto/SQLMap)."""
        payload = "GET / HTTP/1.1\r\nHost: target\r\nUser-Agent: Mozilla/5.0 (Nikto/2.1.6) (Nikto Vulnerability Scanner)"
        pkt = {
            "timestamp": time.time(),
            "src_ip": attacker_ip,
            "src_port": 42100,
            "dst_ip": target_ip,
            "dst_port": 80,
            "protocol": "TCP",
            "flags": "PA",
            "length": len(payload),
            "payload_preview": payload,
            "summary": f"TCP {attacker_ip}:42100 -> {target_ip}:80 Scanner Probe"
        }
        if self.sniffer:
            self.sniffer.inject_packet(pkt)

        return {
            "attack_type": "Malicious Scanner",
            "attacker_ip": attacker_ip,
            "target_ip": target_ip,
            "tool": "Nikto Scanner",
            "status": "Completed"
        }

attack_simulator = AttackSimulator()

