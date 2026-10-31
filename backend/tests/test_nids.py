import pytest
import sys
import os

# Ensure backend root is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.rule_engine import rule_engine
from app.core.anomaly_detector import anomaly_detector
from app.core.sniffer import sniffer
from app.simulator.attack_generator import attack_simulator
from app.storage.memory_store import memory_store
from app.storage.json_store import json_store
from app.response.mitigation import mitigation_engine
from app.response.firewall import firewall_manager

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    # Root can return either the mounted frontend HTML or the API JSON payload
    assert "PacketArmor" in response.text

def test_rule_engine_loaded_rules():
    assert len(rule_engine.rules) > 0
    # Check that community SQLi rule is present
    sqli_rule = next((r for r in rule_engine.rules if r.sid == 1000101), None)
    assert sqli_rule is not None
    assert "UNION SELECT" in sqli_rule.raw_text

def test_rule_matching_sqli():
    pkt = {
        "src_ip": "1.2.3.4",
        "src_port": 12345,
        "dst_ip": "192.168.1.10",
        "dst_port": 80,
        "protocol": "tcp",
        "flags": "PA",
        "payload_preview": "GET /products?id=1 UNION SELECT 1,username,password FROM users HTTP/1.1",
        "length": 150
    }
    matches = rule_engine.evaluate_packet(pkt)
    assert len(matches) > 0
    assert any(m.sid == 1000101 for m in matches)

def test_rule_matching_xmas_scan():
    pkt = {
        "src_ip": "45.33.32.156",
        "src_port": 54321,
        "dst_ip": "192.168.1.10",
        "dst_port": 80,
        "protocol": "tcp",
        "flags": "FPU",
        "payload_preview": "",
        "length": 60
    }
    matches = rule_engine.evaluate_packet(pkt)
    assert any(m.sid == 1000701 for m in matches)

def test_anomaly_port_scan():
    attacker = "10.0.0.99"
    # Send packets to 10 distinct ports
    anomalies = []
    for port in range(100, 115):
        pkt = {
            "src_ip": attacker,
            "dst_ip": "192.168.1.5",
            "dst_port": port,
            "protocol": "TCP",
            "flags": "S"
        }
        res = anomaly_detector.inspect_packet(pkt)
        if res:
            anomalies.extend(res)

    assert len(anomalies) > 0
    assert any(a["sid"] == 9000001 for a in anomalies)

def test_system_firewall_and_mitigation():
    test_ip = "198.51.100.99"
    # Test manual block
    rec = mitigation_engine.block_ip(test_ip, reason="Automated Test Ban", severity="HIGH", duration_sec=60)
    assert rec["ip"] == test_ip
    assert json_store.is_blocked(test_ip) is True
    assert firewall_manager.is_blocked(test_ip) is True

    # Test unblock
    unb = mitigation_engine.unblock_ip(test_ip)
    assert unb["success"] is True
    assert json_store.is_blocked(test_ip) is False

def test_api_system_routes():
    res = client.get("/api/system/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "packets_processed" in data

    res = client.get("/api/system/interfaces")
    assert res.status_code == 200
    assert "interfaces" in res.json()

def test_api_metrics_route():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "packets_total" in metrics
    assert "severity_counts" in metrics

def test_api_rules_route():
    res = client.get("/api/rules")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0

def test_api_simulator_scenarios():
    # Ensure test attacker IPs are unblocked before simulation test
    mitigation_engine.unblock_ip("185.190.140.22")
    mitigation_engine.unblock_ip("45.33.32.156")
    
    # Test SQLi attack injection
    res = client.post("/api/simulator/launch", json={"attack_type": "sqli"})
    assert res.status_code == 200
    assert res.json()["result"]["attack_type"] == "SQL Injection"

    # Test Port Scan injection
    res = client.post("/api/simulator/launch", json={"attack_type": "port_scan"})
    assert res.status_code == 200
    assert res.json()["result"]["attack_type"] == "Port Scan"

    # Check that alerts were recorded
    res = client.get("/api/alerts")
    assert res.status_code == 200
    assert res.json()["count"] > 0
