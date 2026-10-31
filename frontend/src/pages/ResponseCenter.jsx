import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ShieldBan, Ban, CheckCircle, Clock, Trash2, Plus, AlertOctagon, Settings, ShieldAlert, X 
} from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime, getSeverityColor } from '../utils/helpers';

export default function ResponseCenter() {
  const [blockedList, setBlockedList] = useState([]);
  const [config, setConfig] = useState({
    auto_mitigation_enabled: true,
    min_block_severity: 'HIGH',
    block_duration_sec: 300,
  });
  const [loading, setLoading] = useState(true);
  const [showManualBlockModal, setShowManualBlockModal] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('Manual Security Quarantine');
  const [manualDuration, setManualDuration] = useState(300);
  const [manualSeverity, setManualSeverity] = useState('HIGH');
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [blockedRes, configRes] = await Promise.all([
        api.getBlockedIPs(),
        api.getMitigationConfig(),
      ]);
      setBlockedList(blockedRes.blocked_ips || []);
      if (configRes) {
        setConfig(configRes);
      }
    } catch (e) {
      console.error('Failed to load response data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (ip) => {
    try {
      await api.unblockIP(ip);
      fetchData();
    } catch (e) {
      alert(`Failed to unblock IP: ${e.message}`);
    }
  };

  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    try {
      await api.blockIP(
        manualIp.trim(),
        manualReason,
        manualSeverity,
        parseInt(manualDuration)
      );
      setShowManualBlockModal(false);
      setManualIp('');
      fetchData();
    } catch (e) {
      alert(`Error blocking IP: ${e.message}`);
    }
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      setSavingConfig(true);
      const res = await api.updateMitigationConfig(newConfig);
      if (res && res.config) {
        setConfig(res.config);
      }
    } catch (e) {
      alert('Error updating response policy');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: IPS Active Defense State */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-cyber-cyan/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyber-green/10 border border-cyber-green/30 text-cyber-green shadow-glow-green/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Active Intrusion Prevention (IPS) & Firewall Driver
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Automatic intrusion mitigation drops malicious packets in real time and provisions host firewall rules (<span className="text-cyber-cyan font-mono">netsh advfirewall</span>) to isolate hostile sources.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowManualBlockModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-all shadow-glow-red/10 shrink-0"
        >
          <Ban className="w-4 h-4" />
          <span>Manual IP Ban</span>
        </button>
      </div>

      {/* Configuration & Policy Control Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Automated Mitigation Policy
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Toggle Auto-Mitigation */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Auto-Mitigation Engine</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Auto-block on attack detection</div>
            </div>
            <button
              onClick={() =>
                handleSaveConfig({
                  ...config,
                  auto_mitigation_enabled: !config.auto_mitigation_enabled,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                config.auto_mitigation_enabled ? 'bg-cyber-cyan' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.auto_mitigation_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Severity Threshold */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <label className="block text-xs font-bold text-white mb-1.5">
              Minimum Block Severity
            </label>
            <select
              value={config.min_block_severity}
              onChange={(e) =>
                handleSaveConfig({
                  ...config,
                  min_block_severity: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyber-cyan"
            >
              <option value="CRITICAL">CRITICAL Only</option>
              <option value="HIGH">HIGH & CRITICAL (Recommended)</option>
              <option value="MEDIUM">MEDIUM, HIGH & CRITICAL</option>
            </select>
          </div>

          {/* Ban Duration */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <label className="block text-xs font-bold text-white mb-1.5">
              Quarantine Duration (Sec)
            </label>
            <select
              value={config.block_duration_sec}
              onChange={(e) =>
                handleSaveConfig({
                  ...config,
                  block_duration_sec: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyber-cyan"
            >
              <option value={60}>1 Minute (Test Mode)</option>
              <option value={300}>5 Minutes (Default)</option>
              <option value={900}>15 Minutes</option>
              <option value={3600}>1 Hour</option>
              <option value={0}>Permanent Ban</option>
            </select>
          </div>

        </div>
      </div>

      {/* Blocked IP Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldBan className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Quarantined / Blocked Host Registry ({blockedList.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Persistent Store: logs/blocked_ips.json
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">QUARANTINED IP</th>
                <th className="py-3 px-4">REASON / SIGNATURE</th>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">BLOCKED AT</th>
                <th className="py-3 px-4">EXPIRES AT</th>
                <th className="py-3 px-4">FIREWALL NETSH</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 text-xs font-mono">
              {blockedList.map((item) => {
                const isActive = item.active;
                const color = getSeverityColor(item.severity);

                return (
                  <tr key={item.ip} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          BLOCKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                          EXPIRED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {item.ip}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {item.reason}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color.badge}`}>
                        {item.severity || 'HIGH'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatDateTime(item.blocked_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {item.expires_at > 0 ? formatDateTime(item.expires_at) : 'Permanent'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        item.system_firewall
                          ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.system_firewall ? 'Rule Created' : 'Internal Drop'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isActive && (
                        <button
                          onClick={() => handleUnblock(item.ip)}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan border border-slate-700 transition-colors"
                        >
                          Unblock IP
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {blockedList.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs font-mono">
                    No hosts are currently blocked.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Block IP Modal */}
      <AnimatePresence>
        {showManualBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md glass-panel-glow rounded-2xl overflow-hidden border border-cyber-cyan/30 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold text-white">Manually Quarantine IP</h3>
                </div>
                <button
                  onClick={() => setShowManualBlockModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualBlock} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Host IP Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 198.51.100.42"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyber-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Quarantine Reason
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Suspicious host activity"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyber-cyan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                      Severity
                    </label>
                    <select
                      value={manualSeverity}
                      onChange={(e) => setManualSeverity(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyber-cyan"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                      Duration
                    </label>
                    <select
                      value={manualDuration}
                      onChange={(e) => setManualDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyber-cyan"
                    >
                      <option value={60}>1 Minute</option>
                      <option value={300}>5 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={0}>Permanent</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualBlockModal(false)}
                    className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-glow-red/20"
                  >
                    Confirm Quarantine
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

