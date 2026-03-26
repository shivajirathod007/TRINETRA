"""
TRINETRA — PQC Migration Planner
Generates step-by-step migration plans per asset based on
current cryptographic configuration and detected algorithms.

Each plan references specific NIST FIPS 203/204/205 standards
and vendor-specific implementation guides.
"""

from dataclasses import dataclass, field
from typing import Optional

from core.logging import get_logger

log = get_logger(__name__)


@dataclass
class MigrationStep:
    step_number: int
    title: str
    description: str
    nist_reference: Optional[str] = None
    command_example: Optional[str] = None   # CLI/config snippet
    estimated_hours: Optional[int] = None


@dataclass
class MigrationPlan:
    asset_url: str
    asset_type: str
    current_algorithm: str
    current_key_exchange: Optional[str]
    target_algorithm: str
    target_kex: str
    migration_path: str             # "full_replacement" | "hybrid_first" | "already_safe"
    steps: list[MigrationStep]
    estimated_sprints: int
    complexity: str                 # simple | moderate | complex | critical
    estimated_hours_total: int
    immediate_action: str           # One-liner for the CISO summary
    nist_standards_applied: list[str]
    vendor_guides: list[str]
    # Sensitivity tier fields (Requirement 10)
    data_sensitivity_tier: str = "static"   # tier that drove complexity override
    tier_rationale: str = ""                # auditable explanation of complexity assignment


# ─────────────────────────────────────────────────────────────────────────────
# Migration rules — maps (algorithm pattern) to target PQC config
# ─────────────────────────────────────────────────────────────────────────────

ALGORITHM_MIGRATION_RULES = {
    "RSA": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "moderate",
        "sprints":     2,
    },
    "ECDSA": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "moderate",
        "sprints":     2,
    },
    "ECDHE": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "simple",
        "sprints":     1,
    },
    "DHE": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "simple",
        "sprints":     1,
    },
    "RS256": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "moderate",
        "sprints":     2,
    },
    "ES256": {
        "target_sig":  "ML-DSA-65",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "moderate",
        "sprints":     2,
    },
    "NTLM": {
        "target_sig":  "Kerberos with PQC extensions (pending IETF RFC)",
        "target_kex":  "ML-KEM-768",
        "nist_sig":    "NSA CNSA 2.0",
        "nist_kex":    "NIST FIPS 203",
        "complexity":  "critical",
        "sprints":     6,
    },
    "SSH-RSA": {
        "target_sig":  "ML-DSA-65 host key",
        "target_kex":  "sntrup761x25519-sha512 (hybrid PQC)",
        "nist_sig":    "NIST FIPS 204",
        "nist_kex":    "IETF draft-kampanakis-curdle-ssh-pq-ke",
        "complexity":  "moderate",
        "sprints":     2,
    },
}


