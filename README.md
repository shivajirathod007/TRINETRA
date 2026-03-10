# TRINETRA - Quantum Exposure Intelligence Platform

TRINETRA is an advanced vulnerability scanner targeting public-facing bank infrastructure to detect quantum cryptographic exposure. It leverages Certificate Transparency logs, active TLS scanning, and AI-driven static analysis to issue full PQC readiness certificates and CycloneDX-compliant Cryptographic Bills of Materials (CBOM).

## Features
- **Asset Discovery:** CT log mining via crt.sh and DNS enumeration.
- **Deep Scanning:** SSLyze TLS scanning, direct certificate analysis, and edge case VPN detection.
- **AI Classification:** HuggingFace DistilBERT classification to analyze API text for legacy ciphers.
- **Analysis Engine:** Evaluates algorithms using exact weights (e.g. RSA-1024=100) and calculates "Harvest Now, Decrypt Later" transition deadlines based on the 2030 CRQC timeline.
- **Reporting:** Automatic CBOM generation and tiered certificates (QUANTUM_VULNERABLE, PQC_READY, FULLY_QUANTUM_SAFE).

## Project Setup Architecture
- **Backend:** FastAPI, Python 3.11, SQLAlchemy
- **Task Queue:** Celery + Redis
- **Database:** PostgreSQL
- **Frontend:** React 18, Vite, Recharts, Tailwind/Vanilla CSS

## Prerequisites
- Docker and docker-compose installed.

## Running the Application
1. Clone this repository and navigate to the root directory `trinetra/`.
2. Ensure Docker daemon is running.
3. Run `cp .env.example .env` and adjust variables if needed.
4. Build and start up the services:
   ```bash
   docker-compose up --build
   ```

5. Once running:
   - **Frontend UI:** Open [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs)

Enjoy utilizing TRINETRA!
