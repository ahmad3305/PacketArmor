import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from app.config import RULES_DIR, CUSTOM_RULES_PATH

# Maps Snort priority (1-4) to standardized string severity
PRIORITY_TO_SEVERITY = {
    1: "CRITICAL",
    2: "HIGH",
    3: "MEDIUM",
    4: "LOW"
}

SEVERITY_TO_PRIORITY = {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4
}

class SnortRule:
    def __init__(
        self,
        raw_text: str,
        action: str,
        protocol: str,
        src_ip: str,
        src_port: str,
        direction: str,
        dst_ip: str,
        dst_port: str,
        options: Dict[str, Any],
        source_file: str = "custom.rules",
        enabled: bool = True
    ):
        self.raw_text = raw_text.strip()
        self.action = action.lower()
        self.protocol = protocol.lower()
        self.src_ip = src_ip
        self.src_port = src_port
        self.direction = direction
        self.dst_ip = dst_ip
        self.dst_port = dst_port
        self.options = options
        self.source_file = source_file
        self.enabled = enabled

        # Extract standard options
        self.sid = int(options.get("sid", 0))
        self.rev = int(options.get("rev", 1))
        self.msg = options.get("msg", f"Rule SID:{self.sid} Alert")
        self.classtype = options.get("classtype", "misc-attack")
        
        priority_val = options.get("priority")
        if priority_val is not None:
            try:
                self.priority = int(priority_val)
            except ValueError:
                self.priority = 3
        else:
            self.priority = 3
        self.severity = PRIORITY_TO_SEVERITY.get(self.priority, "MEDIUM")

        # Patterns to match in payload
        # list of tuples: (pattern_str_or_bytes, nocase_bool)
        self.contents = options.get("contents", [])
        self.flags = options.get("flags")
        self.dsize = options.get("dsize")

    def matches(self, packet_meta: Dict[str, Any]) -> bool:
        if not self.enabled:
            return False

        # 1. Protocol check
        proto = packet_meta.get("protocol", "").lower()
        if self.protocol != "any" and self.protocol != "ip":
            if self.protocol == "http":
                # Special HTTP check: must be TCP and port 80/8080/443 or have HTTP payload
                if proto != "tcp" and proto != "http":
                    return False
            elif self.protocol != proto:
                return False

        # 2. Port check
        dst_port = packet_meta.get("dst_port")
        if self.dst_port != "any":
            try:
                target_port = int(self.dst_port)
                if dst_port is None or int(dst_port) != target_port:
                    return False
            except ValueError:
                pass # Range check if needed

        src_port = packet_meta.get("src_port")
        if self.src_port != "any":
            try:
                target_port = int(self.src_port)
                if src_port is None or int(src_port) != target_port:
                    return False
            except ValueError:
                pass

        # 3. IP check
        src_ip = packet_meta.get("src_ip", "")
        if self.src_ip != "any" and self.src_ip != "$HOME_NET" and self.src_ip != "$EXTERNAL_NET":
            if self.src_ip.startswith("!"):
                if src_ip == self.src_ip[1:]:
                    return False
            elif src_ip != self.src_ip:
                return False

        dst_ip = packet_meta.get("dst_ip", "")
        if self.dst_ip != "any" and self.dst_ip != "$HOME_NET" and self.dst_ip != "$EXTERNAL_NET":
            if self.dst_ip.startswith("!"):
                if dst_ip == self.dst_ip[1:]:
                    return False
            elif dst_ip != self.dst_ip:
                return False

        # 4. TCP Flags check
        if self.flags is not None:
            pkt_flags = packet_meta.get("flags", "")
            if self.flags == "0":
                if pkt_flags != "":
                    return False
            else:
                for f in self.flags:
                    if f not in pkt_flags:
                        return False

        # 5. Data size check
        if self.dsize:
            pkt_len = packet_meta.get("length", 0)
            if self.dsize.startswith(">") and pkt_len <= int(self.dsize[1:]):
                return False
            elif self.dsize.startswith("<") and pkt_len >= int(self.dsize[1:]):
                return False

        # 6. Payload Content check (all contents must match)
        if self.contents:
            payload = packet_meta.get("payload_preview", "")
            if not payload:
                return False
                
            for pattern, nocase in self.contents:
                if nocase:
                    if pattern.lower() not in payload.lower():
                        return False
                else:
                    if pattern not in payload:
                        return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sid": self.sid,
            "rev": self.rev,
            "msg": self.msg,
            "action": self.action,
            "protocol": self.protocol,
            "src_ip": self.src_ip,
            "src_port": self.src_port,
            "direction": self.direction,
            "dst_ip": self.dst_ip,
            "dst_port": self.dst_port,
            "classtype": self.classtype,
            "priority": self.priority,
            "severity": self.severity,
            "enabled": self.enabled,
            "source_file": self.source_file,
            "raw_text": self.raw_text
        }


