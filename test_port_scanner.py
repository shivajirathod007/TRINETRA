import sys
import os
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import asyncio
from engine.discovery.port_scanner import PortScanner

async def main():
    scanner = PortScanner()
    print("Scanner initialized with ports:")
    print(scanner.scan_ports)

asyncio.run(main())
