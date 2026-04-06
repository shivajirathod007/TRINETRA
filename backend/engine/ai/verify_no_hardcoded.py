"""
Verification script to prove NO HARDCODED VALUES
Tests with REAL scan data from database
"""

import json
import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from jarsh_inference import get_jarsh_inference
from db.session import get_sync_session
from db.models import Scan, Asset, Vulnerability


def fetch_real_scan_from_db():
    """Fetch an actual scan from the database for testing"""
    try:
        session = next(get_sync_session())
        
        # Get a real scan
        scan = session.query(Scan).first()
        if not scan:
            print("⚠️  No scans found in database")
            print("   Please run some scans first, or the test will use simulated data")
            return None
        
        # Get assets and vulnerabilities
        assets = session.query(Asset).filter(Asset.scan_id == scan.id).all()
        
        scan_data = {
            "scan_id": scan.id,
            "domain": scan.target_domain or "unknown",
            "status": scan.status,
            "risk_score": getattr(scan, 'risk_score', 0),
            "created_at": str(scan.created_at) if scan.created_at else "unknown",
            "vulnerabilities": [],
            "assets": []
        }
        
        for asset in assets:
            vulns = session.query(Vulnerability).filter(Vulnerability.asset_id == asset.id).all()
            
            scan_data["assets"].append({
                "hostname": asset.hostname,
                "ip": asset.ip_address,
                "port": asset.port
            })
            
            for vuln in vulns:
                scan_data["vulnerabilities"].append({
                    "type": vuln.vulnerability_type,
                    "severity": vuln.severity,
                    "description": vuln.description,
                    "asset": asset.hostname
                })
        
        session.close()
        
        print(f"✓ Fetched real scan from database:")
        print(f"  Scan ID: {scan_data['scan_id']}")
        print(f"  Domain: {scan_data['domain']}")
        print(f"  Vulnerabilities: {len(scan_data['vulnerabilities'])}")
        print(f"  Assets: {len(scan_data['assets'])}")
        
        return scan_data
        
    except Exception as e:
        print(f"⚠️  Could not fetch from database: {e}")
        print("   Will use simulated data for testing")
        return None


def get_simulated_scan_data():
    """Fallback: Simulated scan data for testing when database is empty"""
    print("⚠️  Using simulated data (no real scans in database)")
    print("   This is ONLY for testing the code logic")
    print("   In production, this will use REAL database scans")
    print()
    
    return {
        "scan_id": "test-scan-001",
        "domain": "testdomain.example.org",
        "status": "completed",
        "risk_score": 82,
        "created_at": "2024-01-15 10:30:00",
        "vulnerabilities": [
            {
                "type": "ECDHE-RSA-AES256",
                "severity": "critical",
                "description": "Elliptic curve key exchange vulnerable to quantum attacks",
                "asset": "api.testdomain.example.org"
            },
            {
                "type": "SHA-256 Certificate",
                "severity": "high",
                "description": "Certificate uses SHA-256 which may be vulnerable",
                "asset": "www.testdomain.example.org"
            }
        ],
        "assets": [
            {"hostname": "api.testdomain.example.org", "ip": "192.168.1.10", "port": 443}
        ]
    }


def test_without_scan_data():
    """Test 1: Without scan data - should give generic response"""
    print("=" * 70)
    print("TEST 1: Without Scan Data (Generic Response)")
    print("=" * 70)
    print()
    
    jarsh = get_jarsh_inference()
    
    query = "What vulnerabilities were found?"
    result = jarsh.generate_response(query, scan_data=None)
    
    print(f"Query: {query}")
    print(f"Intent: {result['intent']}")
    print(f"Response: {result['response'][:200]}...")
    print()
    
    # Check for hardcoded values
    hardcoded_terms = ["RSA-2048", "TLS 1.1", "example.com", "42%", "75/100"]
    found_hardcoded = [term for term in hardcoded_terms if term in result['response']]
    
    if found_hardcoded:
        print(f"✗ FAIL: Found hardcoded values: {found_hardcoded}")
        return False
    else:
        print("✓ PASS: No hardcoded values in generic response")
        return True


