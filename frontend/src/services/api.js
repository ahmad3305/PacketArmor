const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    let errMessage = `HTTP Error ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.detail) {
        errMessage = errData.detail;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errMessage);
  }

  // Handle blob/text exports
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

export const api = {
  // System Controls
  getSystemStatus: () => request('/api/system/status'),
  getInterfaces: () => request('/api/system/interfaces'),
  startEngine: (interfaceName, mode = 'simulation') =>
    request('/api/system/start', {
      method: 'POST',
      body: JSON.stringify({ interface: interfaceName, mode }),
    }),
  stopEngine: () => request('/api/system/stop', { method: 'POST' }),

  // Metrics & Flows
  getMetrics: () => request('/api/metrics'),
  getFlows: (limit = 30) => request(`/api/metrics/flows?limit=${limit}`),
  getPackets: (limit = 50) => request(`/api/metrics/packets?limit=${limit}`),

  // Alerts
  getAlerts: (limit = 100, severity, srcIp) => {
    let query = `?limit=${limit}`;
    if (severity) query += `&severity=${encodeURIComponent(severity)}`;
    if (srcIp) query += `&src_ip=${encodeURIComponent(srcIp)}`;
    return request(`/api/alerts${query}`);
  },
  clearAlerts: () => request('/api/alerts', { method: 'DELETE' }),
  exportAlertsUrl: (format = 'json') => `${BASE_URL}/api/alerts/export?format=${format}`,

  // Rules
  getRules: () => request('/api/rules'),
  addRule: (ruleString) =>
    request('/api/rules', {
      method: 'POST',
      body: JSON.stringify({ rule: ruleString }),
    }),
  toggleRule: (sid, enabled) =>
    request(`/api/rules/${sid}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
  reloadRules: () => request('/api/rules/reload', { method: 'POST' }),

  // Response & Firewall
  getBlockedIPs: () => request('/api/response/blocked'),
  blockIP: (ip, reason, severity = 'HIGH', durationSec = 300) =>
    request('/api/response/block', {
      method: 'POST',
      body: JSON.stringify({
        ip,
        reason,
        severity,
        duration_sec: durationSec,
      }),
    }),
  unblockIP: (ip) =>
    request('/api/response/unblock', {
      method: 'POST',
      body: JSON.stringify({ ip }),
    }),
  getMitigationConfig: () => request('/api/response/config'),
  updateMitigationConfig: (config) =>
    request('/api/response/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Simulator
  launchAttack: (attackType, attackerIp, targetIp) =>
    request('/api/simulator/launch', {
      method: 'POST',
      body: JSON.stringify({
        attack_type: attackType,
        attacker_ip: attackerIp,
        target_ip: targetIp,
      }),
    }),
};

