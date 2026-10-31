export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '--';
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getSeverityColor(severity) {
  const sev = (severity || '').toUpperCase();
  switch (sev) {
    case 'CRITICAL':
      return {
        badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
        border: 'border-red-500/50',
        glow: 'shadow-glow-red',
      };
    case 'HIGH':
      return {
        badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
        text: 'text-orange-400',
        dot: 'bg-orange-500',
        border: 'border-orange-500/50',
        glow: 'shadow-orange-500/20',
      };
    case 'MEDIUM':
      return {
        badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
        border: 'border-amber-500/50',
        glow: 'shadow-amber-500/20',
      };
    case 'LOW':
    default:
      return {
        badge: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
        text: 'text-cyan-400',
        dot: 'bg-cyan-500',
        border: 'border-cyan-500/50',
        glow: 'shadow-glow-cyan',
      };
  }
}

export function generateHexDump(text) {
  if (!text) return [];
  const lines = [];
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const chunkSize = 16;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    const offset = i.toString(16).padStart(4, '0');
    
    // Hex representation
    let hexPart = '';
    for (let j = 0; j < chunkSize; j++) {
      if (j < chunk.length) {
        hexPart += chunk[j].toString(16).padStart(2, '0') + ' ';
      } else {
        hexPart += '   ';
      }
      if (j === 7) hexPart += ' ';
    }

    // ASCII representation
    let asciiPart = '';
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      asciiPart += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
    }

    lines.push({ offset, hexPart, asciiPart });
  }

  return lines;
}