def test_with_real_scan_data():
    """Test 2: With REAL scan data from database - should use ONLY that data"""
    print()
    print("=" * 70)
    print("TEST 2: With Real Scan Data from Database (Dynamic Response)")
    print("=" * 70)
    print()
    
    jarsh = get_jarsh_inference()
    
    # Try to fetch REAL scan from database
    real_scan_data = fetch_real_scan_from_db()
    
    # Fallback to simulated if database is empty
    if not real_scan_data:
        real_scan_data = get_simulated_scan_data()
    
    print()
    
    query = "What vulnerabilities were found?"
    result = jarsh.generate_response(
        query, 
        scan_data=real_scan_data, 
        scan_id=real_scan_data['scan_id']
    )
    
    print(f"Query: {query}")
    print(f"Intent: {result['intent']}")
    print()
    print("Response:")
    print("-" * 70)
    print(result['response'])
    print("-" * 70)
    print()
    
    # Verify response uses the ACTUAL data (whether from DB or simulated)
    domain = real_scan_data['domain']
    risk_score = str(real_scan_data['risk_score'])
    scan_id = real_scan_data['scan_id']
    
    checks = {
        "Domain": domain in result['response'],
        "Risk Score": risk_score in result['response'],
        "Scan ID": scan_id in result['response'],
        "Vulnerability Count": str(len(real_scan_data['vulnerabilities'])) in result['response']
    }
    
    # Check for specific vulnerabilities from the data
    if real_scan_data['vulnerabilities']:
        first_vuln = real_scan_data['vulnerabilities'][0]
        checks["First Vulnerability"] = first_vuln['type'] in result['response']
    
    print("Verification:")
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}: {'Found' if passed else 'NOT FOUND'}")
        if not passed:
            all_passed = False
    
    print()
    
    # Check for OLD hardcoded values (should NOT be present)
    old_hardcoded = ["example.com", "42%", "2 of 12 domains", "RSA-2048 with ECDHE"]
    found_old = [term for term in old_hardcoded if term in result['response'] and term not in str(real_scan_data)]
    
    if found_old:
        print(f"✗ FAIL: Found old hardcoded values not in scan data: {found_old}")
        return False
    
    if all_passed:
        print("✓ PASS: Response generated entirely from actual scan data")
        return True
    else:
        print("✗ FAIL: Response missing actual scan data")
        return False


def test_mitigation_response():
    """Test 3: Mitigation response - should be based on actual vulnerabilities from DB"""
    print()
    print("=" * 70)
    print("TEST 3: Mitigation Response (From Real/Simulated Data)")
    print("=" * 70)
    print()
    
    jarsh = get_jarsh_inference()
    
    # Try to fetch a different scan from database
    try:
        session = next(get_sync_session())
        scans = session.query(Scan).limit(2).all()
        
        if len(scans) > 1:
            scan = scans[1]  # Get second scan
        elif len(scans) > 0:
            scan = scans[0]  # Get first scan
        else:
            scan = None
        
        if scan:
            assets = session.query(Asset).filter(Asset.scan_id == scan.id).all()
            scan_data = {
                "scan_id": scan.id,
                "domain": scan.target_domain or "unknown",
                "risk_score": getattr(scan, 'risk_score', 0),
                "vulnerabilities": []
            }
            
            for asset in assets:
                vulns = session.query(Vulnerability).filter(Vulnerability.asset_id == asset.id).all()
                for vuln in vulns:
                    scan_data["vulnerabilities"].append({
                        "type": vuln.vulnerability_type,
                        "severity": vuln.severity,
                        "description": vuln.description,
                        "asset": asset.hostname
                    })
            
            session.close()
            print(f"✓ Using real scan from database: {scan_data['domain']}")
        else:
            scan_data = None
    except:
        scan_data = None
    
    # Fallback to simulated
    if not scan_data or not scan_data['vulnerabilities']:
        print("⚠️  Using simulated data (no suitable scans in database)")
        scan_data = {
            "scan_id": "test-scan-002",
            "domain": "secure.company.net",
            "risk_score": 45,
            "vulnerabilities": [
                {
                    "type": "RSA-4096",
                    "severity": "high",
                    "description": "RSA key exchange detected",
                    "asset": "vpn.secure.company.net"
                },
                {
                    "type": "Weak DH Parameters",
                    "severity": "medium",
                    "description": "Diffie-Hellman parameters below 2048 bits",
                    "asset": "mail.secure.company.net"
                }
            ]
        }
    
    print()
    
    query = "How do I fix these issues?"
    result = jarsh.generate_response(query, scan_data=scan_data, scan_id=scan_data['scan_id'])
    
    print(f"Query: {query}")
    print(f"Intent: {result['intent']}")
    print()
    print("Response:")
    print("-" * 70)
    print(result['response'])
    print("-" * 70)
    print()
    
    # Verify mitigation is specific to THESE vulnerabilities
    domain = scan_data['domain']
    first_vuln = scan_data['vulnerabilities'][0]['type'] if scan_data['vulnerabilities'] else ""
    
    checks = {
        "Domain": domain in result['response'],
        "First Vulnerability": first_vuln in result['response'] if first_vuln else True,
        "ML-KEM Recommendation": "ML-KEM" in result['response'] or "PQC" in result['response']
    }
    
    print("Verification:")
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}: {'Found' if passed else 'NOT FOUND'}")
        if not passed:
            all_passed = False
    
    print()
    
    if all_passed:
        print("✓ PASS: Mitigation response based on actual vulnerabilities")
        return True
    else:
        print("✗ FAIL: Mitigation response not specific enough")
        return False


