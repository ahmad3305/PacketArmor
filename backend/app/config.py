import os
from pathlib import Path

# Base paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent

RULES_DIR = APP_DIR / "rules"
STORAGE_DIR = APP_DIR / "storage"
LOGS_DIR = PROJECT_DIR / "logs"

# Ensure directories exist
LOGS_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
RULES_DIR.mkdir(parents=True, exist_ok=True)

# File destinations
ALERTS_LOG_PATH = LOGS_DIR / "alerts.jsonl"
BLOCKED_IPS_PATH = LOGS_DIR / "blocked_ips.json"
CUSTOM_RULES_PATH = RULES_DIR / "custom.rules"

# Memory Ring Buffer Limits
MAX_BUFFER_PACKETS = 1000
MAX_BUFFER_ALERTS = 2000

# Anomaly & Flood Thresholds
PORT_SCAN_PORT_COUNT = 8          # distinct ports from single IP
PORT_SCAN_WINDOW_SEC = 4.0        # time window for port scan
SYN_FLOOD_COUNT = 35              # SYN packets without response
SYN_FLOOD_WINDOW_SEC = 3.0
ICMP_FLOOD_COUNT = 20             # ICMP packets
ICMP_FLOOD_WINDOW_SEC = 2.0
VOLUMETRIC_DOS_RATE = 120         # packets / sec from single IP

# Response & Mitigation Config
DEFAULT_AUTO_MITIGATION = True
DEFAULT_MIN_BLOCK_SEVERITY = "HIGH"  # LOW, MEDIUM, HIGH, CRITICAL
DEFAULT_BLOCK_DURATION_SEC = 300     # 5 minutes, 0 = permanent
ENABLE_SYSTEM_FIREWALL = True        # invokes Windows netsh firewall rule

# Server config
HOST = "127.0.0.1"
PORT = 8000
WS_HEARTBEAT_SEC = 1.0

