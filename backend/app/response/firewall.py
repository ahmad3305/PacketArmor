import sys
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("PacketArmor.Firewall")

class FirewallManager:
    def __init__(self):
        self.is_windows = sys.platform.startswith("win")
        self.active_blocks = set()

    def block_ip(self, ip: str) -> Dict[str, Any]:
        """
        Executes OS firewall block rule if on Windows, and registers in-memory drop list.
        """
        self.active_blocks.add(ip)
        system_applied = False
        message = f"IP {ip} added to PacketArmor internal drop filter."

        if self.is_windows:
            rule_name = f"PacketArmor_Block_{ip}"
            cmd = [
                "netsh", "advfirewall", "firewall", "add", "rule",
                f"name={rule_name}",
                "dir=in",
                "action=block",
                f"remoteip={ip}"
            ]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    system_applied = True
                    message = f"Windows Firewall rule '{rule_name}' created successfully. Traffic blocked."
                else:
                    message += f" (Note: Windows Firewall netsh requires Admin privileges: {result.stderr.strip() or result.stdout.strip()})"
            except Exception as e:
                message += f" (Firewall netsh execution failed: {str(e)})"
        
        return {
            "ip": ip,
            "system_applied": system_applied,
            "message": message
        }

    def unblock_ip(self, ip: str) -> Dict[str, Any]:
        """
        Removes firewall rule and clears in-memory block.
        """
        self.active_blocks.discard(ip)
        system_removed = False
        message = f"IP {ip} removed from PacketArmor drop filter."

        if self.is_windows:
            rule_name = f"PacketArmor_Block_{ip}"
            cmd = [
                "netsh", "advfirewall", "firewall", "delete", "rule",
                f"name={rule_name}"
            ]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    system_removed = True
                    message = f"Windows Firewall rule '{rule_name}' removed."
            except Exception as e:
                message += f" (Firewall delete error: {str(e)})"

        return {
            "ip": ip,
            "system_removed": system_removed,
            "message": message
        }

    def is_blocked(self, ip: str) -> bool:
        return ip in self.active_blocks

firewall_manager = FirewallManager()