class RuleEngine:
    def __init__(self, rules_dir: Path = RULES_DIR):
        self.rules_dir = rules_dir
        self.rules: List[SnortRule] = []
        self._disabled_sids = set()
        self.reload_rules()

    def parse_rule_line(self, line: str, source_file: str = "custom.rules") -> Optional[SnortRule]:
        line = line.strip()
        if not line or line.startswith("#"):
            return None

        # Regex for header: action proto src_ip src_port direction dst_ip dst_port (options)
        pattern = r'^([a-zA-Z]+)\s+([a-zA-Z]+)\s+(\S+)\s+(\S+)\s+(->|<>)\s+(\S+)\s+(\S+)\s*\((.*)\)$'
        match = re.match(pattern, line)
        if not match:
            return None

        action, proto, src_ip, src_port, direction, dst_ip, dst_port, raw_options = match.groups()

        options: Dict[str, Any] = {"contents": []}

        # Tokenize options: split by semicolons not inside double quotes
        opt_tokens = re.findall(r'(?:[^;"]|"(?:\\.|[^"])*")+', raw_options)
        
        last_content = None
        for token in opt_tokens:
            token = token.strip()
            if not token:
                continue

            if ":" in token:
                key, val = token.split(":", 1)
                key = key.strip()
                val = val.strip().strip('"')
                
                if key == "content":
                    options["contents"].append([val, False])
                    last_content = options["contents"][-1]
                else:
                    options[key] = val
            else:
                # Standalone option like nocase
                key = token.strip()
                if key == "nocase" and last_content is not None:
                    last_content[1] = True
                else:
                    options[key] = True

        sid = int(options.get("sid", 0))
        enabled = sid not in self._disabled_sids

        return SnortRule(
            raw_text=line,
            action=action,
            protocol=proto,
            src_ip=src_ip,
            src_port=src_port,
            direction=direction,
            dst_ip=dst_ip,
            dst_port=dst_port,
            options=options,
            source_file=source_file,
            enabled=enabled
        )

    def reload_rules(self):
        new_rules: List[SnortRule] = []
        rule_files = list(self.rules_dir.glob("*.rules"))

        for rf in rule_files:
            try:
                with open(rf, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        rule = self.parse_rule_line(line, source_file=rf.name)
                        if rule and rule.sid > 0:
                            new_rules.append(rule)
            except Exception as e:
                print(f"Error reading rule file {rf}: {e}")

        self.rules = new_rules

    def get_rules(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.rules]

    def toggle_rule(self, sid: int, enabled: bool) -> bool:
        for r in self.rules:
            if r.sid == sid:
                r.enabled = enabled
                if enabled:
                    self._disabled_sids.discard(sid)
                else:
                    self._disabled_sids.add(sid)
                return True
        return False

    def add_custom_rule(self, rule_str: str) -> Optional[Dict[str, Any]]:
        rule = self.parse_rule_line(rule_str, source_file="custom.rules")
        if not rule:
            return None

        # Check for SID collision
        for existing in self.rules:
            if existing.sid == rule.sid:
                return None

        self.rules.append(rule)

        # Append to custom.rules file
        with open(CUSTOM_RULES_PATH, "a", encoding="utf-8") as f:
            f.write(f"\n{rule.raw_text}\n")

        return rule.to_dict()

    def evaluate_packet(self, packet_meta: Dict[str, Any]) -> List[SnortRule]:
        matched = []
        for rule in self.rules:
            if rule.matches(packet_meta):
                matched.append(rule)
        return matched

rule_engine = RuleEngine()
