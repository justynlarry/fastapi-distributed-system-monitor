from typing import Union, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import time
import socket
import os
from pathlib import Path

app = FastAPI(
    title="System Monitor API with Python.",
    version="1.0.0",
    description="API to retrieve core system resource usage."
)

# simple origins placeholder (you can tighten this later)
origins = [
    "http://100.120.87.36"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if desired
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def detect_host_hostname() -> str:
    """
    Determine the 'real' host hostname with this priority:
      1. A mounted file at /etc/host_hostname (recommended - mount host's /etc/hostname into the container)
      2. Environment variable HOST_HOSTNAME
      3. /etc/hostname (may be the container's hostname)
      4. socket.gethostname() fallback
    """
    # 1) mounted host hostname file (what we'll map from host)
    host_file = Path("/etc/host_hostname")
    if host_file.exists():
        try:
            text = host_file.read_text().strip()
            if text:
                return text
        except Exception:
            pass

    # 2) environment variable
    env_host = os.getenv("HOST_HOSTNAME")
    if env_host:
        return env_host

    # 3) try /etc/hostname (might still be container's hostname)
    etc_hostname = Path("/etc/hostname")
    if etc_hostname.exists():
        try:
            text = etc_hostname.read_text().strip()
            if text:
                return text
        except Exception:
            pass

    # 4) fallback
    return socket.gethostname()

# resolve once at startup (cheap). If you prefer always-current value, call detect_host_hostname() inside get_system_status().
SERVER_HOSTNAME = detect_host_hostname()


def get_system_status() -> Dict[str, Union[float, str]]:
    """
    Calculates and returns the current CPU/memory/disk usage.
    """
    cpu_usage = psutil.cpu_percent(interval=0.1, percpu=False)
    mem_avail = psutil.virtual_memory()
    memory_percent = mem_avail.percent

    try:
        disk_used = psutil.disk_usage('/')
        disk_percent = disk_used.percent
        disk_mount = '/'
    except Exception as e:
        disk_percent = -1.0
        disk_mount = "Error accessing disk: " + str(e)

    return {
        "hostname": SERVER_HOSTNAME,
        "cpu_usage_percent": cpu_usage,
        "memory_usage_percent": memory_percent,
        "disk_usage_percent": disk_percent,
        "disk_mount_point": disk_mount,
        "timestamp": time.time()
    }

@app.get("/metrics", summary="Get current CPU, Memory, and Disk Usage")
def system_status_endpoint() -> Dict[str, Union[float, str]]:
    return get_system_status()
