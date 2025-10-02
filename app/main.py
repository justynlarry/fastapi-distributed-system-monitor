from typing import Union, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil 
import time
import socket

app = FastAPI(
    title="System Monitor API with Python.",
    version="1.0.0",
    description="API to retrieve core system resource usage."
)

origins = [
    "http://100.120.87.36"
]

# Allow frontend (nginx) to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can restrict to your frontend IP/domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_system_status() -> Dict[str, Union[float, str]]:
    """
    Calculates and returns the current average CPU usage, memory usage, and
    root disk usage percentage using the psutil library.
    """
    # 1. Get hostname of machine running metrics.py
    server_hostname = socket.gethostname()

    # 2.  CPU Usage
    # The interval=1 causes psutil to block for 1 second to calculate the average
    # CPU usage since the last call.
    cpu_usage = psutil.cpu_percent(interval=1, percpu=False)

    # 3.  Memory Usage 
    mem_avail = psutil.virtual_memory()
    # Acces the 'percent' attribute directly.
    memory_percent = mem_avail.percent

    # 4.  Disk Usage (Root Disk)
    try:
        # psutil.disk_usage('/') works on Linux/MacOS
        disk_used = psutil.disk_usage('/')
        disk_percent = disk_used.percent
        disk_mount = '/'
    except Exception as e:
        # Fallback if the root disk access fails
        disk_percent = -1.0
        disk_mount = "Error accessing disk: " + str(e)

    # Return all the collected data as a JSON object
    return {
        "hostname" : server_hostname,
        "cpu_usage_percent" : cpu_usage,
        "memory_usage_percent" : memory_percent,
        "disk_usage_percent" : disk_percent,
        "disk_mount_point" : disk_mount,
        "timestamp" : time.time()
    }

app = FastAPI(
    title = "System Monitor API with Python.",
    version="1.0.0",
    description="API to retrieve core system resource usage."
)

@app.get("/metrics", summary="Get current CPU, Memory, and Disk Usage")
def system_status_endpoint() -> Dict[str, Union[float, str]]:
    """
    Retrieves system status metrics by calling the dedicated utility function.

    Returns:
        A dictionary containing CPU, Memory, and Disk usage percentages, etc.
    """

    # Delegate the work to the function defined in the separate utility module
    return get_system_status()