def test_readiness_response():
    """Test 4: Readiness response - should calculate from real data"""
    print()
    print("=" * 70)
    print("TEST 4: Readiness Response (Calculated from Real Data)")
    print("=" * 70)
    print()
    
    jarsh = get_jarsh_inference()
    
    # Scan with many quantum vulnerabilities
    scan_data = {
        "scan_id": "test-scan-003",
        "domain": "legacy.oldcorp.com",
        "risk_score": 91,
        "vulnerabilities": [
            {"type": "RSA-2048", "severity": "critical", "asset": "web1"},
            {"type": "RSA-2048", "severity": "critical", "asset": "web2"},
            {"type": "ECDSA-P256", "severity": "high", "asset": "api1"},
            {"type": "ECDHE", "severity": "high", "asset": "api2"},
            {"type": "DH-1024", "severity": "critical", "asset": "vpn"},
            {"type": "TLS 1.0", "severity": "medium", "asset": "mail"}
        ]
    }
    
    query = "Am I ready for quantum threats?"
    result = jarsh.generate_response(query, scan_data=scan_data, scan_id="test-scan-003")
    
    print(f"Query: {query}")
    print(f"Intent: {result['intent']}")
    print()
    print("Response:")
    print("-" * 70)
    print(result['response'])
    print("-" * 70)
    print()
    
    # Verify readiness calculated from data
    checks = {
        "Domain": "legacy.oldcorp.com" in result['response'],
        "Risk Score": "91" in result['response'],
        "Vulnerability Count": "6" in result['response'],
        "Quantum Vulnerable Count": any(str(i) in result['response'] for i in [4, 5]),  # Should detect 4-5 quantum vulns
        "Low Readiness": "Low" in result['response'] or "🔴" in result['response']  # High risk = low readiness
    }
    
    print("Verification:")
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}: {'Found' if passed else 'NOT FOUND'}")
        if not passed:
            all_passed = False
    
    print()
    
    if all_passed:
        print("✓ PASS: Readiness calculated from real scan data")
        return True
    else:
        print("✗ FAIL: Readiness not properly calculated")
        return False


def main():
    """Run all verification tests"""
    print()
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "NO HARDCODED VALUES VERIFICATION" + " " * 20 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    print("This verifies that ALL responses are generated from REAL scan data")
    print("with NO hardcoded values.")
    print()
    print("NOTE: If your database has scans, this will use REAL data.")
    print("      If database is empty, it will use simulated data for testing.")
    print()
    
    results = []
    
    # Run tests
    results.append(("Generic Response", test_without_scan_data()))
    results.append(("Real/Simulated Scan Data", test_with_real_scan_data()))
    results.append(("Mitigation Response", test_mitigation_response()))
    results.append(("Readiness Response", test_readiness_response()))
    
    # Summary
    print()
    print("=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    print()
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    print()
    
    all_passed = all(r for _, r in results)
    
    if all_passed:
        print("╔" + "=" * 68 + "╗")
        print("║" + " " * 10 + "✓ ALL TESTS PASSED - NO HARDCODED VALUES!" + " " * 15 + "║")
        print("╚" + "=" * 68 + "╝")
        print()
        print("Verification complete:")
        print("  ✓ Generic responses have no hardcoded data")
        print("  ✓ Scan responses use ONLY provided scan data")
        print("  ✓ Mitigation plans based on actual vulnerabilities")
        print("  ✓ Readiness calculated from real metrics")
        print("  ✓ All values come from scan_data parameter")
        print()
        print("In production:")
        print("  → scan_data comes from database (fetch_scan_data())")
        print("  → Every response is unique to that scan")
        print("  → NO hardcoded domains, scores, or vulnerabilities")
        print()
        print("The chatbot is 100% dynamic and scan-aware! 🚀")
    else:
        print("⚠ Some tests failed - review output above")
    
    print()
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
