import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, AlertTriangle, Flame } from 'lucide-react';

export default function ThreatGauge({ metrics }) {
  const critical = metrics?.severity_counts?.CRITICAL || 0;
  const high = metrics?.severity_counts?.HIGH || 0;
  const medium = metrics?.severity_counts?.MEDIUM || 0;
  const low = metrics?.severity_counts?.LOW || 0;
  const alertsTotal = metrics?.alerts_total || 0;

  // Compute Threat Score (0 - 100)
  let threatScore = 0;
  let statusText = 'DEFENDED';
  let statusColor = 'text-cyber-green';
  let strokeColor = '#00FF66';
  let glowColor = 'rgba(0, 255, 102, 0.3)';
  let StatusIcon = ShieldCheck;

  if (critical > 0) {
    threatScore = Math.min(80 + critical * 4, 100);
    statusText = 'DEFCON 1 // CRITICAL';
    statusColor = 'text-cyber-red';
    strokeColor = '#FF3366';
    glowColor = 'rgba(255, 51, 102, 0.4)';
    StatusIcon = Flame;
  } else if (high > 0) {
    threatScore = Math.min(50 + high * 5, 79);
    statusText = 'DEFCON 2 // ELEVATED';
    statusColor = 'text-amber-400';
    strokeColor = '#F59E0B';
    glowColor = 'rgba(245, 158, 11, 0.3)';
    StatusIcon = AlertTriangle;
  } else if (medium > 0) {
    threatScore = Math.min(25 + medium * 3, 49);
    statusText = 'DEFCON 3 // GUARDED';
    statusColor = 'text-cyber-cyan';
    strokeColor = '#00F0FF';
    glowColor = 'rgba(0, 240, 255, 0.3)';
    StatusIcon = ShieldAlert;
  } else {
    threatScore = 4;
    statusText = 'DEFCON 5 // SECURE';
  }

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Arc 75%
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * threatScore) / 100;

  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Background glow circle */}
      <div 
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{ backgroundColor: glowColor }}
      />

      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">THREAT ASSESSMENT</span>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <span className={statusColor}>{statusText}</span>
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-slate-400">Total Alerts</span>
          <div className="text-lg font-bold text-white font-mono">{alertsTotal}</div>
        </div>
      </div>

      {/* Circular Gauge */}
      <div className="relative flex items-center justify-center my-3">
        <svg className="w-40 h-40 transform -rotate-[135deg]" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            strokeDasharray={arcLength}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          {/* Filled Arc */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={arcLength}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${strokeColor})`,
            }}
          />
        </svg>

        {/* Center Threat Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            key={threatScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-extrabold text-white font-mono tracking-tight"
          >
            {threatScore}%
          </motion.span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            RISK LEVEL
          </span>
        </div>
      </div>

      {/* Severity pill counters */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
        <div className="text-center p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-[10px] text-red-400 font-mono">CRIT</div>
          <div className="text-xs font-bold text-red-300 font-mono">{critical}</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] text-amber-400 font-mono">HIGH</div>
          <div className="text-xs font-bold text-amber-300 font-mono">{high}</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="text-[10px] text-blue-400 font-mono">MED</div>
          <div className="text-xs font-bold text-blue-300 font-mono">{medium}</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
          <div className="text-[10px] text-slate-400 font-mono">LOW</div>
          <div className="text-xs font-bold text-slate-300 font-mono">{low}</div>
        </div>
      </div>
    </div>
  );
}

