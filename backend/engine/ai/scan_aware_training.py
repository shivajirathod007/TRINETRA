"""
Scan-Aware Training: Feed actual scan results to Ollama
This creates a chatbot that understands YOUR specific scan data
"""

import json
import asyncio
import aiohttp
from typing import List, Dict
from pathlib import Path
import logging
import sys
from sqlalchemy import select

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from db.session import get_sync_session
from db.models import Scan, Asset, Certificate, Vulnerability

log = logging.getLogger(__name__)


async def fetch_scan_results_from_db():
    """Fetch real scan results from your database"""
    
    try:
        # Try to fetch from actual database
        session = next(get_sync_session())
        
        # Get recent scans with their assets
        scans = session.query(Scan).limit(10).all()
        
        scan_data = []
        for scan in scans:
            # Get assets for this scan
            assets = session.query(Asset).filter(Asset.scan_id == scan.id).all()
            
            scan_info = {
                "scan_id": scan.id,
                "domain": scan.target_domain or "unknown",
                "status": scan.status,
                "risk_score": getattr(scan, 'risk_score', 0),
                "created_at": str(scan.created_at),
                "assets": [],
                "vulnerabilities": []
            }
            
            for asset in assets:
                # Get certificates for this asset
                certs = session.query(Certificate).filter(Certificate.asset_id == asset.id).all()
                
                # Get vulnerabilities
                vulns = session.query(Vulnerability).filter(Vulnerability.asset_id == asset.id).all()
                
                asset_info = {
                    "hostname": asset.hostname,
                    "ip": asset.ip_address,
                    "port": asset.port,
                    "service": asset.service_type,
                    "certificates": [
                        {
                            "algorithm": cert.signature_algorithm,
                            "key_size": cert.key_size,
                            "expires": str(cert.not_after) if cert.not_after else None,
                            "issuer": cert.issuer
                        }
                        for cert in certs
                    ],
                    "vulnerabilities": [
                        {
                            "type": vuln.vulnerability_type,
                            "severity": vuln.severity,
                            "description": vuln.description
                        }
                        for vuln in vulns
                    ]
                }
                
                scan_info["assets"].append(asset_info)
                scan_info["vulnerabilities"].extend(asset_info["vulnerabilities"])
            
            if scan_info["assets"]:  # Only include scans with data
                scan_data.append(scan_info)
        
        session.close()
        
        if scan_data:
            log.info(f"Fetched {len(scan_data)} real scans from database")
            return scan_data
        else:
            log.warning("No scans found in database, using sample data")
            
    except Exception as e:
        log.warning(f"Could not fetch from database: {e}")
        log.info("Using sample scan data instead")
    
    # Fallback to sample data
    sample_scans = [
        {
            "scan_id": "scan-001",
            "domain": "example.com",
            "vulnerabilities": [
                {
                    "type": "RSA-2048",
                    "severity": "high",
                    "description": "Using RSA-2048 which is vulnerable to quantum attacks"
                },
                {
                    "type": "TLS 1.1",
                    "severity": "medium",
                    "description": "TLS 1.1 is deprecated and not NIST-compliant"
                }
            ],
            "certificates": [
                {
                    "algorithm": "RSA",
                    "key_size": 2048,
                    "expires": "2025-12-31"
                }
            ],
            "risk_score": 75
        },
        {
            "scan_id": "scan-002",
            "domain": "test.org",
            "vulnerabilities": [
                {
                    "type": "ECDHE",
                    "severity": "high",
                    "description": "ECDHE is vulnerable to quantum attacks"
                }
            ],
            "risk_score": 82
        }
    ]
    
    return sample_scans


