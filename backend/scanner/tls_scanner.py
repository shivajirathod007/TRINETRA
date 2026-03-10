import asyncio
from sslyze import (
    ServerNetworkLocation,
    ServerConnectivityTester,
    Scanner,
    ServerScanRequest,
    ScanCommand,
)
from typing import Dict, Any

async def scan_tls(hostname: str, port: int = 443) -> Dict[str, Any]:
    """
    Use SSLyze to probe TLS 1.0/1.1/1.2/1.3 and enumerate full cipher suites.
    """
    server_location = ServerNetworkLocation(hostname=hostname, port=port)
    
    try:
        connectivity_tester = ServerConnectivityTester()
        server_info = connectivity_tester.perform(server_location)
        
        scan_request = ServerScanRequest(
            server_info=server_info,
            scan_commands={
                ScanCommand.SSL_2_0_CIPHER_SUITES,
                ScanCommand.SSL_3_0_CIPHER_SUITES,
                ScanCommand.TLS_1_0_CIPHER_SUITES,
                ScanCommand.TLS_1_1_CIPHER_SUITES,
                ScanCommand.TLS_1_2_CIPHER_SUITES,
                ScanCommand.TLS_1_3_CIPHER_SUITES,
                ScanCommand.CERTIFICATE_INFO,
            },
        )
        scanner = Scanner()
        scanner.queue_scans([scan_request])
        
        results = {}
        for server_scan_result in scanner.get_results():
            for command, result in server_scan_result.scan_commands_results.items():
                results[command.name] = result
        
        return {
            "status": "success",
            "hostname": hostname,
            "data": str(results) # Serialize actual sslyze objects in real impl
        }
    except Exception as e:
        return {"status": "error", "hostname": hostname, "error": str(e)}

if __name__ == "__main__":
    res = asyncio.run(scan_tls("example.com"))
    print(res)
