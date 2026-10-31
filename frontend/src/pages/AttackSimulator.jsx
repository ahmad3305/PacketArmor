import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Crosshair, ShieldAlert, Zap, Flame, Terminal, Database, Code, FolderSearch, CheckCircle, AlertTriangle, Play 
} from 'lucide-react';
import { api } from '../services/api';

export default function AttackSimulator({ onAttackTriggered }) {
  const [runningAttack, setRunningAttack] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const attacks = [
    {
      id: 'port_scan',
      name: 'Nmap TCP SYN Port Sweep',
      category: 'Reconnaissance',
      target: 'Ports 21, 22, 23, 80, 443, 3389, 8080...',
      icon: FolderSearch,
      color: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      attackerIp: '45.33.32.156',
      description: 'Sweeps 15 sensitive ports with TCP SYN packets to test the horizontal port scan heuristic anomaly detector.',
      expectedSid: '9000001 (ANOMALY Port Scan)',
    },
    {
      id: 'sqli',
      name: 'SQL Injection Authentication Bypass',
      category: 'Web Application Exploit',
      target: 'HTTP Port 80 (POST /api/login)',
      icon: Database,
      color: 'text-red-400',
      badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
      attackerIp: '185.190.140.22',
      description: 'Injects a classic UNION SELECT payload to test Snort deep packet inspection content pattern matching.',
      expectedSid: '1000101 (SQL Injection - UNION SELECT)',
    },
    {
      id: 'xss',
      name: 'Cross-Site Scripting (XSS) Injection',
      category: 'Web Application Exploit',
      target: 'HTTP Port 8080 (GET /search)',
      icon: Code,
      color: 'text-purple-400',
      badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      attackerIp: '103.208.220.4',
      description: 'Injects malicious <script> tags into an HTTP request to verify DOM-based and Reflected XSS rule triggers.',
      expectedSid: '1000201 (XSS - Script Tag Injected)',
    },
    {
      id: 'path_traversal',
      name: 'Path Traversal / Local File Inclusion',
      category: 'Reconnaissance & Leak',
      target: 'HTTP Port 80 (GET /download)',
      icon: Terminal,
      color: 'text-cyber-cyan',
      badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      attackerIp: '91.240.118.89',
      description: 'Climbs directory boundaries using ../../../../etc/passwd to test system file reconnaissance rules.',
      expectedSid: '1000301 (Path Traversal - Unix passwd access)',
    },
    {
      id: 'syn_flood',
      name: 'TCP SYN Flood Volumetric DoS',
      category: 'Denial of Service',
      target: 'HTTPS Port 443',
      icon: Flame,
      color: 'text-red-500',
      badge: 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold',
      attackerIp: '185.220.101.5',
      description: 'Transmits a rapid barrage of 40 half-open SYN packets to trigger the CRITICAL DoS detector & firewall auto-mitigation block.',
      expectedSid: '9000002 (ANOMALY TCP SYN Flood)',
    },
    {
      id: 'ping_of_death',
      name: 'Ping of Death (Jumbo ICMP Flood)',
      category: 'Denial of Service',
      target: 'ICMP Echo Protocol',
      icon: Zap,
      color: 'text-amber-500',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      attackerIp: '194.26.29.112',
      description: 'Injects oversized 1500-byte ICMP payloads to test packet size anomaly rules and ping flood limits.',
      expectedSid: '1000601 (DoS - Ping of Death / Large ICMP)',
    },
    {
      id: 'scanner_probe',
      name: 'Nikto / SQLmap Scanner Probe',
      category: 'Vulnerability Scanning',
      target: 'HTTP Port 80 (User-Agent header)',
      icon: ShieldAlert,
      color: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      attackerIp: '198.51.100.42',
      description: 'Injects automated vulnerability scanner signatures into HTTP headers to test scanner identification.',
      expectedSid: '1000502 (Vulnerability Scanner - Nikto detected)',
    },
  ];

  const handleLaunchAttack = async (attack) => {
    try {
      setRunningAttack(attack.id);
      setLastResult(null);

      // Unblock attacker IP first if it was previously blocked, so the test always demonstrates alert generation
      await api.unblockIP(attack.attackerIp);

      const res = await api.launchAttack(attack.id, attack.attackerIp);
      setLastResult({
        attackId: attack.id,
        attackName: attack.name,
        result: res.result,
        success: true,
      });

      if (onAttackTriggered) {
        onAttackTriggered(attack);
      }
    } catch (e) {
      setLastResult({
        attackId: attack.id,
        attackName: attack.name,
        error: e.message,
        success: false,
      });
    } finally {
      setRunningAttack(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-glow-red/20">
            <Crosshair className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Red Team Attack Simulation Sandbox
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                ACTIVE RIG
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Inject controlled intrusion packets directly into the PacketArmor NIDS inspection pipeline to verify rule matching, anomaly heuristics, and automated firewall response in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Result feedback toast */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center justify-between ${
            lastResult.success
              ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs font-mono">
              <span className="font-bold">{lastResult.attackName}</span> executed successfully. Check the <span className="underline">Threat Alerts</span> tab to inspect the generated incident and auto-mitigation action.
            </div>
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="text-xs font-mono underline hover:text-white"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Attacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attacks.map((attack) => {
          const Icon = attack.icon;
          const isRunning = runningAttack === attack.id;

          return (
            <div
              key={attack.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${attack.badge}`}>
                    {attack.category}
                  </span>
                  <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${attack.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-cyber-cyan transition-colors">
                  {attack.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {attack.description}
                </p>

                <div className="my-3 space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-900 text-[11px] font-mono">
                  <div className="text-slate-400">
                    Attacker IP: <span className="text-red-400 font-bold">{attack.attackerIp}</span>
                  </div>
                  <div className="text-slate-400">
                    Target Vector: <span className="text-slate-200">{attack.target}</span>
                  </div>
                  <div className="text-slate-400">
                    Expected SID: <span className="text-cyber-cyan">{attack.expectedSid}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleLaunchAttack(attack)}
                disabled={isRunning}
                className="w-full mt-2 py-2 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-cyber-cyan transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-cyber-cyan border-t-transparent animate-spin" />
                    <span>Transmitting Attack...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>Launch Attack Vector</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}