def generate_scan_queries(scan_data: Dict) -> List[Dict[str, str]]:
    """Generate queries based on actual scan data"""
    
    queries = []
    domain = scan_data.get('domain', 'unknown')
    risk_score = scan_data.get('risk_score', 0)
    vulnerabilities = scan_data.get('vulnerabilities', [])
    assets = scan_data.get('assets', [])
    
    # Query 1: Overall scan analysis
    if vulnerabilities:
        vuln_summary = ", ".join([f"{v['type']} ({v['severity']})" for v in vulnerabilities[:3]])
        queries.append({
            "query": f"Analyze the security scan for {domain}. Found vulnerabilities: {vuln_summary}. Risk score: {risk_score}. What are the critical issues?",
            "context": json.dumps(scan_data, indent=2),
            "type": "scan_analysis"
        })
    
    # Query 2: Specific vulnerability explanations
    for vuln in vulnerabilities[:5]:  # Limit to 5 vulnerabilities
        queries.append({
            "query": f"Explain the {vuln['type']} vulnerability found in {domain}. Severity: {vuln['severity']}. {vuln.get('description', '')} How serious is this for quantum security?",
            "context": json.dumps(vuln, indent=2),
            "type": "vulnerability_explanation"
        })
    
    # Query 3: Mitigation steps
    if vulnerabilities:
        high_severity = [v for v in vulnerabilities if v['severity'] in ['high', 'critical']]
        if high_severity:
            vuln_list = ", ".join([v['type'] for v in high_severity[:3]])
            queries.append({
                "query": f"For {domain}, I have these high-severity vulnerabilities: {vuln_list}. What should I fix first and how?",
                "context": json.dumps(high_severity, indent=2),
                "type": "mitigation"
            })
    
    # Query 4: Certificate analysis
    for asset in assets[:3]:  # Limit to 3 assets
        if asset.get('certificates'):
            for cert in asset['certificates'][:2]:
                queries.append({
                    "query": f"Analyze this certificate for {asset['hostname']}: Algorithm: {cert.get('algorithm')}, Key size: {cert.get('key_size')}, Expires: {cert.get('expires')}. Is this quantum-safe?",
                    "context": json.dumps(cert, indent=2),
                    "type": "certificate_analysis"
                })
    
    # Query 5: Migration timeline
    queries.append({
        "query": f"For {domain} with risk score {risk_score} and {len(vulnerabilities)} vulnerabilities, what is the recommended PQC migration timeline?",
        "context": json.dumps({"domain": domain, "risk_score": risk_score, "vuln_count": len(vulnerabilities)}, indent=2),
        "type": "planning"
    })
    
    # Query 6: Readiness assessment
    queries.append({
        "query": f"Based on this scan of {domain}, how ready are we for quantum threats? Risk score: {risk_score}",
        "context": json.dumps(scan_data, indent=2),
        "type": "readiness"
    })
    
    return queries


async def generate_scan_aware_training_data(output_path: str = "scan_training_data.json"):
    """Generate training data using REAL scan results"""
    
    log.info("=" * 70)
    log.info("Scan-Aware Training Data Generation")
    log.info("=" * 70)
    log.info("")
    
    log.info("Step 1: Fetching scan results from database...")
    scans = await fetch_scan_results_from_db()
    log.info(f"✓ Found {len(scans)} scans to process")
    log.info("")
    
    training_data = []
    total_queries = 0
    
    async with aiohttp.ClientSession() as session:
        for i, scan in enumerate(scans, 1):
            log.info(f"Processing scan {i}/{len(scans)}: {scan.get('scan_id')} - {scan.get('domain')}")
            
            # Generate queries for this scan
            query_list = generate_scan_queries(scan)
            total_queries += len(query_list)
            log.info(f"  Generated {len(query_list)} queries for this scan")
            
            for j, query_data in enumerate(query_list, 1):
                try:
                    log.info(f"  Query {j}/{len(query_list)}: {query_data['query'][:60]}...")
                    
                    # Feed query WITH scan context to Ollama
                    response = await call_ollama(session, query_data['query'], query_data['context'])
                    
                    if response and len(response.strip()) > 20:
                        training_data.append({
                            "query": query_data['query'],
                            "response": response,
                            "label": classify_query_type(query_data['type']),
                            "scan_id": scan.get('scan_id'),
                            "domain": scan.get('domain'),
                            "context": query_data['context']
                        })
                        log.info(f"  ✓ Generated scan-aware example {len(training_data)}")
                    else:
                        log.warning(f"  ⚠ Empty response, skipping")
                    
                    # Small delay to avoid overwhelming Ollama
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    log.error(f"  ✗ Failed: {str(e)[:100]}")
                    continue
            
            log.info("")
    
    # Save training data
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, indent=2, ensure_ascii=False)
    
    log.info("=" * 70)
    log.info(f"✓ Saved {len(training_data)} scan-aware training examples")
    log.info(f"  Total queries attempted: {total_queries}")
    log.info(f"  Success rate: {len(training_data)/total_queries*100:.1f}%")
    log.info(f"  Output file: {output_path}")
    log.info("=" * 70)
    
    return training_data


