from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.simulator.attack_generator import attack_simulator
from app.core.sniffer import sniffer

router = APIRouter(prefix="/api/simulator", tags=["Simulator"])

# Ensure attack simulator is linked to sniffer
attack_simulator.set_sniffer(sniffer)

class LaunchAttackRequest(BaseModel):
    attack_type: str  # "port_scan", "sqli", "xss", "path_traversal", "syn_flood", "ping_of_death", "scanner_probe"
    attacker_ip: Optional[str] = None
    target_ip: Optional[str] = None

@router.post("/launch")
def launch_attack(req: LaunchAttackRequest):
    attack = req.attack_type.lower()
    
    if attack == "port_scan":
        ip = req.attacker_ip or "45.33.32.156"
        res = attack_simulator.run_port_scan(attacker_ip=ip)
    elif attack == "sqli":
        ip = req.attacker_ip or "185.190.140.22"
        res = attack_simulator.run_sqli_attack(attacker_ip=ip)
    elif attack == "xss":
        ip = req.attacker_ip or "103.208.220.4"
        res = attack_simulator.run_xss_attack(attacker_ip=ip)
    elif attack == "path_traversal":
        ip = req.attacker_ip or "91.240.118.89"
        res = attack_simulator.run_path_traversal(attacker_ip=ip)
    elif attack == "syn_flood":
        ip = req.attacker_ip or "185.220.101.5"
        res = attack_simulator.run_syn_flood(attacker_ip=ip)
    elif attack == "ping_of_death":
        ip = req.attacker_ip or "194.26.29.112"
        res = attack_simulator.run_ping_of_death(attacker_ip=ip)
    elif attack == "scanner_probe":
        ip = req.attacker_ip or "198.51.100.42"
        res = attack_simulator.run_scanner_probe(attacker_ip=ip)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown attack type: '{req.attack_type}'. Available: port_scan, sqli, xss, path_traversal, syn_flood, ping_of_death, scanner_probe"
        )

    return {
        "status": "success",
        "result": res
    }

