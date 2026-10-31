import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, Play, Pause, Search, Filter, ShieldAlert, ArrowRight, Eye, RefreshCw 
} from 'lucide-react';
import { formatTime } from '../utils/helpers';

export default function LiveTraffic({ packets, onSelectPacket }) {
  const [isPaused, setIsPaused] = useState(false);
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const protocols = ['ALL', 'TCP', 'UDP', 'ICMP', 'HTTP'];
  const statuses = ['ALL', 'ACCEPTED', 'DROPPED'];

  // Filter packets
  const filteredPackets = packets.filter((pkt) => {
    // Protocol filter
    if (protocolFilter !== 'ALL') {
      const pktProto = (pkt.protocol || '').toUpperCase();
      if (protocolFilter === 'HTTP') {
        if (!pktProto.includes('HTTP') && pkt.dst_port !== 80 && pkt.dst_port !== 8080) return false;
      } else if (pktProto !== protocolFilter) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const pktStatus = pkt.status || 'ACCEPTED';
      if (pktStatus !== statusFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const src = (pkt.src_ip || '').toLowerCase();
      const dst = (pkt.dst_ip || '').toLowerCase();
      const summary = (pkt.summary || '').toLowerCase();
      const payload = (pkt.payload_preview || '').toLowerCase();
      if (!src.includes(q) && !dst.includes(q) && !summary.includes(q) && !payload.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Filter & Control Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search IP, port, payload content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan transition-colors"
          />
        </div>

        {/* Protocol filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyber-cyan" /> Proto:
          </span>
          {protocols.map((proto) => (
            <button
              key={proto}
              onClick={() => setProtocolFilter(proto)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors ${
                protocolFilter === proto
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        {/* Status filter & Pause button */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-900/60 p-0.5 border border-slate-800">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors ${
                  statusFilter === st
                    ? st === 'DROPPED'
                      ? 'bg-red-500/20 text-red-400 font-bold'
                      : 'bg-cyber-cyan/20 text-cyber-cyan font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
              isPaused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE'}</span>
          </button>
        </div>

      </div>

      {/* Packet Stream Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">SOURCE</th>
                <th className="py-3 px-4">DESTINATION</th>
                <th className="py-3 px-4">PROTO</th>
                <th className="py-3 px-4">FLAGS</th>
                <th className="py-3 px-4">SIZE</th>
                <th className="py-3 px-4">PAYLOAD PREVIEW</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 text-xs font-mono">
              {filteredPackets.map((pkt, idx) => {
                const isDropped = pkt.status === 'DROPPED';
                return (
                  <motion.tr
                    key={pkt.timestamp ? `${pkt.timestamp}-${idx}` : idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isDropped ? 'bg-red-500/5' : ''
                    }`}
                    onClick={() => onSelectPacket(pkt)}
                  >
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatTime(pkt.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDropped
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDropped ? 'bg-red-500' : 'bg-cyber-green'}`}></span>
                        {pkt.status || 'ACCEPTED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-white font-semibold whitespace-nowrap">
                      {pkt.src_ip}
                      {pkt.src_port && <span className="text-slate-400 font-normal">:{pkt.src_port}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                      {pkt.dst_ip}
                      {pkt.dst_port && <span className="text-cyber-cyan">:{pkt.dst_port}</span>}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-bold text-[10px]">
                        {pkt.protocol || 'IP'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {pkt.flags || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {pkt.length || 0} B
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate font-mono text-[11px]">
                      {pkt.payload_preview || pkt.summary || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPacket(pkt);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyber-cyan transition-colors"
                        title="Inspect Packet"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}

              {filteredPackets.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 text-xs font-mono">
                    No matching packets found. Listening for live traffic...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-2">
        <span>Showing {filteredPackets.length} of {packets.length} buffered packets</span>
        <span>Click any row to open Deep Hex / ASCII Inspector</span>
      </div>

    </div>
  );
}