async def call_ollama(session, query: str, context: str, max_retries: int = 3) -> str:
    """Call Ollama with scan-aware query and context"""
    url = "http://localhost:11434/api/generate"
    
    system_prompt = """You are JARSH, analyzing REAL security scan results from TRINETRA platform.

Your role:
- Analyze actual scan data provided
- Identify critical quantum-vulnerable cryptography
- Explain vulnerabilities in context of the specific domain
- Provide actionable, specific mitigation steps
- Reference NIST PQC standards
- Be precise and technical but accessible

When analyzing:
- Focus on quantum threats (RSA, ECDSA, ECDHE)
- Prioritize by severity and quantum risk
- Provide specific timelines
- Reference the actual findings"""
    
    # Combine query with context
    full_prompt = f"{system_prompt}\n\nScan Context:\n{context}\n\nUser Question: {query}\n\nAnalysis:"
    
    payload = {
        "model": "mistral:7b",
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_predict": 400
        }
    }
    
    for attempt in range(max_retries):
        try:
            timeout = aiohttp.ClientTimeout(total=120)
            async with session.post(url, json=payload, timeout=timeout) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    response_text = result.get('response', '').strip()
                    
                    if response_text:
                        return response_text
                    else:
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2)
                            continue
                else:
                    error_text = await resp.text()
                    raise Exception(f"Ollama error {resp.status}: {error_text}")
                    
        except asyncio.TimeoutError:
            if attempt < max_retries - 1:
                log.warning(f"Timeout (attempt {attempt + 1}/{max_retries}), retrying...")
                await asyncio.sleep(2)
                continue
            else:
                raise Exception("Ollama timeout after all retries")
                
        except Exception as e:
            if attempt < max_retries - 1:
                log.warning(f"Error (attempt {attempt + 1}/{max_retries}): {str(e)[:100]}")
                await asyncio.sleep(2)
                continue
            else:
                raise
    
    raise Exception("Failed to get response from Ollama")


def classify_query_type(query_type: str) -> str:
    """Map query type to training label"""
    type_mapping = {
        "scan_analysis": "scan_analysis",
        "vulnerability_explanation": "scan_analysis",
        "mitigation": "mitigation",
        "certificate_analysis": "scan_analysis",
        "planning": "readiness",
        "readiness": "readiness"
    }
    return type_mapping.get(query_type, "general")


async def main():
    """Generate scan-aware training data"""
    logging.basicConfig(level=logging.INFO)
    
    log.info("=" * 70)
    log.info("Scan-Aware Training Data Generation")
    log.info("=" * 70)
    log.info("")
    log.info("This will:")
    log.info("  1. Fetch real scan results from database")
    log.info("  2. Generate queries WITH scan context")
    log.info("  3. Feed to Ollama for analysis")
    log.info("  4. Collect responses as training data")
    log.info("  5. Train DistilBERT on scan-aware data")
    log.info("")
    
    await generate_scan_aware_training_data()
    
    log.info("")
    log.info("✓ Scan-aware training data generated!")
    log.info("")
    log.info("Next steps:")
    log.info("  1. Review: scan_training_data.json")
    log.info("  2. Train: python knowledge_distillation.py --step train --data-path scan_training_data.json")
    log.info("  3. Deploy: The chatbot will now understand YOUR scan data!")


if __name__ == "__main__":
    asyncio.run(main())
