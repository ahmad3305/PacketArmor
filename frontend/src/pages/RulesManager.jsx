import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, Plus, Search, CheckCircle, XCircle, RotateCw, AlertTriangle, Code, X 
} from 'lucide-react';
import { api } from '../services/api';
import { getSeverityColor } from '../utils/helpers';

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = [
    { id: 'ALL', label: 'All Rules' },
    { id: 'web-application-attack', label: 'Web Exploits' },
    { id: 'attempted-recon', label: 'Recon & Scans' },
    { id: 'denial-of-service', label: 'DoS & Floods' },
    { id: 'custom.rules', label: 'Custom User Rules' },
  ];

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.getRules();
      setRules(res.rules || []);
    } catch (e) {
      console.error('Failed to fetch rules', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (sid, currentEnabled) => {
    try {
      await api.toggleRule(sid, !currentEnabled);
      setRules((prev) =>
        prev.map((r) => (r.sid === sid ? { ...r, enabled: !currentEnabled } : r))
      );
    } catch (e) {
      alert(`Failed to toggle rule: ${e.message}`);
    }
  };

  const handleReload = async () => {
    try {
      await api.reloadRules();
      fetchRules();
    } catch (e) {
      alert('Error reloading rules');
    }
  };

  const handleAddCustomRule = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newRuleText.trim()) return;

    try {
      setSaving(true);
      const res = await api.addRule(newRuleText.trim());
      setShowAddModal(false);
      setNewRuleText('');
      fetchRules();
    } catch (err) {
      setModalError(err.message || 'Invalid Snort rule syntax');
    } finally {
      setSaving(false);
    }
  };

  const filteredRules = rules.filter((r) => {
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'custom.rules') {
        if (r.source_file !== 'custom.rules') return false;
      } else if (r.classtype !== categoryFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const msg = (r.msg || '').toLowerCase();
      const sid = String(r.sid || '');
      const raw = (r.raw_text || '').toLowerCase();
      if (!msg.includes(q) && !sid.includes(q) && !raw.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rules by SID, keyword, signature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            title="Reload rule files from disk"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl bg-cyber-cyan text-slate-950 hover:bg-cyber-cyan/90 transition-all shadow-glow-cyan/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Rule</span>
          </button>
        </div>

      </div>

      {/* Rules Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">STATE</th>
                <th className="py-3 px-4">SID</th>
                <th className="py-3 px-4">RULE SIGNATURE MESSAGE</th>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">CLASSTYPE</th>
                <th className="py-3 px-4">FILE</th>
                <th className="py-3 px-4">RAW SNORT DEFINITION</th>
                <th className="py-3 px-4 text-right">TOGGLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 text-xs font-mono">
              {filteredRules.map((rule) => {
                const color = getSeverityColor(rule.severity);
                return (
                  <tr key={rule.sid} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {rule.enabled ? (
                        <span className="flex items-center gap-1.5 text-cyber-green text-[11px] font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> ARMED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> DISABLED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-cyber-cyan font-bold">
                      {rule.sid}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold min-w-[200px]">
                      {rule.msg}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color.badge}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {rule.classtype || 'misc-attack'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {rule.source_file}
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-400 text-[11px] font-hex">
                      {rule.raw_text}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(rule.sid, rule.enabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          rule.enabled ? 'bg-cyber-cyan' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                            rule.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRules.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs font-mono">
                    No rules found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-2">
        <span>Showing {filteredRules.length} of {rules.length} loaded Snort / Suricata rules</span>
        <span>Standard Snort rule format: action proto src_ip src_port -&gt; dst_ip dst_port (options...)</span>
      </div>

      {/* Add Custom Rule Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl glass-panel-glow rounded-2xl overflow-hidden border border-cyber-cyan/30 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyber-cyan" />
                  <h3 className="text-base font-bold text-white">Create Custom Snort Rule</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomRule} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Rule Definition (Snort Syntax)
                  </label>
                  <textarea
                    rows={4}
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder='alert tcp any any -> any 80 (msg:"Custom Suspicious Header"; content:"BadActor"; nocase; sid:3000001; rev:1; classtype:misc-attack; priority:2;)'
                    className="w-full p-3 font-hex text-xs bg-slate-950 border border-slate-800 rounded-xl text-cyber-cyan placeholder-slate-600 focus:outline-none focus:border-cyber-cyan"
                    required
                  />
                </div>

                {modalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="text-white font-bold">Rule Template Helpers:</div>
                  <div>• SID must be unique (use range 3000000+)</div>
                  <div>• Priority 1 = Critical, 2 = High, 3 = Medium, 4 = Low</div>
                  <div>• Options must end with a semicolon (;)</div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-cyber-cyan text-slate-950 hover:bg-cyber-cyan/90 transition-all shadow-glow-cyan/20 disabled:opacity-50"
                  >
                    {saving ? 'Validating & Saving...' : 'Register Rule'}
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