class MigrationPlanner:
    """
    Generates step-by-step PQC migration plans per asset.
    Rule-based — deterministic and auditable (no AI).
    """

    def plan(
        self,
        asset_url: str,
        asset_type: str,
        current_algorithm: str,
        current_kex: Optional[str] = None,
        current_tls_version: Optional[str] = None,
        jwt_algorithm: Optional[str] = None,
        vpn_type: Optional[str] = None,
        ssh_host_key: Optional[str] = None,
        data_sensitivity_tier: str = "static",
    ) -> MigrationPlan:
        """
        Generates migration plan for a single asset.

        Priority: use worst algorithm across all detected sources.
        data_sensitivity_tier drives complexity override:
          transaction → HIGH (+ extra audit/rollback steps)
          authentication → MEDIUM
          static → LOW
        """
        # Find the applicable migration rule
        rule = self._find_rule(
            current_algorithm, current_kex, jwt_algorithm, ssh_host_key
        )

        if rule is None:
            return self._already_safe_plan(asset_url, asset_type, current_algorithm, data_sensitivity_tier)

        # Generate steps based on asset type
        steps = self._build_steps(
            asset_type=asset_type,
            current_algorithm=current_algorithm,
            current_kex=current_kex,
            current_tls_version=current_tls_version,
            jwt_algorithm=jwt_algorithm,
            vpn_type=vpn_type,
            ssh_host_key=ssh_host_key,
            rule=rule,
        )

        # ── Tier-to-complexity override ───────────────────────────────────────
        # Tier-driven complexity overrides algorithm-based complexity when higher.
        # transaction assets are never rated below HIGH regardless of algorithm.
        base_complexity = rule["complexity"]
        base_sprints = rule["sprints"]
        complexity, sprints, tier_rationale, extra_steps = self._apply_tier_override(
            base_complexity, base_sprints, data_sensitivity_tier, steps
        )
        steps = extra_steps  # may have additional steps injected for transaction tier

        total_hours = sum(s.estimated_hours or 4 for s in steps)

        plan = MigrationPlan(
            asset_url=asset_url,
            asset_type=asset_type,
            current_algorithm=current_algorithm,
            current_key_exchange=current_kex,
            target_algorithm=rule["target_sig"],
            target_kex=rule["target_kex"],
            migration_path="hybrid_first",
            steps=steps,
            estimated_sprints=sprints,
            complexity=complexity,
            estimated_hours_total=total_hours,
            immediate_action=self._immediate_action(rule, current_algorithm),
            nist_standards_applied=[rule["nist_sig"], rule["nist_kex"]],
            vendor_guides=self._vendor_guides(asset_type, vpn_type),
            data_sensitivity_tier=data_sensitivity_tier,
            tier_rationale=tier_rationale,
        )

        log.info(
            "migration_plan_generated",
            url=asset_url,
            complexity=complexity,
            sprints=sprints,
            steps=len(steps),
            tier=data_sensitivity_tier,
        )
        return plan

    def _find_rule(
        self,
        algorithm: str,
        kex: Optional[str],
        jwt_alg: Optional[str],
        ssh_key: Optional[str],
    ) -> Optional[dict]:
        """Finds the migration rule for the worst detected algorithm."""
        candidates = [algorithm, kex, jwt_alg, ssh_key]
        candidates = [c.upper() for c in candidates if c]

        # Check each candidate against rules (longest match wins)
        for rule_key in sorted(ALGORITHM_MIGRATION_RULES.keys(), key=len, reverse=True):
            for candidate in candidates:
                if rule_key.upper() in candidate or candidate.startswith(rule_key.upper()):
                    return ALGORITHM_MIGRATION_RULES[rule_key]

        return None  # Already safe or unknown

    def _build_steps(
        self,
        asset_type: str,
        current_algorithm: str,
        current_kex: Optional[str],
        current_tls_version: Optional[str],
        jwt_algorithm: Optional[str],
        vpn_type: Optional[str],
        ssh_host_key: Optional[str],
        rule: dict,
    ) -> list[MigrationStep]:
        """Builds ordered steps based on asset type."""

        if asset_type == "ssh_endpoint":
            return self._ssh_steps(rule, ssh_host_key)
        if asset_type == "vpn_gateway":
            return self._vpn_steps(rule, vpn_type)
        if asset_type == "smtp_mta":
            return self._smtp_steps(rule)
        if jwt_algorithm and "RS" in (jwt_algorithm or ""):
            return self._api_jwt_steps(rule, jwt_algorithm, current_algorithm)

        # Default: web portal / API endpoint TLS upgrade
        return self._web_tls_steps(rule, current_algorithm, current_kex, current_tls_version)

    def _web_tls_steps(
        self, rule: dict, algorithm: str, kex: Optional[str], tls_version: Optional[str]
    ) -> list[MigrationStep]:
        steps = []
        n = 1

        # Step 1: TLS version baseline
        if tls_version and tls_version not in ("TLS_1_2", "TLS_1_3"):
            steps.append(MigrationStep(
                step_number=n, title="Disable deprecated TLS versions",
                description=f"Disable {tls_version}. Enable TLS 1.3 as primary, TLS 1.2 as fallback only.",
                command_example="ssl_protocols TLSv1.2 TLSv1.3;  # nginx",
                estimated_hours=2,
            ))
            n += 1

        # Step 2: Hybrid KEX
        steps.append(MigrationStep(
            step_number=n, title="Enable hybrid PQC key exchange",
            description=(
                f"Deploy ML-KEM-768 + ECDHE hybrid key exchange ({rule['nist_kex']}). "
                "Hybrid mode maintains backward compatibility while protecting new sessions."
            ),
            nist_reference=rule["nist_kex"],
            command_example="ssl_conf_command Groups X25519MLKEM768;  # OpenSSL 3.x",
            estimated_hours=4,
        ))
        n += 1

        # Step 3: Replace certificate
        steps.append(MigrationStep(
            step_number=n, title=f"Replace {algorithm} certificate with ML-DSA-65",
            description=(
                f"Request new certificate using ML-DSA-65 signature algorithm ({rule['nist_sig']}). "
                "Use a CA that supports NIST FIPS 204 (check Let's Encrypt PQC beta or DigiCert)."
            ),
            nist_reference=rule["nist_sig"],
            estimated_hours=3,
        ))
        n += 1

        # Step 4: Harden headers
        steps.append(MigrationStep(
            step_number=n, title="Update security headers",
            description="Enable HSTS with min-age 1 year, add Certificate Transparency enforcement.",
            command_example=(
                'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";'
            ),
            estimated_hours=1,
        ))
        n += 1

        # Step 5: Verify with TRINETRA
        steps.append(MigrationStep(
            step_number=n, title="Re-scan with TRINETRA",
            description="Submit domain to TRINETRA for verification. Receive Fully Quantum Safe certificate upon passing.",
            estimated_hours=1,
        ))

        return steps

    def _api_jwt_steps(self, rule: dict, jwt_alg: str, tls_alg: str) -> list[MigrationStep]:
        return [
            MigrationStep(
                step_number=1, title=f"Replace {jwt_alg} JWT signing with ML-DSA-65",
                description=(
                    f"Update JWT signing library to use ML-DSA-65 ({rule['nist_sig']}). "
                    "For Python: use pqcrypto library. For Java: BouncyCastle 1.77+. "
                    "Deploy hybrid signing (both RS256 and ML-DSA-65) during transition."
                ),
                nist_reference=rule["nist_sig"],
                command_example="from pqcrypto.sign.mldsa65 import sign, verify",
                estimated_hours=8,
            ),
            MigrationStep(
                step_number=2, title="Update token validation middleware",
                description="Update all services that validate JWTs to accept ML-DSA-65 signatures.",
                estimated_hours=4,
            ),
            MigrationStep(
                step_number=3, title=f"Replace TLS certificate ({tls_alg} → ML-DSA-65)",
                description="Replace server certificate as per web endpoint steps.",
                nist_reference=rule["nist_sig"],
                estimated_hours=3,
            ),
            MigrationStep(
                step_number=4, title="Enable ML-KEM-768 TLS key exchange",
                description="Configure TLS layer for hybrid PQC key exchange.",
                nist_reference=rule["nist_kex"],
                estimated_hours=2,
            ),
            MigrationStep(
                step_number=5, title="Re-scan with TRINETRA",
                description="Verify all changes and receive PQC Readiness Certificate.",
                estimated_hours=1,
            ),
        ]

    def _ssh_steps(self, rule: dict, ssh_key: Optional[str]) -> list[MigrationStep]:
        return [
            MigrationStep(
                step_number=1, title=f"Generate ML-DSA-65 SSH host key",
                description=(
                    f"Replace {ssh_key or 'RSA'} host key with ML-DSA-65 ({rule['nist_sig']}). "
                    "Requires OpenSSH 9.0+ with PQC patch or liboqs integration."
                ),
                nist_reference=rule["nist_sig"],
                command_example="ssh-keygen -t mldsa65 -f /etc/ssh/ssh_host_mldsa65_key",
                estimated_hours=3,
            ),
            MigrationStep(
                step_number=2, title="Enable hybrid PQC KEX",
                description="Add sntrup761x25519-sha512 to KexAlgorithms in sshd_config.",
                command_example="KexAlgorithms sntrup761x25519-sha512@openssh.com,curve25519-sha256",
                estimated_hours=2,
            ),
            MigrationStep(
                step_number=3, title="Update client known_hosts",
                description="Distribute new host key fingerprint to all administrators. Rotate authorized_keys.",
                estimated_hours=4,
            ),
            MigrationStep(
                step_number=4, title="Re-scan with TRINETRA SSH probe",
                description="Verify host key algorithm and KEX methods are PQC-compliant.",
                estimated_hours=1,
            ),
        ]

    def _vpn_steps(self, rule: dict, vpn_type: Optional[str]) -> list[MigrationStep]:
        vendor = (vpn_type or "ssl_vpn").replace("_", " ").title()
        return [
            MigrationStep(
                step_number=1, title=f"Check {vendor} PQC support status",
                description=(
                    f"Verify {vendor} firmware version supports ML-KEM-768 ({rule['nist_kex']}). "
                    "Cisco AnyConnect: requires ASA 9.16+ or FTD 7.2+. "
                    "Fortinet: FortiOS 7.4+ with PQC license. "
                    "Palo Alto: PAN-OS 11.1+."
                ),
                estimated_hours=4,
            ),
            MigrationStep(
                step_number=2, title="Update VPN gateway firmware",
                description="Apply vendor PQC firmware update. Schedule maintenance window.",
                estimated_hours=8,
            ),
            MigrationStep(
                step_number=3, title="Enable hybrid PQC cipher suite on VPN",
                description=f"Configure ML-KEM-768 + ECDHE hybrid mode ({rule['nist_kex']}).",
                nist_reference=rule["nist_kex"],
                estimated_hours=4,
            ),
            MigrationStep(
                step_number=4, title="Replace VPN gateway TLS certificate",
                description=f"Issue ML-DSA-65 certificate for VPN gateway endpoint ({rule['nist_sig']}).",
                nist_reference=rule["nist_sig"],
                estimated_hours=3,
            ),
            MigrationStep(
                step_number=5, title="Update VPN client configurations",
                description="Push updated VPN client profiles with PQC cipher preferences.",
                estimated_hours=4,
            ),
        ]

    def _smtp_steps(self, rule: dict) -> list[MigrationStep]:
        return [
            MigrationStep(
                step_number=1, title="Upgrade MTA software",
                description="Update Postfix to 3.8+ or Exim to 4.97+ for PQC TLS support.",
                command_example="apt-get upgrade postfix",
                estimated_hours=4,
            ),
            MigrationStep(
                step_number=2, title="Configure PQC cipher suites for SMTP TLS",
                description=f"Enable ML-KEM-768 KEX ({rule['nist_kex']}) in Postfix TLS config.",
                nist_reference=rule["nist_kex"],
                command_example="smtp_tls_ciphers = PQ+ECDHE:ECDHE:HIGH:!aNULL",
                estimated_hours=3,
            ),
            MigrationStep(
                step_number=3, title="Implement MTA-STS policy",
                description="Deploy MTA-STS to prevent TLS downgrade attacks on email transport.",
                estimated_hours=2,
            ),
        ]

    def _apply_tier_override(
        self,
        base_complexity: str,
        base_sprints: int,
        data_sensitivity_tier: str,
        steps: list[MigrationStep],
    ) -> tuple[str, int, str, list[MigrationStep]]:
        """
        Applies tier-to-complexity override table.
        Returns (complexity, sprints, tier_rationale, updated_steps).

        transaction → HIGH (overrides if base is lower; adds 3 extra steps)
        authentication → MEDIUM (overrides if base is simple)
        static → LOW (no override — algorithm-based complexity stands)
        """
        _complexity_rank = {"simple": 0, "moderate": 1, "complex": 2, "critical": 3}
        _tier_complexity = {
            "transaction":    ("complex", 3),
            "authentication": ("moderate", 2),
            "static":         ("simple", 1),
        }

        tier_complexity, tier_sprints = _tier_complexity.get(
            data_sensitivity_tier.lower(), ("simple", 1)
        )

        # Override only when tier-driven complexity is higher
        base_rank = _complexity_rank.get(base_complexity, 1)
        tier_rank = _complexity_rank.get(tier_complexity, 0)

        if tier_rank > base_rank:
            final_complexity = tier_complexity
            final_sprints = max(base_sprints, tier_sprints)
        else:
            final_complexity = base_complexity
            final_sprints = base_sprints

        # Build tier_rationale
        tier_labels = {
            "transaction": "transaction tier → HIGH complexity (RBI 7-year retention mandate)",
            "authentication": "authentication tier → MEDIUM complexity (standard migration template)",
            "static": "static tier → LOW complexity (no regulated retention obligation)",
        }
        tier_rationale = tier_labels.get(data_sensitivity_tier.lower(), "unknown tier")

        # Inject extra steps for transaction tier
        updated_steps = list(steps)
        if data_sensitivity_tier.lower() == "transaction":
            next_n = len(updated_steps) + 1
            updated_steps.append(MigrationStep(
                step_number=next_n,
                title="Encrypted transfer validation",
                description=(
                    "Verify all data-in-transit is encrypted end-to-end during migration. "
                    "Transaction data (RBI 7-year retention) must not be exposed in plaintext "
                    "at any point during the migration window."
                ),
                estimated_hours=4,
            ))
            updated_steps.append(MigrationStep(
                step_number=next_n + 1,
                title="Full audit trail requirement",
                description=(
                    "Maintain a complete, tamper-evident audit log of all migration steps "
                    "for this transaction-tier asset. Required for CAG/RBI audit compliance."
                ),
                estimated_hours=2,
            ))
            updated_steps.append(MigrationStep(
                step_number=next_n + 2,
                title="Rollback checkpoint verification",
                description=(
                    "Define and test a rollback checkpoint before each migration step. "
                    "Transaction-tier assets require a verified rollback path at every stage."
                ),
                estimated_hours=3,
            ))

        return final_complexity, final_sprints, tier_rationale, updated_steps

    def _already_safe_plan(
        self, asset_url: str, asset_type: str, algorithm: str,
        data_sensitivity_tier: str = "static",
    ) -> MigrationPlan:
        return MigrationPlan(
            asset_url=asset_url,
            asset_type=asset_type,
            current_algorithm=algorithm,
            current_key_exchange=None,
            target_algorithm=algorithm,
            target_kex="Already PQC-safe",
            migration_path="already_safe",
            steps=[
                MigrationStep(
                    step_number=1,
                    title="Monitor NIST standard updates",
                    description=(
                        "Asset already uses NIST-standardized PQC algorithms. "
                        "Subscribe to NIST PQC updates and re-scan quarterly."
                    ),
                    estimated_hours=1,
                )
            ],
            estimated_sprints=0,
            complexity="simple",
            estimated_hours_total=1,
            immediate_action="No action required. Asset is quantum-safe.",
            nist_standards_applied=["NIST FIPS 203", "NIST FIPS 204"],
            vendor_guides=[],
            data_sensitivity_tier=data_sensitivity_tier,
            tier_rationale=f"{data_sensitivity_tier} tier — asset is already PQC-safe, no complexity override needed",
        )

    def _immediate_action(self, rule: dict, algorithm: str) -> str:
        complexity = rule.get("complexity", "moderate")
        if complexity == "critical":
            return (
                f"CRITICAL: {algorithm} has no PQC migration path. "
                "Escalate to CISO. Begin vendor evaluation immediately."
            )
        return (
            f"Replace {algorithm} with {rule['target_sig']} ({rule['nist_sig']}) "
            f"and {rule['target_kex']} key exchange ({rule['nist_kex']})."
        )

    def _vendor_guides(
        self, asset_type: str, vpn_type: Optional[str]
    ) -> list[str]:
        guides = [
            "OpenSSL 3.x PQC: https://openssl-oqs.readthedocs.io",
            "BouncyCastle Java 1.77+ PQC: https://bouncycastle.org/documentation",
            "AWS KMS PQC: https://docs.aws.amazon.com/kms/pqc",
        ]
        if vpn_type == "cisco_anyconnect":
            guides.append("Cisco AnyConnect PQC: https://cisco.com/go/pqc-vpn")
        if vpn_type == "fortinet_ssl":
            guides.append("FortiGate PQC: https://docs.fortinet.com/pqc")
        if vpn_type == "palo_alto_gp":
            guides.append("Palo Alto GlobalProtect PQC: https://docs.paloaltonetworks.com/pqc")
        return guides
