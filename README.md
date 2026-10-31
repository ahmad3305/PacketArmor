# 🛡️ PacketArmor — Next-Gen Network Intrusion Detection & Prevention System (NIDS & IPS)

A high-performance, full-stack Network Intrusion Detection and Active Prevention System built with **FastAPI**, **Snort / Suricata Rule Engine**, **Stateful Anomaly Heuristics**, **Active OS Firewall Mitigation (IPS)**, and a **2026-level Cyber SOC Dashboard** powered by **React, Vite, Tailwind CSS, and Framer Motion**.

Zero external database required — operates on high-speed in-memory ring buffers, atomic JSON storage, and standard Suricata EVE-JSON log streaming.

---

## ✨ Core Features & Requirements Mapping

### 1. **Snort & Suricata Rule Engine**
- Native parser and pattern matcher supporting standard Snort/Suricata syntax:
  ```snort
  alert tcp any any -> any 80 (msg:"SQL Injection - UNION SELECT detected"; content:"UNION SELECT"; nocase; sid:1000101; rev:1; classtype:web-application-attack; priority:1;)
  ```
- Deep packet payload inspection (exact string, case-insensitive, hexadecimal offset matching).
- TCP flag signatures (SYN, FIN, NULL, Xmas `flags:FPU`).
- Real-time rule toggling (ARM / DISABLE) and user-defined custom rule creation directly from the dashboard.

### 2. **Continuous Network Traffic Monitoring**
- Background packet capture daemon with automatic adapter discovery.
- Dual-mode engine:
  - **Live Capture**: Native Scapy/raw-socket adapter capture.
  - **Baseline Telemetry Simulation**: Emulates authentic baseline traffic (DNS queries, TLS 1.3 handshakes, HTTP keepalives, ICMP health checks) with zero lag.
- Bidirectional WebSocket stream (`/ws/stream`) broadcasting packet and threat telemetry to connected clients every second.

### 3. **Anomaly & Heuristic Detection**
- **Horizontal & Vertical Port Scans**: Tracks unique destination port sweeps (>8 ports in 4s window).
- **TCP SYN Floods**: Detects rapid half-open connection denial-of-service attempts (>35 SYNs in 3s window).
- **ICMP Ping Floods**: Detects volumetric ICMP echo floods (>20 pings in 2s window).
- **Ping of Death**: Flags oversized jumbo ICMP frames (>1000 bytes).
- **Volumetric Floods**: Automatically detects packet spam rates exceeding 120 pkts/s.

### 4. **Active Response & Firewall Mitigation (IPS)**
- **Windows Firewall Integration**: Automatically executes `netsh advfirewall firewall add rule` to ban attacker host IPs at the OS level.
- **Layer 1 In-Memory Drop Table**: Dropped packets are filtered before reaching downstream inspection, preserving system bandwidth.
- **Auto-Mitigation Policy**: Configurable severity threshold (`CRITICAL`, `HIGH`) and auto-quarantine durations (1 min, 5 min, 15 min, 1 hour, or permanent ban) with automated expiration cleanup.
- **Manual IP Quarantine**: Instant one-click blocking and unblocking from the dashboard or packet inspector.

### 5. **Cyber SOC Dashboard (Visualizations & Charts)**
- **Threat Assessment Gauge**: Animated DEFCON status dial (DEFCON 1 to DEFCON 5).
- **Telemetry Velocity Area Chart**: Streaming 30-second sliding window of packets/sec and alert frequency.
- **Protocol Distribution Donut Chart**: Breakdown across TCP, UDP, ICMP, HTTP, DNS, and TLS.
- **Top Talkers & Targeted Ports**: Interactive bar chart and host IP tables.
- **Deep Packet Inspector**: Dual Hex dump & decoded ASCII payload viewer.
- **Suricata EVE-JSON Log**: SIEM-compliant logging to `logs/alerts.jsonl` with CSV and JSON export buttons.

### 6. **Red Team Attack Simulation Sandbox**
- One-click attack execution to safely demonstrate and verify the intrusion detection pipeline:
  1. *Nmap TCP SYN Port Sweep*
  2. *SQL Injection (UNION SELECT)*
  3. *Cross-Site Scripting (XSS)*
  4. *Path Traversal / LFI (`../../../../etc/passwd`)*
  5. *TCP SYN Flood Volumetric DoS*
  6. *Ping of Death (Jumbo ICMP)*
  7. *Vulnerability Scanner Probe (Nikto / SQLmap)*

---

## 📁 Project Architecture

