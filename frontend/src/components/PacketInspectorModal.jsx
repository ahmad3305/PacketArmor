import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, ArrowRight, Ban, Copy, Check } from 'lucide-react';
import { generateHexDump, formatTime } from '../utils/helpers';

export default function PacketInspectorModal({ packet, onClose, onBlockIp }) {
  const [copied, setCopied] = React.useState(false);

  if (!packet) return null;

  const hexLines = generateHexDump(packet.payload_preview || packet.summary || '');
  const isDropped = packet.status === 'DROPPED';

  const copyPayload = () => {
    if (packet.payload_preview) {
      navigator.clipboard.writeText(packet.payload_preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl glass-panel-glow rounded-2xl overflow-hidden border border-cyber-cyan/30 shadow-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Deep Packet Inspector</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                    isDropped ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                  }`}>
                    {packet.status || 'ACCEPTED'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Captured at: {formatTime(packet.timestamp)} • Size: {packet.length || 0} bytes
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* 5-Tuple Network Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Source */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">SOURCE</span>
                <div className="text-base font-mono font-bold text-white mt-1 flex items-center gap-2">
                  <span>{packet.src_ip || 'Unknown'}</span>
                  {packet.src_port && (
                    <span className="text-xs text-cyber-cyan">:{packet.src_port}</span>
                  )}
                </div>
              </div>

              {/* Destination */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">DESTINATION</span>
                <div className="text-base font-mono font-bold text-white mt-1 flex items-center gap-2">
                  <span>{packet.dst_ip || 'Unknown'}</span>
                  {packet.dst_port && (
                    <span className="text-xs text-cyber-cyan">:{packet.dst_port}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Protocol Meta */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400">PROTOCOL</span>
                <div className="text-sm font-mono font-bold text-cyber-cyan mt-0.5">{packet.protocol || 'IP'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400">FLAGS</span>
                <div className="text-sm font-mono font-bold text-white mt-0.5">{packet.flags || 'None'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400">STATUS</span>
                <div className={`text-sm font-mono font-bold mt-0.5 ${isDropped ? 'text-red-400' : 'text-cyber-green'}`}>
                  {isDropped ? 'DROPPED (IPS)' : 'FORWARDED'}
                </div>
              </div>
            </div>

            {/* Raw Payload & Hex Dump Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-300 font-semibold tracking-wider uppercase">
                  PAYLOAD HEX & ASCII DUMP
                </span>
                <button
                  onClick={copyPayload}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-cyber-green" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-hex text-xs overflow-x-auto leading-relaxed max-h-56">
                {hexLines.length > 0 ? (
                  hexLines.map((line, idx) => (
                    <div key={idx} className="flex gap-4 hover:bg-slate-900/50 px-1 py-0.5 rounded">
                      <span className="text-slate-500 select-none">{line.offset}</span>
                      <span className="text-cyber-cyan/90 whitespace-pre">{line.hexPart}</span>
                      <span className="text-slate-300 select-none border-l border-slate-800 pl-4">{line.asciiPart}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No application payload present in this packet.</span>
                )}
              </div>
            </div>

            {/* Summary preview */}
            {packet.summary && (
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase">PACKET SUMMARY</span>
                <div className="text-xs font-mono text-slate-200 mt-1 break-all">{packet.summary}</div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/40">
            <button
              onClick={() => {
                if (packet.src_ip && onBlockIp) {
                  onBlockIp(packet.src_ip, `Blocked from Packet Inspector: ${packet.summary || 'Malicious packet'}`);
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all shadow-glow-red/10"
            >
              <Ban className="w-4 h-4" />
              <span>Block Source IP ({packet.src_ip})</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

