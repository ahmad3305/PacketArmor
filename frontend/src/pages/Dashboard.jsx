import React from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  ShieldAlert, ShieldCheck, Activity, Radio, AlertOctagon, 
  ArrowUpRight, Server, Terminal, Zap 
} from 'lucide-react';
import ThreatGauge from '../components/ThreatGauge';
import { formatBytes, formatTime, getSeverityColor } from '../utils/helpers';

export default function Dashboard({ 
  metrics, 
  alerts, 
  systemStatus, 
  onSelectPacket, 
  onBlockIp,
  setCurrentTab 
}) {
  const trafficHistory = metrics?.traffic_history || [];
  const protocolCounts = metrics?.protocol_counts || {};
  const topSources = metrics?.top_sources || {};
  const topPorts = metrics?.top_targeted_ports || {};

  // Protocol pie chart data
  const protocolData = Object.entries(protocolCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const PROTOCOL_COLORS = {
    TCP: '#00F0FF',
    UDP: '#3B82F6',
    ICMP: '#A855F7',
    HTTP: '#00FF66',
    DNS: '#F59E0B',
    TLS: '#EC4899',
    OTHER: '#64748B',
  };

  // Top ports bar chart data
  const portData = Object.entries(topPorts).map(([port, count]) => ({
    port: `Port ${port}`,
    count,
  }));

  // Quick stat cards
  const stats = [
    {
      title: 'NETWORK PACKETS MONITORED',
      value: (metrics?.packets_total || 0).toLocaleString(),
      subValue: `${metrics?.packets_per_sec || 0} pkts/s`,
      icon: Activity,
      color: 'text-cyber-cyan',
      glow: 'shadow-glow-cyan/20',
      border: 'border-cyber-cyan/30',
    },
    {
      title: 'TOTAL INTRUSION ALERTS',
      value: (metrics?.alerts_total || 0).toLocaleString(),
      subValue: `${metrics?.severity_counts?.CRITICAL || 0} Critical • ${metrics?.severity_counts?.HIGH || 0} High`,
      icon: ShieldAlert,
      color: 'text-cyber-red',
      glow: 'shadow-glow-red/20',
      border: 'border-cyber-red/30',
    },
    {
      title: 'FIREWALL IPS MITIGATIONS',
      value: (systemStatus?.dropped_packets || 0).toLocaleString(),
      subValue: 'Active Auto-Drop Enabled',
      icon: ShieldCheck,
      color: 'text-cyber-green',
      glow: 'shadow-glow-green/20',
      border: 'border-cyber-green/30',
    },
    {
      title: 'TOTAL BANDWIDTH PROCESSED',
      value: formatBytes(metrics?.bytes_total || 0),
      subValue: `${formatBytes(metrics?.bytes_per_sec || 0)}/s`,
      icon: Radio,
      color: 'text-cyber-blue',
      glow: 'shadow-blue-500/20',
      border: 'border-blue-500/30',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top SOC Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl bg-slate-900 border ${stat.border}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-white font-mono mt-3 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse"></span>
                <span>{stat.subValue}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Visual Row: Real-time Streaming Velocity & Threat Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Streaming Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">LIVE TELEMETRY STREAM</span>
              <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                <span>Packet Velocity & Threat Frequency</span>
                <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping"></span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyber-cyan">
                <span className="w-2 h-2 rounded-full bg-cyber-cyan"></span> Packets
              </span>
              <span className="flex items-center gap-1.5 text-cyber-red">
                <span className="w-2 h-2 rounded-full bg-cyber-red"></span> Intrusion Alerts
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="packetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3366" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#FF3366" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime} 
                  stroke="#475569" 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(11, 16, 30, 0.95)', 
                    borderColor: 'rgba(0, 240, 255, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  labelFormatter={(ts) => `Time: ${formatTime(ts)}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="packets" 
                  stroke="#00F0FF" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#packetGradient)" 
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="alerts" 
                  stroke="#FF3366" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#alertGradient)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Gauge */}
        <ThreatGauge metrics={metrics} />
      </div>

      {/* Middle Row: Protocol Breakdown, Top Targeted Ports & Top Attacker IPs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Protocol Distribution Donut */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">PROTOCOL ANALYSIS</span>
            <h4 className="text-sm font-bold text-white mt-0.5">Network Protocol Distribution</h4>
          </div>

          <div className="h-44 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolData.length ? protocolData : [{ name: 'TCP', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {protocolData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PROTOCOL_COLORS[entry.name] || '#64748B'} 
                      stroke="rgba(0,0,0,0.5)"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(11, 16, 30, 0.95)', 
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-mono text-slate-400">Total</span>
              <span className="text-base font-bold font-mono text-white">
                {Object.values(protocolCounts).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
            {protocolData.slice(0, 5).map((proto) => (
              <span key={proto.name} className="flex items-center gap-1 text-slate-300">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: PROTOCOL_COLORS[proto.name] || '#64748B' }} 
                />
                {proto.name} ({proto.value})
              </span>
            ))}
          </div>
        </div>

        {/* Top Targeted Ports */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">PORT RECONNAISSANCE</span>
            <h4 className="text-sm font-bold text-white mt-0.5">Top Targeted Destination Ports</h4>
          </div>

          <div className="h-44 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portData.length ? portData : [{ port: '80', count: 0 }]} layout="vertical" margin={{ left: -10, right: 10 }}>
                <XAxis type="number" stroke="#475569" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="port" type="category" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(11, 16, 30, 0.95)', 
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" fill="#00F0FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] font-mono text-slate-400 text-center pt-2 border-t border-slate-800/80">
            HTTP (80), HTTPS (443), SSH (22), SMB (445)
          </div>
        </div>

        {/* Top Attacker IPs */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">THREAT SOURCES</span>
            <h4 className="text-sm font-bold text-white mt-0.5">Top Host Traffic Sources</h4>
          </div>

          <div className="space-y-2.5 my-3">
            {Object.entries(topSources).length > 0 ? (
              Object.entries(topSources).map(([ip, count], i) => (
                <div key={ip} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">#{i + 1}</span>
                    <span className="text-white font-semibold">{ip}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyber-cyan">{count} pkts</span>
                    <button
                      onClick={() => onBlockIp && onBlockIp(ip, 'Blocked from Top Talkers list')}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20"
                    >
                      Block
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 text-xs py-6 font-mono">
                No external source traffic detected.
              </div>
            )}
          </div>

          <button 
            onClick={() => setCurrentTab('response')}
            className="w-full py-1.5 text-xs font-mono text-slate-300 hover:text-cyber-cyan bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
          >
            Manage Active Blocklist →
          </button>
        </div>

      </div>

      {/* Live Threat Incident Ticker */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-red animate-ping"></span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Recent Threat Alerts Ticker
            </h3>
          </div>
          <button
            onClick={() => setCurrentTab('alerts')}
            className="text-xs font-mono text-cyber-cyan hover:underline flex items-center gap-1"
          >
            <span>View All Alerts Log ({alerts.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert, idx) => {
            const sev = alert.alert?.severity || alert.severity || 'MEDIUM';
            const color = getSeverityColor(sev);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${color.badge}`}>
                    {sev}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {alert.alert?.signature || alert.msg || 'Intrusion Detected'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      SID: <span className="text-cyber-cyan">{alert.alert?.signature_id || alert.sid || '1000'}</span> • {alert.src_ip} → {alert.dest_ip}:{alert.dest_port} ({alert.proto})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">
                    {formatTime(alert.epoch || alert.timestamp)}
                  </span>
                  {alert.src_ip && (
                    <button
                      onClick={() => onBlockIp && onBlockIp(alert.src_ip, alert.alert?.signature)}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                    >
                      Mitigate (Block)
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {alerts.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No intrusions detected yet. Use the Attack Simulator to trigger test attacks.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

