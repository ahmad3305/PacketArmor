import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Activity, 
  Radio, 
  Bell, 
  FileCode, 
  ShieldCheck, 
  Crosshair, 
  Power 
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  systemStatus, 
  onToggleEngine, 
  wsConnected,
  metrics 
}) {
  const isRunning = systemStatus?.status === 'RUNNING';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'traffic', label: 'Live Traffic', icon: Radio },
    { id: 'alerts', label: 'Threat Alerts', icon: Bell, badge: metrics?.alerts_total },
    { id: 'rules', label: 'Snort Rules', icon: FileCode },
    { id: 'response', label: 'Firewall & IPS', icon: ShieldCheck, badge: systemStatus?.dropped_packets },
    { id: 'simulator', label: 'Simulator', icon: Crosshair },
  ];

  // Guaranteed fixed format: always 1 decimal place (e.g. "2.0 pkt/s", "2.4 pkt/s", "10.0 pkt/s")
  const ppsValue = Number(metrics?.packets_per_sec || 0).toFixed(1);
  const ppsDisplay = `${ppsValue} pkt/s`;

  return (
    // Top wrapper with dedicated top padding (pt-3) to prevent congestion at screen edge
    <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-4 sm:px-5 h-14 min-h-[56px] max-h-[56px] flex items-center justify-between border border-cyber-border/80 shadow-2xl backdrop-blur-xl">
        
        {/* Left: Logo & Status telemetry (rigid layout, never shifts) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-blue/10 border border-cyber-cyan/40 shadow-glow-cyan shrink-0">
            <ShieldAlert className="w-4 h-4 text-cyber-cyan" />
            {isRunning && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-green"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center">
              <span className="font-bold text-base tracking-wider text-white whitespace-nowrap">
                PACKET<span className="text-cyber-cyan">ARMOR</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 whitespace-nowrap">
              <span className="flex items-center gap-1 font-mono shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-cyber-green animate-pulse' : 'bg-slate-500'}`}></span>
                <span>{wsConnected ? 'WS LIVE' : 'OFFLINE'}</span>
              </span>
              <span className="text-slate-600 font-mono">•</span>
              {/* Fixed 70px container with tabular numbers guarantees zero navbar jitter */}
              <span className="font-mono text-slate-300 tabular-nums inline-block w-[70px] text-left shrink-0">
                {ppsDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'text-cyber-cyan font-semibold shadow-glow-cyan/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyber-cyan' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge > 999 ? '999+' : item.badge}
                  </span>
                )}

                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute inset-0 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Engine Power Switch */}
        <div className="flex items-center justify-end shrink-0">
          <button
            onClick={onToggleEngine}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border transition-all duration-300 shadow-sm whitespace-nowrap shrink-0 ${
              isRunning
                ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/40 hover:bg-cyber-green/20 shadow-glow-green/20'
                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isRunning ? 'text-cyber-green' : 'text-red-400'}`} />
            <span>{isRunning ? 'NIDS ARMED' : 'DISARMED'}</span>
          </button>
        </div>

      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-3 mt-1 gap-1 border-t border-slate-800/60 bg-cyber-surface/90 rounded-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 whitespace-nowrap rounded text-xs ${
                isActive ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
