import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, Download, Trash2, Search, Filter, Ban, ExternalLink, ChevronDown, ChevronUp 
} from 'lucide-react';
import { formatTime, formatDateTime, getSeverityColor } from '../utils/helpers';
import { api } from '../services/api';

export default function AlertsView({ alerts, onBlockIp, onClearAlerts }) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlertIndex, setExpandedAlertIndex] = useState(null);

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const filteredAlerts = alerts.filter((a) => {
    const sev = (a.alert?.severity || a.severity || '').toUpperCase();
    if (severityFilter !== 'ALL' && sev !== severityFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sig = (a.alert?.signature || a.msg || '').toLowerCase();
      const src = (a.src_ip || '').toLowerCase();
      const cat = (a.alert?.category || a.category || '').toLowerCase();
      const sid = String(a.alert?.signature_id || a.sid || '');
      if (!sig.includes(q) && !src.includes(q) && !cat.includes(q) && !sid.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleExport = (format) => {
    window.open(api.exportAlertsUrl(format), '_blank');
  };

  return (
    <div className="space-y-4">
      
      {/* Top Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alerts by signature, SID, attacker IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan transition-colors"
          />
        </div>

        {/* Severity filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {severities.map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                severityFilter === sev
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold shadow-glow-cyan/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={onClearAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

      </div>

      {/* Alerts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">SIGNATURE & CLASSTYPE</th>
                <th className="py-3 px-4">SID</th>
                <th className="py-3 px-4">ATTACKER IP</th>
                <th className="py-3 px-4">TARGET</th>
                <th className="py-3 px-4">MITIGATION</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 text-xs font-mono">
              {filteredAlerts.map((a, idx) => {
                const sev = a.alert?.severity || a.severity || 'MEDIUM';
                const color = getSeverityColor(sev);
                const isExpanded = expandedAlertIndex === idx;
                const mit = a.mitigation?.status || 'Active Drop / Notified';

                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => setExpandedAlertIndex(isExpanded ? null : idx)}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${color.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${color.dot} animate-pulse`}></span>
                          {sev}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatTime(a.epoch || a.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {a.alert?.signature || a.msg || 'Intrusion Detected'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {a.alert?.category || a.category || 'misc-attack'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-cyber-cyan font-bold">
                        {a.alert?.signature_id || a.sid || '1000001'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-red-400 font-bold">
                        {a.src_ip}
                        {a.src_port && <span className="text-slate-400 font-normal">:{a.src_port}</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {a.dest_ip}
                        {a.dest_port && <span className="text-cyber-cyan font-normal">:{a.dest_port}</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-cyber-green/10 text-cyber-green border border-cyber-green/20">
                          {mit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (a.src_ip && onBlockIp) {
                                onBlockIp(a.src_ip, a.alert?.signature || 'Intrusion alert trigger');
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Block Attacker IP"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedAlertIndex(isExpanded ? null : idx);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable EVE JSON Detail Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan="8" className="p-4 border-t border-b border-slate-800/80">
                          <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 font-mono text-xs space-y-2">
                            <div className="text-cyber-cyan font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                              <span>SURICATA EVE-JSON TELEMETRY METADATA</span>
                            </div>
                            <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800 text-[11px] leading-relaxed">
                              {JSON.stringify(a, null, 2)}
                            </pre>
                            {a.payload_preview && (
                              <div className="mt-2">
                                <span className="text-slate-400 font-bold text-[11px] block">PAYLOAD EVIDENCE:</span>
                                <div className="text-amber-300 font-hex break-all mt-1 p-2 bg-black/60 rounded border border-slate-800">
                                  {a.payload_preview}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs font-mono">
                    No threat alerts matching criteria. System is currently defended.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-2">
        <span>Showing {filteredAlerts.length} of {alerts.length} intrusion incidents</span>
        <span>Standard Suricata EVE-JSON compliant logging to logs/alerts.jsonl</span>
      </div>

    </div>
  );
}

