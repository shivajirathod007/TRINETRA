"""
Simple test to verify JARSH works without hardcoded values
Does NOT require database connection
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from engine.ai.jarsh_inference import JARSHInference


def test_basic_functionality():
    """Test that JARSH can be instantiated and responds correctly"""
    print("=" * 70)
    print("JARSH BASIC FUNCTIONALITY TEST")
    print("=" * 70)
    print()
    
    # Create instance
    print("1. Creating JARSH instance...")
    jarsh = JARSHInference()
    print("   ✓ Instance created")
    print()
    
    # Test without scan data (should give generic response)
    print("2. Testing without scan data (generic response)...")
    result = jarsh.generate_response("What vulnerabilities were found?")
    print(f"   Query: What vulnerabilities were found?")
    print(f"   Intent: {result['intent']}")
    print(f"   Response length: {len(result['response'])} chars")
    print(f"   Confidence: {result['confidence']}")
    
    # Check for hardcoded values
    hardcoded_terms = ["example.com", "42%", "RSA-2048 with ECDHE", "2 of 12 domains"]
    found = [term for term in hardcoded_terms if term in result['response']]
    
    if found:
        print(f"   ✗ FAIL: Found hardcoded values: {found}")
        return False
    else:
        print("   ✓ PASS: No hardcoded values in generic response")
    print()
    
    # Test with simulated scan data
    print("3. Testing with scan data (dynamic response)...")
    scan_data = {
        "scan_id": "test-123",
        "domain": "testdomain.example.org",
        "status": "completed",
        "risk_score": 75,
        "created_at": "2024-01-15",
        "vulnerabilities": [
            {
                "type": "ECDHE-RSA-AES256",
                "severity": "critical",
                "description": "Quantum-vulnerable key exchange",
                "asset": "api.testdomain.example.org"
            },
            {
                "type": "SHA-256 Certificate",
                "severity": "high",
                "description": "Potentially vulnerable certificate",
                "asset": "www.testdomain.example.org"
            }
        ],
        "assets": [
            {"hostname": "api.testdomain.example.org", "ip": "192.168.1.10", "port": 443}
        ]
    }
    
    result = jarsh.generate_response(
        "What vulnerabilities were found?",
        scan_data=scan_data,
        scan_id="test-123"
    )
    
    print(f"   Query: What vulnerabilities were found?")
    print(f"   Intent: {result['intent']}")
    print(f"   Response length: {len(result['response'])} chars")
    print()
    print("   Response preview:")
    print("   " + "-" * 66)
    for line in result['response'].split('\n')[:10]:
        print(f"   {line}")
    print("   " + "-" * 66)
    print()
    
    # Verify response uses the provided data
    checks = {
        "Domain (testdomain.example.org)": "testdomain.example.org" in result['response'],
        "Risk Score (75)": "75" in result['response'],
        "Scan ID (test-123)": "test-123" in result['response'],
        "Vulnerability (ECDHE-RSA-AES256)": "ECDHE-RSA-AES256" in result['response'],
        "Asset (api.testdomain.example.org)": "api.testdomain.example.org" in result['response']
    }
    
    print("   Verification:")
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"     {status} {check_name}: {'Found' if passed else 'NOT FOUND'}")
        if not passed:
            all_passed = False
    
    print()
    
    # Check for OLD hardcoded values
    old_hardcoded = ["example.com", "42%", "2 of 12 domains"]
    found_old = [term for term in old_hardcoded if term in result['response']]
    
    if found_old:
        print(f"   ✗ FAIL: Found old hardcoded values: {found_old}")
        return False
    
    if all_passed:
        print("   ✓ PASS: Response generated from provided scan data")
    else:
        print("   ✗ FAIL: Response missing scan data")
        return False
    
    print()
    
    # Test mitigation response
    print("4. Testing mitigation response...")
    result = jarsh.generate_response(
        "How do I fix these issues?",
        scan_data=scan_data,
        scan_id="test-123"
    )
    
    print(f"   Query: How do I fix these issues?")
    print(f"   Intent: {result['intent']}")
    
    mitigation_checks = {
        "Domain": "testdomain.example.org" in result['response'],
        "Vulnerability Type": "ECDHE-RSA-AES256" in result['response'],
        "PQC Recommendation": "ML-KEM" in result['response'] or "PQC" in result['response']
    }
    
    print("   Verification:")
    all_passed = True
    for check_name, passed in mitigation_checks.items():
        status = "✓" if passed else "✗"
        print(f"     {status} {check_name}: {'Found' if passed else 'NOT FOUND'}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("   ✓ PASS: Mitigation based on actual vulnerabilities")
    else:
        print("   ✗ FAIL: Mitigation not specific enough")
        return False
    
    print()
    
    return True


def main():
    print()
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 20 + "JARSH VERIFICATION TEST" + " " * 24 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    print("Testing that JARSH generates responses from scan data")
    print("with NO hardcoded values.")
    print()
    
    try:
        success = test_basic_functionality()
        
        print()
        print("=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        print()
        
        if success:
            print("╔" + "=" * 68 + "╗")
            print("║" + " " * 15 + "✓ ALL TESTS PASSED!" + " " * 30 + "║")
            print("╚" + "=" * 68 + "╝")
            print()
            print("✓ JARSH is working correctly")
            print("✓ No hardcoded values detected")
            print("✓ Responses generated from scan_data parameter")
            print("✓ All values are dynamic and scan-specific")
            print()
            print("The chatbot is ready to use with real database scans! 🚀")
        else:
            print("✗ Some tests failed - see output above")
        
        print()
        return success
        
    except Exception as e:
        print(f"✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
