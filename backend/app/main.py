import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import WS_HEARTBEAT_SEC
from app.core.sniffer import sniffer
from app.storage.memory_store import memory_store
from app.response.mitigation import mitigation_engine

# Import routers
from app.api.routes_system import router as system_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_rules import router as rules_router
from app.api.routes_response import router as response_router
from app.api.routes_simulator import router as simulator_router

import asyncio
import json
import logging
import threading
import time
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import WS_HEARTBEAT_SEC
from app.core.sniffer import sniffer
from app.storage.memory_store import memory_store
from app.response.mitigation import mitigation_engine

# Import routers
from app.api.routes_system import router as system_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_rules import router as rules_router
from app.api.routes_response import router as response_router
from app.api.routes_simulator import router as simulator_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PacketArmor")

# Active WebSocket connections
active_websockets: Set[WebSocket] = set()
ws_lock = threading.Lock()
loop: asyncio.AbstractEventLoop = None
stop_maintenance = threading.Event()

def broadcast_sync_event(event_type: str, data: any):
    """Callback invoked when a packet or alert occurs to notify WebSocket clients."""
    with ws_lock:
        if not active_websockets or not loop or loop.is_closed():
            return
        msg = json.dumps({"type": event_type, "data": data})
        for ws in list(active_websockets):
            try:
                asyncio.run_coroutine_threadsafe(ws.send_text(msg), loop)
            except Exception:
                active_websockets.discard(ws)

def maintenance_worker():
    """Background worker for periodic metric updates and unban expirations."""
    while not stop_maintenance.is_set():
        try:
            time.sleep(WS_HEARTBEAT_SEC)
            mitigation_engine.check_expired_blocks()

            with ws_lock:
                if active_websockets and loop and not loop.is_closed():
                    metrics = memory_store.get_metrics_snapshot()
                    msg = json.dumps({"type": "metrics", "data": metrics})
                    for ws in list(active_websockets):
                        try:
                            asyncio.run_coroutine_threadsafe(ws.send_text(msg), loop)
                        except Exception:
                            active_websockets.discard(ws)
        except Exception as e:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    global loop
    loop = asyncio.get_running_loop()
    
    logger.info("Initializing PacketArmor NIDS Engine...")
    sniffer.register_callback(broadcast_sync_event)
    
    # Auto-start sniffer baseline
    sniffer.start(mode="simulation")
    
    # Start maintenance daemon thread
    stop_maintenance.clear()
    m_thread = threading.Thread(target=maintenance_worker, daemon=True)
    m_thread.start()
    
    logger.info("NIDS Packet Capture Engine active.")
    yield
    # Shutdown
    stop_maintenance.set()
    sniffer.stop()
    logger.info("PacketArmor Engine stopped.")

app = FastAPI(
    title="PacketArmor NIDS & IPS API",
    description="Full-featured Network Intrusion Detection & Prevention System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(system_router)
app.include_router(alerts_router)
app.include_router(metrics_router)
app.include_router(rules_router)
app.include_router(response_router)
app.include_router(simulator_router)

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    try:
        # Send initial snapshot immediately
        initial_metrics = memory_store.get_metrics_snapshot()
        await websocket.send_text(json.dumps({"type": "metrics", "data": initial_metrics}))
        
        while True:
            # Keep socket open and receive ping/messages from client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)

# Mount Production Frontend if built
from fastapi.staticfiles import StaticFiles
from app.config import PROJECT_DIR

frontend_dist = PROJECT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "app": "PacketArmor NIDS & IPS",
            "status": "Online",
            "documentation": "/docs"
        }
