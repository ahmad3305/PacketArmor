import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveTraffic from './pages/LiveTraffic';
import AlertsView from './pages/AlertsView';
import RulesManager from './pages/RulesManager';
import ResponseCenter from './pages/ResponseCenter';
import AttackSimulator from './pages/AttackSimulator';
import PacketInspectorModal from './components/PacketInspectorModal';
import { api } from './services/api';
import { wsClient } from './services/websocket';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [packets, setPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [bannerAlert, setBannerAlert] = useState(null);

  // Initial Fetch & WebSocket setup
  useEffect(() => {
    // 1. Initial REST polling
    const fetchInitialData = async () => {
      try {
        const [statusRes, metricsRes, alertsRes, packetsRes] = await Promise.all([
          api.getSystemStatus(),
          api.getMetrics(),
          api.getAlerts(100),
          api.getPackets(100),
        ]);
        setSystemStatus(statusRes);
        setMetrics(metricsRes);
        setAlerts(alertsRes.alerts || []);
        setPackets(packetsRes.packets || []);
      } catch (e) {
        console.error('Initial data fetch error:', e);
      }
    };

    fetchInitialData();

    // 2. Connect WebSocket
    wsClient.connect();

    // Subscribe to WS connection status
    const unsubStatus = wsClient.subscribe('status', (data) => {
      setWsConnected(data.connected);
    });

    // Subscribe to real-time metrics updates (every 1s)
    const unsubMetrics = wsClient.subscribe('metrics', (newMetrics) => {
      setMetrics(newMetrics);
    });

    // Subscribe to live packet stream
    const unsubPackets = wsClient.subscribe('packet', (newPacket) => {
      setPackets((prev) => [newPacket, ...prev.slice(0, 199)]);
    });

    // Subscribe to intrusion alerts
    const unsubAlerts = wsClient.subscribe('alert', (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.slice(0, 499)]);
      // Show high priority banner alert
      const sev = (newAlert.alert?.severity || newAlert.severity || '').toUpperCase();
      if (sev === 'CRITICAL' || sev === 'HIGH') {
        setBannerAlert(newAlert);
        setTimeout(() => setBannerAlert(null), 6000);
      }
    });

    // Background interval to refresh system status
    const statusInterval = setInterval(async () => {
      try {
        const status = await api.getSystemStatus();
        setSystemStatus(status);
      } catch (e) {
        // ignore
      }
    }, 5000);

    return () => {
      unsubStatus();
      unsubMetrics();
      unsubPackets();
      unsubAlerts();
      clearInterval(statusInterval);
      wsClient.disconnect();
    };
  }, []);

  // Engine Start/Stop toggle
  const handleToggleEngine = async () => {
    try {
      if (systemStatus?.status === 'RUNNING') {
        await api.stopEngine();
        setSystemStatus((prev) => ({ ...prev, status: 'STOPPED' }));
      } else {
        await api.startEngine();
        setSystemStatus((prev) => ({ ...prev, status: 'RUNNING' }));
      }
    } catch (e) {
      alert(`Error toggling engine: ${e.message}`);
    }
  };

  // Block IP handler
  const handleBlockIp = async (ip, reason) => {
    try {
      await api.blockIP(ip, reason || 'Mitigated from Web Console', 'HIGH', 300);
      alert(`Host IP ${ip} has been blocked and quarantined.`);
      // Refresh system status
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (e) {
      alert(`Failed to block IP: ${e.message}`);
    }
  };

  // Clear Alerts handler
  const handleClearAlerts = async () => {
    try {
      await api.clearAlerts();
      setAlerts([]);
    } catch (e) {
      alert('Error clearing alerts');
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col cyber-grid relative">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 cyber-grid-radial pointer-events-none -z-10" />

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        systemStatus={systemStatus}
        onToggleEngine={handleToggleEngine}
        wsConnected={wsConnected}
        metrics={metrics}
      />

      {/* Critical Threat Notification Banner */}
      <AnimatePresence>
        {bannerAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-20 z-30 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-2"
          >
            <div className="bg-red-600/90 text-white px-4 py-2.5 rounded-xl backdrop-blur-md shadow-glow-red flex items-center justify-between border border-red-400/40 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span className="font-bold uppercase tracking-wider">
                  CRITICAL INTRUSION DETECTED:
                </span>
                <span>{bannerAlert.alert?.signature || bannerAlert.msg}</span>
                <span className="text-white/80">
                  from {bannerAlert.src_ip} → {bannerAlert.dest_ip}:{bannerAlert.dest_port}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentTab('alerts')}
                  className="underline hover:text-red-200"
                >
                  View Incident
                </button>
                <button
                  onClick={() => setBannerAlert(null)}
                  className="text-white hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 'dashboard' && (
              <Dashboard
                metrics={metrics}
                alerts={alerts}
                systemStatus={systemStatus}
                onSelectPacket={setSelectedPacket}
                onBlockIp={handleBlockIp}
                setCurrentTab={setCurrentTab}
              />
            )}

            {currentTab === 'traffic' && (
              <LiveTraffic
                packets={packets}
                onSelectPacket={setSelectedPacket}
              />
            )}

            {currentTab === 'alerts' && (
              <AlertsView
                alerts={alerts}
                onBlockIp={handleBlockIp}
                onClearAlerts={handleClearAlerts}
              />
            )}

            {currentTab === 'rules' && <RulesManager />}

            {currentTab === 'response' && <ResponseCenter />}

            {currentTab === 'simulator' && (
              <AttackSimulator
                onAttackTriggered={(attack) => {
                  // Switch to alerts or show notification
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Deep Packet Inspector Modal */}
      <PacketInspectorModal
        packet={selectedPacket}
        onClose={() => setSelectedPacket(null)}
        onBlockIp={handleBlockIp}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900/80 bg-slate-950/40 py-4 px-4 text-center text-xs font-mono text-slate-500">
        PacketArmor Next-Gen NIDS // IPS • Snort & Suricata Signature Engine • Real-time Active Defense
      </footer>
    </div>
  );
}