```text
PacketArmor/
├── backend/
│   ├── app/
│   │   ├── api/                        # REST & WebSocket API Routers
│   │   │   ├── routes_system.py        # Adapter discovery & start/stop
│   │   │   ├── routes_alerts.py        # Filtered alerts & CSV/JSON export
│   │   │   ├── routes_metrics.py       # Live telemetry & flow statistics
│   │   │   ├── routes_rules.py         # Snort rule browser & editor
│   │   │   ├── routes_response.py      # IP quarantine & firewall policy
│   │   │   └── routes_simulator.py     # Red team attack simulation
│   │   ├── core/
│   │   │   ├── sniffer.py              # Packet capture orchestrator
│   │   │   ├── rule_engine.py          # Snort / Suricata syntax engine
│   │   │   ├── anomaly_detector.py     # Port scan, SYN flood, DoS heuristics
│   │   │   └── flow_tracker.py         # 5-tuple flow aggregator
│   │   ├── rules/
│   │   │   ├── community.rules         # Web attacks, SQLi, XSS, RCE, Scanners
│   │   │   ├── dos.rules               # Flood & ping of death rules
│   │   │   ├── portscan.rules          # SYN, FIN, NULL, Xmas scan rules
│   │   │   └── custom.rules            # Dynamic user rules
│   │   ├── response/
│   │   │   ├── firewall.py             # Windows Firewall netsh controller
│   │   │   ├── mitigation.py           # Auto-quarantine policy manager
│   │   │   └── notifier.py             # Suricata EVE-JSON formatter
│   │   ├── storage/
│   │   │   ├── memory_store.py         # Fast circular ring buffer
│   │   │   └── json_store.py           # Atomic JSON persistence
│   │   ├── config.py                   # Configuration & detection limits
│   │   └── main.py                     # FastAPI entrypoint & static mount
│   ├── tests/
│   │   └── test_nids.py                # Pytest verification suite (10/10 passing)
│   ├── requirements.txt                # Python dependencies
│   └── run.py                          # Production backend server launcher
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Cyber HUD navigation
│   │   │   ├── ThreatGauge.jsx         # Live DEFCON risk dial
│   │   │   └── PacketInspectorModal.jsx# Hex & ASCII deep packet viewer
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # Real-time streaming charts & stats
│   │   │   ├── LiveTraffic.jsx         # Live packet stream with protocol filters
│   │   │   ├── AlertsView.jsx          # Incident registry & SIEM export
│   │   │   ├── RulesManager.jsx        # Snort rule editor & toggle switches
│   │   │   ├── ResponseCenter.jsx      # Firewall & active quarantine table
│   │   │   └── AttackSimulator.jsx     # 1-click attack simulation vectors
│   │   ├── services/
│   │   │   ├── api.js                  # Configurable REST client
│   │   │   └── websocket.js            # Auto-reconnecting WebSocket client
│   │   ├── App.jsx                     # Root application component
│   │   ├── index.css                   # Tailwind & Cyber grid styling
│   │   └── main.jsx
│   ├── .env.development                # Development environment variables
│   ├── .env.production                 # Production environment variables
│   ├── tailwind.config.js              # 2026 OLED Cyber palette
│   └── vite.config.js                  # Vite bundler & reverse proxy
│
└── logs/
    ├── alerts.jsonl                    # Suricata EVE-JSON incident log
    └── blocked_ips.json                # Persisted quarantine registry
```

---

## 🚀 Quickstart & Running Instructions

### 1. **Launch Full-Stack (One Command)**
Because the frontend production bundle is pre-built into `frontend/dist/`, you can launch the entire full-stack application with a single command:

```powershell
python backend/run.py
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser!

---

### 2. **Frontend Development Server (Hot Reload)**
If you wish to run the React development server with Vite hot-reloading:

```powershell
# Terminal 1: Backend
python backend/run.py

# Terminal 2: Frontend
npm run dev --prefix frontend
```
Navigate to **[http://localhost:5173](http://localhost:5173)**. Requests to `/api` and `/ws` automatically proxy to the backend.

---

### 3. **Run Test Verification Suite**

```powershell
python -m pytest backend/tests/test_nids.py -v
```
All 10 unit and integration tests verify:
- ✅ Snort / Suricata syntax parsing
- ✅ Deep packet SQLi pattern matching (`UNION SELECT`)
- ✅ TCP Xmas scan flag detection (`flags:FPU`)
- ✅ Heuristic multi-port scan anomaly detection
- ✅ Active Windows Firewall blocking & unblocking
- ✅ System interfaces and status endpoints
- ✅ Real-time metric calculation
- ✅ Attack simulation trigger and incident logging

---

## ⚙️ Environment Variables

Configure frontend behavior using `.env.development` or `.env.production`:

| Variable | Default (Dev) | Default (Prod) | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | `""` (Same Origin) | Base REST API URL |
| `VITE_WS_URL` | `ws://127.0.0.1:8000/ws/stream` | `/ws/stream` | Real-time WebSocket stream URL |
| `VITE_APP_NAME` | `PacketArmor NIDS` | `PacketArmor NIDS` | Application name badge |

---

## 🛡️ Attack Simulation Testing Guide

1. Open the **Attack Simulator** tab in the top navigation.
2. Click **Launch Attack Vector** on any scenario:
   - **SQL Injection**: Watch the incident ticker immediately flag SID `1000101` and display the `UNION SELECT` payload evidence.
   - **TCP SYN Flood**: Watch the threat level shift to **DEFCON 1 (CRITICAL)** as 40 rapid half-open SYNs trigger automatic IP quarantine.
   - **Port Scan**: Watch the targeted ports bar chart light up across ports 21–8080.
3. Open the **Firewall & IPS** tab to observe the attacker host added to the active quarantine list with rule details.
4. Open the **Threat Alerts** tab to export the generated incident log in **CSV** or **JSON** format!

