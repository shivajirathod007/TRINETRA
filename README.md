# TRINETRA — Quantum Exposure Intelligence Platform

> **"Find every cryptographic weakness before a quantum computer does."**

TRINETRA is an enterprise-grade post-quantum cryptography (PQC) readiness scanner built for financial institutions. It discovers every public-facing asset of a target domain, performs deep cryptographic analysis across TLS, certificates, APIs, VPNs, SSH, and email, and produces a machine-verifiable **Cryptographic Bill of Materials (CBOM)** with NIST-aligned migration plans and signed PQC readiness certificates.

Built for the **PNB Hackathon** by **Team ZeroHour**.

---

## Table of Contents

- [Why TRINETRA](#why-trinetra)
- [Architecture](#architecture)
- [Unique Selling Points (USPs)](#unique-selling-points)
- [System Components](#system-components)
- [Scan Pipeline](#scan-pipeline)
- [Scoring Formula](#scoring-formula)
- [Classification Schema](#classification-schema)
- [API Reference](#api-reference)
- [Quick Start](#quick-start)
- [Running Without Docker](#running-without-docker)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Research Basis](#research-basis)

---

## Why TRINETRA

Cryptographically-Relevant Quantum Computers (CRQCs) are projected to arrive between 2028–2037. When they do, **every RSA, ECDSA, and ECDHE-protected system becomes retroactively decryptable** — including data intercepted today (Harvest Now, Decrypt Later attacks).

Most banks have no idea:
- How many subdomains they actually have (shadow assets)
- Which ones use quantum-vulnerable cryptography
- How much time they have before their data becomes exposed
- What exactly needs to change and in what order

TRINETRA answers all four questions in a single scan.

### The Competition Gap

| Capability | Typical Tools | TRINETRA |
|---|---|---|
| Asset discovery | Known ports only | CT log mining — finds forgotten subdomains |
| TLS analysis | Preferred cipher only | All accepted ciphers — catches weak fallbacks |
| API crypto detection | Header rules | DistilBERT NLP — finds RS256 in JSON bodies |
| Scoring formula | Arbitrary numbers | QARS formula (MDPI 2025) with Mosca's theorem |
| Output | Score only | CBOM + migration plan + signed certificate |
| VPN detection | None | Cisco AnyConnect, Fortinet, Palo Alto, OpenVPN |
| SSH analysis | None | NIST SP 1800-38B compliant host key + KEX audit |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              L1 — INPUT                                      │
│              Domain / IP / URL  ──────  REST API / Batch CSV                │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                           L2 — DISCOVERY                                     │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  CT Log Miner    │  │  DNS Resolver    │  │  Port Scanner            │   │
│  │  crt.sh · RFC    │  │  dnspython       │  │  socket · 443/8443/22    │   │
│  │  6962 · 4 source │  │  A/CNAME/MX      │  │  /25/587/1194            │   │
│  │  fallback chain  │  │  liveness check  │  │                          │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Asset Classifier — web_portal | api_endpoint | vpn_gateway |        │    │
│  │                     ssh_endpoint | smtp_mta | staging | shadow_asset │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│         Celery chord (fan-out) — up to 50 assets scanned in parallel         │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                         L3 — DEEP SCAN (5 workers per asset)                 │
│                                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │  TLS Scanner   │  │  Cert Analyzer │  │  VPN Detector  │                 │
│  │  SSLyze        │  │  pyca/crypto   │  │  banner + path │                 │
│  │  All versions  │  │  Full chain    │  │  fingerprint   │                 │
│  │  All ciphers   │  │  OCSP/SCT/SAN  │  │  Cisco/Forti/  │                 │
│  │  ROBOT/BEAST   │  │  Expiry/issuer │  │  PaloAlto/OVPN │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│                                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────────┐ │
│  │  API Inspector │  │  SSH Probe     │  │  AI Crypto Classifier          │ │
│  │  httpx async   │  │  paramiko      │  │  DistilBERT fine-tuned         │ │
│  │  JWT/OAuth/    │  │  Host key algo │  │  Catches RS256 in JSON bodies  │ │
│  │  NTLM/CORS/    │  │  KEX methods   │  │  NTLM in WWW-Authenticate      │ │
│  │  GraphQL       │  │  Server banner │  │  Custom auth headers           │ │
│  └────────────────┘  └────────────────┘  │  LLM fallback (conf < 0.60)   │ │
│                                           └────────────────────────────────┘ │
│                                                                               │
│              Per-asset raw result aggregator — PostgreSQL scan store          │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                          L4 — ANALYSIS                                       │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │  CBOM Generator      │  │  HNDL Engine         │  │  Exposure Scorer │   │
│  │  CycloneDX 1.6 JSON  │  │  Mosca's theorem     │  │  QARS formula    │   │
│  │  IBM CBOM spec       │  │  Deadline per asset  │  │  0–100 per asset │   │
│  │  OWASP compatible    │  │  CRQC timeline       │  │  CARAF framework │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  PQC Migration Planner           │  │  Certificate Issuer              │  │
│  │  NIST SP 1800-38B step map       │  │  HMAC-signed JSON                │  │
│  │  FIPS 203/204/205 references     │  │  3 tiers: Vulnerable/Ready/Safe  │  │
│  │  Vendor-specific guidance        │  │  Tamper-evident · RBI-ready      │  │
│  └──────────────────────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                           L5 — OUTPUT                                        │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Risk Dashboard  │  │  CBOM Export     │  │  PQC Certificates        │   │
│  │  React 18        │  │  JSON · XML · PDF│  │  Per-asset signed JSON   │   │
│  │  Recharts        │  │  GRC-compatible  │  │  Regulator-presentable   │   │
│  │  Color-coded map │  │  CycloneDX 1.6   │  │  TRN-YYYY-XXXX IDs       │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
│                                                                               │
│     FastAPI REST — /scan · /cbom · /certificates · /dashboard · /assets      │
│     Docker Compose — PostgreSQL 16 · Redis 7 · Celery workers · Flower       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Unique Selling Points

### USP 1 — CT Log Mining (Shadow Asset Discovery)
Most scanners only check known ports on known IPs. TRINETRA queries **Certificate Transparency logs** (crt.sh, Certspotter, HackerTarget) to find every subdomain a bank has ever registered — including ones decommissioned in 2018 that still have live DNS records.

> *Scheitle et al., ACM IMC 2018: CT log data reveals 30–40% more subdomains than DNS enumeration alone.*

### USP 2 — AI Crypto Pattern Classifier
The deterministic TLS scanner checks what it knows about. The **DistilBERT NLP classifier** reads raw HTTP responses the way a human security analyst would — finding cryptographic references buried in:
- `"alg": "RS256"` inside JSON response bodies
- `sha256WithRSAEncryption` inside error messages
- `WWW-Authenticate: NTLM` in response headers
- `"x-signing-algorithm": "rsa-sha256"` in custom proprietary headers
- RSA public key material accidentally exposed in debug endpoints

When DistilBERT confidence < 0.60, it escalates to Claude (Anthropic) for LLM-based analysis.

> *Sanh et al. 2019 (DistilBERT): 40% smaller than BERT with 97% accuracy. Desai & Durrett ACL 2020: confidence threshold calibration.*

### USP 3 — HNDL Engine with Mosca's Theorem
Every asset gets a concrete migration deadline, not just a score. The **HNDL (Harvest Now, Decrypt Later) Engine** implements Mosca's inequality:

```
If (data shelf life X) + (migration time Y) > (years to CRQC Z) → Act NOW
```

Configurable CRQC scenarios: pessimistic (2028), moderate (2032), optimistic (2037).

### USP 4 — QARS Scoring Formula
```
Score = (Algorithm Risk × 40%) + (HNDL Timeline × 40%) + (Public Exposure × 20%)
```

Every factor has a calibrated lookup table. The weighted average produces a 0–100 score with a risk tier. Unlike competitor tools with arbitrary numbers, TRINETRA's formula is published and reproducible.

> *QARS paper: MDPI Electronics, August 2025. CARAF: Oxford Cybersecurity, 2021.*

### USP 5 — Data Sensitivity Tier
Financial data has different shelf lives. A transaction record needs protection for 7 years (regulatory retention). An authentication token expires in hours. TRINETRA adjusts the HNDL urgency score based on the **data sensitivity tier** of each asset:

| Tier | Shelf Life | Example |
|------|-----------|---------|
| `transaction` | 7 years | Payment APIs, core banking |
| `authentication` | 1 year | Login endpoints, OAuth servers |
| `static` | 0 years | Public web portals |

### USP 6 — VPN Detection
Most teams skip VPN gateways entirely. TRINETRA fingerprints and scans:
- Cisco AnyConnect (`/+CSCOE+/logon.html`)
- Fortinet FortiGate SSL VPN (`/remote/login`)
- Palo Alto GlobalProtect (`/global-protect/login.esp`)
- OpenVPN (port 1194 UDP banner)

VPN gateways typically have the worst scores — managed by network teams, running vendor defaults from 2015.

### USP 7 — SSH Host Key Audit (NIST SP 1800-38B)
Most teams don't touch SSH. TRINETRA extracts host key algorithm (ssh-rsa vs Ed25519), KEX methods (diffie-hellman-group14 vs curve25519 vs mlkem768), and server version string — the gap in NIST SP 1800-38B that most competing tools miss.

### USP 8 — Signed PQC Readiness Certificates
Every scanned asset gets a **TRINETRA CERTIFIED** HMAC-signed JSON certificate:
- `QUANTUM_VULNERABLE` — Red — classical crypto only
- `PQC_READY` — Amber — hybrid mode (classical + NIST PQC)
- `FULLY_QUANTUM_SAFE` — Green — 100% NIST PQC, no classical fallback

Certificates contain asset URL, scan date, detected algorithm, NIST standard reference, validity period, and tamper-evident signature. Presentable to RBI auditors directly.

---

## System Components

### Backend (`backend/`)

| Module | Purpose |
|--------|---------|
| `api/` | FastAPI REST layer — 202 Accepted async pattern |
| `engine/discovery/` | CT log mining, DNS resolution, port scanning, asset classification |
| `engine/scanners/` | TLS (SSLyze), certificate (pyca), VPN, API (httpx), SSH (paramiko), SMTP |
| `engine/ai/` | DistilBERT classifier + LLM fallback (Claude) |
| `engine/analysis/` | CBOM generator, HNDL engine, exposure scorer, migration planner |
| `engine/output/` | Certificate issuer, report generator |
| `workers/` | Celery tasks — orchestrator, scan tasks, AI tasks, analysis tasks |
| `db/` | SQLAlchemy models, repository layer, Alembic migrations |
| `core/` | Config, constants (all scoring weights), security (HMAC signing) |

### Frontend (`frontend/`)

| Page | Purpose |
|------|---------|
| Dashboard | Organization risk score, asset map, risk distribution charts |
| Asset Inventory | Full asset list with filters, sensitivity tier override |
| Asset Discovery | CT log topology graph, domain scan initiation |
| CBOM | Operations center — PQC certificates, cryptographic asset map |
| Posture of PQC | Migration readiness timeline |
| Cyber Rating | QARS score breakdown per asset |
| Scan History | Historical scan comparison |

### Infrastructure

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | postgres:16-alpine | Scan results, assets, certificates |
| `redis` | redis:7-alpine | Celery task broker |
| `api` | Custom (FastAPI) | REST API, 202 async scan pattern |
| `worker` | Custom (Celery) | Scan pipeline execution (2 replicas) |
| `flower` | Custom (Celery Flower) | Task queue monitoring at :5555 |
| `frontend` | Custom (Vite/React) | UI at :3000 |

---

## Scan Pipeline

```
POST /api/v1/scans/  →  scan_id returned immediately (202 Accepted)
         │
         ▼
  orchestrator.run_full_scan (Celery task)
         │
         ├── CT Log Mining (crt.sh → certspotter → hackertarget → root fallback)
         │
         ├── DNS Resolution (live/dead classification, shadow asset detection)
         │
         ├── Port Scanning (443, 8443, 4433, 10443, 80, 22, 25, 587, 1194)
         │
         ├── Asset Classification (web_portal | api_endpoint | vpn_gateway | ...)
         │
         └── Celery chord fan-out (up to 50 parallel asset scans)
                  │
                  ├── TLS Scanner (SSLyze — all versions, all ciphers, ROBOT/BEAST)
                  ├── Certificate Analyzer (pyca — full chain, OCSP, SCT, SAN)
                  ├── API Inspector (httpx — JWT, OAuth, NTLM, CORS, GraphQL)
                  ├── VPN Detector (banner fingerprinting)
                  ├── SSH Probe (paramiko — host key, KEX methods)
                  ├── SMTP TLS Scanner (STARTTLS negotiation)
                  └── AI Classifier (DistilBERT → LLM fallback)
                           │
                           ▼
                  Exposure Scorer (QARS formula)
                  HNDL Engine (Mosca's theorem)
                  Migration Planner (NIST SP 1800-38B)
                  CBOM Generator (CycloneDX 1.6)
                  Certificate Issuer (HMAC-signed)
                           │
                           ▼
                  PostgreSQL (scan results persisted)
                           │
                           ▼
                  Chord callback → finalize_scan → organization score
```

---

## Scoring Formula

### QARS (Quantum-Adjusted Risk Score)

```
Score = (Algorithm Risk × 0.40) + (HNDL Timeline × 0.40) + (Public Exposure × 0.20)
```

**Algorithm Risk (0–100):**

| Algorithm | Risk | Reason |
|-----------|------|--------|
| RSA-2048 | 90 | Shor's algorithm — broken by CRQC |
| ECDSA-256 | 85 | Elliptic curve — quantum-vulnerable |
| ECDHE | 85 | Key exchange — quantum-vulnerable |
| NTLM | 95 | No PQC migration path |
| ML-KEM-768 | 2 | NIST FIPS 203 — fully quantum-safe |
| ML-DSA-65 | 2 | NIST FIPS 204 — fully quantum-safe |
| AES-256 | 10 | Grover: 128-bit effective — still safe |

**HNDL Timeline (0–100):** Based on Mosca's inequality. Adjusted by data sensitivity tier.

**Public Exposure (0–100):** `web_portal=100`, `vpn_gateway=85`, `shadow_asset=90`, `ssh_endpoint=70`

**Risk Tiers:**

| Score | Tier | Action |
|-------|------|--------|
| 80–100 | CRITICAL | Immediate migration required |
| 60–79 | HIGH | Urgent — within 6 months |
| 40–59 | MEDIUM | Planned — within 18 months |
| 20–39 | LOW | Monitor — within 3 years |
| 0–19 | SAFE | No action required |

---

## Classification Schema

### PQC Certificate Tiers

| Tier | Color | Condition |
|------|-------|-----------|
| `QUANTUM_VULNERABLE` | 🔴 Red | RSA, ECDSA, ECDHE, DHE, NTLM detected |
| `PQC_READY` | 🟡 Amber | Hybrid mode: X25519Kyber768, P256-ML-KEM-768 |
| `FULLY_QUANTUM_SAFE` | 🟢 Green | Pure NIST PQC: ML-KEM-768, ML-DSA-65, SPHINCS+ |

### Asset Types

| Type | Description |
|------|-------------|
| `web_portal` | Customer-facing HTTPS site |
| `api_endpoint` | REST/GraphQL API |
| `vpn_gateway` | SSL VPN (Cisco/Fortinet/Palo Alto/OpenVPN) |
| `ssh_endpoint` | SSH management access |
| `smtp_mta` | Mail transfer agent |
| `mobile_backend` | Mobile app backend |
| `staging` | Staging/UAT environment |
| `shadow_asset` | Not in bank's known asset list |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/scans/` | Initiate scan (returns 202 + scan_id) |
| `GET` | `/api/v1/scans/{scan_id}` | Poll scan status + progress |
| `GET` | `/api/v1/scans/` | List recent scans |
| `GET` | `/api/v1/scans/{scan_id}/results` | Full scan results JSON |
| `POST` | `/api/v1/scans/{scan_id}/cancel` | Cancel running scan |
| `GET` | `/api/v1/assets/` | List assets (filter by scan_id or domain) |
| `GET` | `/api/v1/assets/{asset_id}` | Full asset detail |
| `PATCH` | `/api/v1/assets/{asset_id}/sensitivity-tier` | Override data sensitivity tier |
| `GET` | `/api/v1/cbom/` | CBOM summary (by scan_id or domain) |
| `GET` | `/api/v1/cbom/{scan_id}` | Full CycloneDX 1.6 CBOM |
| `GET` | `/api/v1/certificates/` | List PQC certificates |
| `GET` | `/api/v1/certificates/scan/{scan_id}` | Certificates for a scan |
| `GET` | `/api/v1/certificates/{cert_id}` | Single certificate detail |
| `GET` | `/api/v1/dashboard/{domain}` | Aggregated risk stats for domain |
| `GET` | `/api/v1/health` | API health check |
| `GET` | `/api/v1/health/queue` | Redis + Celery connectivity check |

Full interactive docs: **http://localhost:8000/docs**

---

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- 4GB RAM minimum (DistilBERT model loads ~67MB into memory)
- Ports 3000, 8000, 5432, 6379, 5555 available

### 1. Clone and configure

```bash
git clone <repo-url>
cd trinetra
cp .env.example .env
```

Edit `.env` — at minimum set `ANTHROPIC_API_KEY` for LLM fallback (optional but recommended).

### 2. Start all services

```bash
docker compose up --build -d
```

This starts: PostgreSQL, Redis, FastAPI backend, 2× Celery workers, Flower monitor, React frontend.

### 3. Verify everything is running

```bash
# Check all containers
docker compose ps

# Check API health
curl http://localhost:8000/health

# Check Redis + Celery connectivity
curl http://localhost:8000/api/v1/health/queue
```

### 4. Access the application

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Celery Flower Monitor | http://localhost:5555 |

### 5. Run your first scan

1. Open http://localhost:3000
2. Navigate to **Asset Discovery**
3. Enter a domain (e.g. `pnb.in` or `cloudflare.com`)
4. Click **Scan Now**
5. Watch real-time progress on the scan page
6. Once complete, navigate to **CBOM** to see results

### Testing PQC Detection

To verify PQC_READY detection works, scan `cloudflare.com` — Cloudflare has deployed X25519Kyber768 hybrid TLS on all edge servers since 2023.

---

## Running Without Docker

### 1. Start dependencies

```bash
# PostgreSQL
pg_ctl start  # or: brew services start postgresql

# Redis
redis-server  # or: brew services start redis
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start API
uvicorn api.main:app --reload --port 8000
```

### 3. Celery Worker (required for scans)

```bash
cd backend
celery -A workers.celery_app worker \
  -Q scans,discovery,analysis \
  --loglevel=info \
  --concurrency=4
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL URL |
| `DATABASE_URL_SYNC` | `postgresql://...` | Sync PostgreSQL URL (Celery) |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis broker URL |
| `ANTHROPIC_API_KEY` | — | Claude API key for LLM fallback |
| `APP_ENV` | `development` | `development` or `production` |
| `CRQC_PESSIMISTIC_YEAR` | `2028` | Pessimistic CRQC arrival estimate |
| `CRQC_MODERATE_YEAR` | `2032` | Moderate CRQC arrival estimate |
| `CRQC_OPTIMISTIC_YEAR` | `2037` | Optimistic CRQC arrival estimate |
| `SECRET_KEY` | — | HMAC key for certificate signing |
| `CRTSH_BASE_URL` | `https://crt.sh` | CT log API base URL |
| `CT_LOG_TIMEOUT_SECONDS` | `30` | Timeout for CT log queries |
| `DNS_CONCURRENCY` | `20` | Parallel DNS resolution limit |
| `PORT_SCAN_TIMEOUT` | `3` | TCP connect timeout (seconds) |

---

## Troubleshooting

### Scans stay "Queued"

```bash
# Check Redis is reachable
curl http://localhost:8000/api/v1/health/queue

# Check worker logs
docker compose logs worker --tail=50

# Restart worker
docker compose restart worker
```

### Scans get stuck at X%

- **0 live hosts found**: The target domain's subdomains resolved but nothing is listening on scanned ports. This is normal for domains with aggressive firewalls (e.g. cloudflare.com blocks port scanners). The scan will eventually time out and complete.
- **Stuck at 20%**: Port scanning completed but asset classification found 0 HTTPS endpoints. Check if the domain uses non-standard ports.
- **Worker crash**: Check `docker compose logs worker` for Python exceptions.

### AI Classifier not working

The DistilBERT model weights are loaded from `backend/engine/ai/loaded_model/`. If the model files are missing, the classifier falls back to LLM (requires `ANTHROPIC_API_KEY`). If neither is available, the AI step is skipped and only deterministic scanners run.

### Database connection errors

```bash
# Check PostgreSQL is healthy
docker compose ps postgres

# Run migrations manually
docker compose exec api alembic upgrade head
```

---

## Research Basis

| Research | Application in TRINETRA |
|----------|------------------------|
| Mosca (2018) — Mosca's inequality | HNDL deadline calculation per asset |
| NIST IR 8547 (2024) | Algorithm security level weights |
| NSA CNSA 2.0 (2022) | Algorithm phase-out schedule |
| NIST FIPS 203/204/205 (August 2024) | PQC algorithm classification |
| NIST SP 1800-38B | Migration step mapping |
| QARS paper — MDPI Electronics (August 2025) | Multi-factor weighted scoring formula |
| CARAF — Oxford Cybersecurity (2021) | Crypto agility risk framework |
| Sanh et al. (2019) — DistilBERT | AI classifier model selection |
| Desai & Durrett — ACL 2020 | Confidence threshold (0.60) for LLM fallback |
| Scheitle et al. — ACM IMC 2018 | CT log mining methodology |
| Böck et al. — USENIX Security 2018 | ROBOT vulnerability detection |
| IBM Research CBOM spec (Vassilev et al., 2022) | CBOM schema design |
| OWASP CycloneDX 1.6 | CBOM output format |
| Europol Quantum Safe Financial Forum (Jan 2026) | Financial sector scoring methodology |

---

## Team

**Team ZeroHour** — Built for the PNB Quantum Security Hackathon

---

*TRINETRA — Sanskrit for "three-eyed" — sees what others miss.*
