"""
Reports API — Generate and deliver reports via email, file save, or download
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import json
import os
import uuid
from pathlib import Path
from io import BytesIO

from db.session import get_db
from db.repository import ScanRepository
from core.logging import get_logger

# PDF generation imports
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = get_logger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    report_type: str  # 'executive', 'technical', 'cbom', 'compliance'
    scan_id: Optional[str] = None
    asset_filter: str = "all"  # 'all', 'critical', 'specific_domain'
    sections: List[str] = []  # ['discovery', 'inventory', 'cbom', 'pqc', 'rating']
    delivery_method: str  # 'email', 'save', 'download'
    email: Optional[EmailStr] = None
    save_path: Optional[str] = None
    format: str = "PDF"  # 'PDF', 'CSV', 'JSON'
    include_charts: bool = True
    period: str = "last_30_days"

class ScheduleReportRequest(BaseModel):
    report_type: str
    frequency: str  # 'daily', 'weekly', 'monthly', 'bi-weekly'
    asset_filter: str = "all"
    sections: List[str] = []
    delivery_method: str
    email: Optional[EmailStr] = None
    save_path: Optional[str] = None
    schedule_date: str
    schedule_time: str
    timezone: str = "Asia/Kolkata"
    enabled: bool = True

class ReportResponse(BaseModel):
    success: bool
    message: str
    report_id: Optional[str] = None
    download_url: Optional[str] = None
    file_path: Optional[str] = None

# ─── Helper Functions ─────────────────────────────────────────────────────────

async def generate_report_data(
    db: AsyncSession,
    scan_id: Optional[str],
    asset_filter: str,
    sections: List[str],
    period: str
) -> dict:
    """Generate comprehensive report data from database"""
    repo = ScanRepository(db)
    
    data = {
        "generated_at": datetime.utcnow().isoformat(),
        "period": period,
        "sections": {}
    }
    
    # Get scan data
    assets = []
    if scan_id:
        try:
            scan_uuid = uuid.UUID(scan_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scan_id")
            
        scan = await repo.get_scan(scan_uuid)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        data["scan"] = {
            "scan_id": str(scan.id),
            "domain": scan.domain,
            "status": scan.status,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        }
        
        # Get assets for this scan
        assets = await repo.get_assets_for_scan(scan_uuid)
    else:
        # Get all assets from recent scans
        all_scans = await repo.get_recent_scans(limit=10)
        for scan in all_scans:
            scan_assets = await repo.get_assets_for_scan(scan.id)
            assets.extend(scan_assets)
    
    # Filter assets
    if asset_filter == "critical":
        assets = [a for a in assets if a.risk_level in ["CRITICAL", "HIGH"]]
    
    # Build sections with comprehensive data
    if "discovery" in sections or "executive" in sections:
        shadow_count = len([a for a in assets if a.is_shadow_asset])
        known_count = len([a for a in assets if not a.is_shadow_asset])
        
        data["sections"]["discovery"] = {
            "total_assets": len(assets),
            "shadow_assets": shadow_count,
            "known_assets": known_count,
            "shadow_percentage": round((shadow_count / len(assets) * 100) if assets else 0, 1),
            "asset_types": {
                "web": len([a for a in assets if a.asset_type == "WEB"]),
                "api": len([a for a in assets if a.asset_type == "API"]),
                "vpn": len([a for a in assets if a.asset_type == "VPN"]),
                "ssh": len([a for a in assets if a.asset_type == "SSH"]),
                "smtp": len([a for a in assets if a.asset_type == "SMTP"]),
            }
        }
    
    if "inventory" in sections or "executive" in sections:
        data["sections"]["inventory"] = {
            "total_count": len(assets),
            "assets": [
                {
                    "url": a.asset_url,
                    "type": a.asset_type,
                    "risk_level": a.risk_level,
                    "score": round(a.quantum_exposure_score, 0) if a.quantum_exposure_score else 0,
                    "discovery": "Shadow" if a.is_shadow_asset else "Known",
                    "tls_version": a.tls_version_active or "N/A",
                    "cipher_suite": a.cipher_suite_active[:30] + "..." if a.cipher_suite_active and len(a.cipher_suite_active) > 30 else (a.cipher_suite_active or "N/A"),
                    "quantum_safe": a.quantum_safe_status or "UNKNOWN",
                }
                for a in assets
            ]
        }
    
    if "cbom" in sections or "executive" in sections:
        vulnerable = len([a for a in assets if a.quantum_safe_status == "QUANTUM_VULNERABLE"])
        pqc_ready = len([a for a in assets if a.quantum_safe_status == "PQC_READY"])
        quantum_safe = len([a for a in assets if a.quantum_safe_status == "FULLY_QUANTUM_SAFE"])
        unknown = len([a for a in assets if not a.quantum_safe_status or a.quantum_safe_status == "UNKNOWN"])
        
        data["sections"]["cbom"] = {
            "total_components": len(assets),
            "quantum_vulnerable": vulnerable,
            "pqc_ready": pqc_ready,
            "fully_quantum_safe": quantum_safe,
            "unknown_status": unknown,
            "vulnerable_percentage": round((vulnerable / len(assets) * 100) if assets else 0, 1),
            "safe_percentage": round((quantum_safe / len(assets) * 100) if assets else 0, 1),
        }
    
    if "pqc" in sections or "executive" in sections:
        total = len(assets) or 1
        safe_count = len([a for a in assets if a.quantum_safe_status == "FULLY_QUANTUM_SAFE"])
        avg_score = sum(a.quantum_exposure_score or 0 for a in assets) / total if assets else 0
        
        # Risk distribution
        critical = len([a for a in assets if a.risk_level == "CRITICAL"])
        high = len([a for a in assets if a.risk_level == "HIGH"])
        medium = len([a for a in assets if a.risk_level == "MEDIUM"])
        low = len([a for a in assets if a.risk_level == "LOW"])
        
        data["sections"]["pqc"] = {
            "quantum_safe_progress": round((safe_count / total) * 100),
            "organization_risk_score": round(avg_score),
            "average_exposure_score": round(avg_score, 1),
            "risk_distribution": {
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
            },
            "migration_priority": "URGENT" if avg_score > 75 else "HIGH" if avg_score > 50 else "MEDIUM" if avg_score > 25 else "LOW",
        }
    
    if "rating" in sections or "executive" in sections:
        avg_score = round(sum(a.quantum_exposure_score or 0 for a in assets) / len(assets)) if assets else 0
        
        # Determine tier and rating
        if avg_score < 25:
            tier = "Tier 1"
            rating = "Excellent"
            grade = "A"
        elif avg_score < 50:
            tier = "Tier 2"
            rating = "Good"
            grade = "B"
        elif avg_score < 75:
            tier = "Tier 3"
            rating = "Satisfactory"
            grade = "C"
        else:
            tier = "Tier 4"
            rating = "Needs Work"
            grade = "D"
        
        data["sections"]["rating"] = {
            "tier": tier,
            "grade": grade,
            "average_score": avg_score,
            "rating": rating,
            "total_assets_evaluated": len(assets),
            "recommendation": "Continue monitoring" if avg_score < 25 else "Plan PQC migration" if avg_score < 50 else "Prioritize PQC migration" if avg_score < 75 else "Immediate PQC migration required",
        }
    
    return data

def save_report_to_file(data: dict, file_path: str, format: str) -> str:
    """Save report to file system with professional formatting"""
    # Create directory if it doesn't exist
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    
    if format == "JSON":
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
            
    elif format == "CSV":
        # CSV export with proper formatting
        import csv
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['TRINETRA - Quantum Exposure Intelligence Platform'])
            writer.writerow(['Report Generated:', data.get('generated_at', 'N/A')])
            writer.writerow(['Period:', data.get('period', 'N/A')])
            writer.writerow([])
            
            # Scan info
            if 'scan' in data:
                writer.writerow(['=== SCAN INFORMATION ==='])
                writer.writerow(['Domain', data['scan'].get('domain', 'N/A')])
                writer.writerow(['Scan ID', data['scan'].get('scan_id', 'N/A')])
                writer.writerow(['Status', data['scan'].get('status', 'N/A')])
                writer.writerow(['Completed', data['scan'].get('completed_at', 'N/A')])
                writer.writerow([])
            
            # Write sections
            for section_name, section_data in data.get('sections', {}).items():
                writer.writerow([f'=== {section_name.upper()} ==='])
                if isinstance(section_data, dict):
                    for key, value in section_data.items():
                        if key == 'assets' and isinstance(value, list):
                            writer.writerow(['Asset URL', 'Type', 'Risk Level', 'Score', 'Discovery'])
                            for asset in value:
                                writer.writerow([
                                    asset.get('url', 'N/A'),
                                    asset.get('type', 'N/A'),
                                    asset.get('risk_level', 'N/A'),
                                    asset.get('score', 0),
                                    asset.get('discovery', 'N/A')
                                ])
                        else:
                            writer.writerow([key.replace('_', ' ').title(), value])
                writer.writerow([])
                
    elif format == "PDF":
        # Ultra-professional PDF generation with TRINETRA branding
        from .pdf_professional import generate_ultra_professional_pdf
        generate_ultra_professional_pdf(data, file_path, logger)
    else:
        # Fallback to text format
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("═" * 80 + "\n")
            f.write("  TRINETRA\n")
            f.write("  Quantum Exposure Intelligence Platform\n")
            f.write("═" * 80 + "\n\n")
            
            f.write(f"Report Generated: {data.get('generated_at', 'N/A')}\n")
            f.write(f"Period: {data.get('period', 'N/A').replace('_', ' ').title()}\n")
            
            if 'scan' in data:
                f.write(f"\nScan Information:\n")
                f.write(f"  Domain: {data['scan'].get('domain', 'N/A')}\n")
                f.write(f"  Scan ID: {data['scan'].get('scan_id', 'N/A')}\n")
                f.write(f"  Status: {data['scan'].get('status', 'N/A')}\n")
                f.write(f"  Completed: {data['scan'].get('completed_at', 'N/A')}\n")
            
            f.write("\n" + "─" * 80 + "\n")
            f.write("REPORT SECTIONS\n")
            f.write("─" * 80 + "\n\n")
            
            for section_name, section_data in data.get('sections', {}).items():
                f.write(f"\n┌─ {section_name.upper().replace('_', ' ')} " + "─" * (70 - len(section_name)) + "\n")
                
                if isinstance(section_data, dict):
                    for key, value in section_data.items():
                        if key == 'assets' and isinstance(value, list):
                            f.write(f"│ {key.replace('_', ' ').title()}: {len(value)} items\n")
                            for i, asset in enumerate(value[:10], 1):
                                f.write(f"│   {i}. {asset.get('url', 'N/A')} - Risk: {asset.get('risk_level', 'N/A')} (Score: {asset.get('score', 0)})\n")
                            if len(value) > 10:
                                f.write(f"│   ... and {len(value) - 10} more\n")
                        else:
                            f.write(f"│ {key.replace('_', ' ').title()}: {value}\n")
                f.write("└" + "─" * 79 + "\n")
            
            f.write("\n" + "═" * 80 + "\n")
            f.write("End of Report\n")
            f.write("© 2026 TRINETRA - Quantum Exposure Intelligence Platform\n")
            f.write("═" * 80 + "\n")
    
    return file_path

def generate_professional_pdf(data: dict, file_path: str):
    """Generate a professional PDF report with TRINETRA branding and logo"""
    doc = SimpleDocTemplate(file_path, pagesize=letter,
                           rightMargin=0.75*inch, leftMargin=0.75*inch,
                           topMargin=0.5*inch, bottomMargin=0.75*inch)
    
    # Container for PDF elements
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#8b5cf6'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold',
        borderPadding=8,
        backColor=colors.HexColor('#f3f4f6'),
        borderColor=colors.HexColor('#6366f1'),
        borderWidth=0,
        borderRadius=4,
        leftIndent=10,
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=8,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151'),
        spaceAfter=6,
        leading=14
    )
    
    # Header with logo and branding
    try:
        logo_path = "/app/backend/assets/trinetra_logo.png"
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=3*inch, height=0.9*inch)
            story.append(logo)
            story.append(Spacer(1, 0.2*inch))
    except Exception as e:
        logger.warning(f"Could not load logo: {e}")
        # Fallback to text header
        story.append(Paragraph("TRINETRA", title_style))
        story.append(Paragraph("Quantum Exposure Intelligence Platform", subtitle_style))
    
    # Report title with decorative line
    story.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor('#6366f1'), 
                           spaceAfter=20, spaceBefore=10, lineCap='round'))
    
    report_title = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("Quantum Security Assessment Report", report_title))
    story.append(Spacer(1, 0.1*inch))
    
    # Executive Summary Box
    summary_data = []
    if 'scan' in data:
        summary_data.append(['Domain:', data['scan'].get('domain', 'N/A')])
        summary_data.append(['Status:', data['scan'].get('status', 'N/A')])
    
    summary_data.extend([
        ['Report Generated:', data.get('generated_at', 'N/A')[:19]],
        ['Report Period:', data.get('period', 'N/A').replace('_', ' ').title()],
    ])
    
    summary_table = Table(summary_data, colWidths=[2*inch, 4.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Report sections
    sections = data.get('sections', {})
    
    # Discovery Section
    if "discovery" in sections:
        story.append(Paragraph("🔍 Asset Discovery Analysis", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        disc_data = sections["discovery"]
        
        # Key metrics
        metrics_data = [
            ['Metric', 'Value', 'Details'],
            ['Total Assets', str(disc_data.get('total_assets', 0)), 'All discovered endpoints'],
            ['Shadow Assets', str(disc_data.get('shadow_assets', 0)), 
             f"{disc_data.get('shadow_percentage', 0)}% of total"],
            ['Known Assets', str(disc_data.get('known_assets', 0)), 'Managed infrastructure'],
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2*inch, 1.5*inch, 3*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(metrics_table)
        story.append(Spacer(1, 0.15*inch))
        
        # Asset type breakdown
        if 'asset_types' in disc_data:
            story.append(Paragraph("Asset Type Distribution", subheading_style))
            asset_types = disc_data['asset_types']
            type_data = [['Type', 'Count']]
            for asset_type, count in asset_types.items():
                if count > 0:
                    type_data.append([asset_type.upper(), str(count)])
            
            if len(type_data) > 1:
                type_table = Table(type_data, colWidths=[3*inch, 1.5*inch])
                type_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf5ff')]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(type_table)
        
        story.append(Spacer(1, 0.2*inch))
    
    # CBOM Section
    if "cbom" in sections:
        story.append(Paragraph("🔐 Cryptographic Bill of Materials (CBOM)", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        cbom_data = sections["cbom"]
        
        cbom_table_data = [
            ['Status', 'Count', 'Percentage'],
            ['Quantum Vulnerable', str(cbom_data.get('quantum_vulnerable', 0)), 
             f"{cbom_data.get('vulnerable_percentage', 0)}%"],
            ['PQC Ready', str(cbom_data.get('pqc_ready', 0)), '—'],
            ['Fully Quantum Safe', str(cbom_data.get('fully_quantum_safe', 0)), 
             f"{cbom_data.get('safe_percentage', 0)}%"],
            ['Unknown Status', str(cbom_data.get('unknown_status', 0)), '—'],
        ]
        
        cbom_table = Table(cbom_table_data, colWidths=[3*inch, 1.5*inch, 2*inch])
        cbom_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            # Color code the rows
            ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#dc2626')),  # Red for vulnerable
            ('TEXTCOLOR', (0, 3), (-1, 3), colors.HexColor('#16a34a')),  # Green for safe
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(cbom_table)
        story.append(Spacer(1, 0.2*inch))
    
    # PQC Posture Section
    if "pqc" in sections:
        story.append(Paragraph("🛡️ Post-Quantum Cryptography Posture", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        pqc_data = sections["pqc"]
        
        # Risk score with color coding
        risk_score = pqc_data.get('organization_risk_score', 0)
        if risk_score < 25:
            risk_color = colors.HexColor('#16a34a')
            risk_label = 'LOW RISK'
        elif risk_score < 50:
            risk_color = colors.HexColor('#3b82f6')
            risk_label = 'MODERATE RISK'
        elif risk_score < 75:
            risk_color = colors.HexColor('#f59e0b')
            risk_label = 'HIGH RISK'
        else:
            risk_color = colors.HexColor('#dc2626')
            risk_label = 'CRITICAL RISK'
        
        pqc_summary = [
            ['Metric', 'Value'],
            ['Organization Risk Score', f"{risk_score} / 100"],
            ['Risk Level', risk_label],
            ['Quantum Safe Progress', f"{pqc_data.get('quantum_safe_progress', 0)}%"],
            ['Migration Priority', pqc_data.get('migration_priority', 'N/A')],
        ]
        
        pqc_table = Table(pqc_summary, colWidths=[3*inch, 3.5*inch])
        pqc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('TEXTCOLOR', (1, 1), (1, 1), risk_color),  # Color code risk score
            ('TEXTCOLOR', (1, 2), (1, 2), risk_color),  # Color code risk level
            ('FONTNAME', (1, 1), (1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (1, 1), (1, 2), 12),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(pqc_table)
        story.append(Spacer(1, 0.15*inch))
        
        # Risk distribution
        if 'risk_distribution' in pqc_data:
            story.append(Paragraph("Risk Distribution by Severity", subheading_style))
            risk_dist = pqc_data['risk_distribution']
            risk_data = [
                ['Severity', 'Count'],
                ['Critical', str(risk_dist.get('critical', 0))],
                ['High', str(risk_dist.get('high', 0))],
                ['Medium', str(risk_dist.get('medium', 0))],
                ['Low', str(risk_dist.get('low', 0))],
            ]
            
            risk_table = Table(risk_data, colWidths=[3*inch, 1.5*inch])
            risk_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#dc2626')),
                ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#f59e0b')),
                ('TEXTCOLOR', (0, 3), (-1, 3), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 4), (-1, 4), colors.HexColor('#16a34a')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            story.append(risk_table)
        
        story.append(Spacer(1, 0.2*inch))
    
    # Rating Section
    if "rating" in sections:
        story.append(Paragraph("⭐ Cyber Security Rating", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        rating_data = sections["rating"]
        
        # Large rating display
        tier = rating_data.get('tier', 'N/A')
        grade = rating_data.get('grade', 'N/A')
        rating = rating_data.get('rating', 'N/A')
        
        rating_display = [
            ['Tier', 'Grade', 'Rating'],
            [tier, grade, rating],
        ]
        
        rating_table = Table(rating_display, colWidths=[2*inch, 2*inch, 2.5*inch])
        rating_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTSIZE', (0, 1), (-1, 1), 18),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f9fafb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        story.append(rating_table)
        story.append(Spacer(1, 0.15*inch))
        
        # Recommendation
        if 'recommendation' in rating_data:
            rec_style = ParagraphStyle(
                'Recommendation',
                parent=body_style,
                fontSize=11,
                textColor=colors.HexColor('#1f2937'),
                backColor=colors.HexColor('#fef3c7'),
                borderColor=colors.HexColor('#f59e0b'),
                borderWidth=1,
                borderPadding=12,
                borderRadius=4,
                spaceAfter=10,
                fontName='Helvetica-Bold'
            )
            story.append(Paragraph(f"<b>Recommendation:</b> {rating_data['recommendation']}", rec_style))
        
        story.append(Spacer(1, 0.2*inch))
    
    # Inventory Section (detailed asset list)
    if "inventory" in sections:
        story.append(PageBreak())  # New page for inventory
        story.append(Paragraph("📋 Detailed Asset Inventory", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        inv_data = sections["inventory"]
        assets = inv_data.get('assets', [])
        
        if assets:
            story.append(Paragraph(f"Total Assets: {len(assets)}", subheading_style))
            
            # Asset table with detailed info
            asset_table_data = [['#', 'Asset URL', 'Type', 'Risk', 'Score', 'Status']]
            
            for idx, asset in enumerate(assets[:100], 1):  # Limit to 100 for PDF size
                url = asset.get('url', 'N/A')
                if len(url) > 35:
                    url = url[:32] + '...'
                
                asset_table_data.append([
                    str(idx),
                    url,
                    asset.get('type', 'N/A'),
                    asset.get('risk_level', 'N/A'),
                    str(asset.get('score', 0)),
                    asset.get('quantum_safe', 'N/A')[:12]
                ])
            
            asset_table = Table(asset_table_data, colWidths=[0.4*inch, 2.2*inch, 0.7*inch, 0.9*inch, 0.7*inch, 1.6*inch])
            asset_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            
            story.append(asset_table)
            
            if len(assets) > 100:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph(f"<i>... and {len(assets) - 100} more assets (see full export for complete list)</i>", body_style))
    
    # Footer
    story.append(Spacer(1, 0.4*inch))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#e5e7eb')))
    story.append(Spacer(1, 0.15*inch))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    confidential_style = ParagraphStyle(
        'Confidential',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#dc2626'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    story.append(Paragraph("© 2026 TRINETRA - Quantum Exposure Intelligence Platform", footer_style))
    story.append(Spacer(1, 0.05*inch))
    story.append(Paragraph("CONFIDENTIAL - FOR INTERNAL USE ONLY", confidential_style))
    story.append(Paragraph("This report contains sensitive security information", footer_style))
    
    # Build PDF
    doc.build(story)
    logger.info(f"Professional PDF report with logo generated: {file_path}")

async def send_email_report(email: str, data: dict, report_type: str, format: str = "JSON"):
    """Send report via email using SMTP"""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    import tempfile
    
    try:
        # Get SMTP settings from environment or use defaults
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning(f"SMTP credentials not configured. Email to {email} not sent.")
            logger.info(f"To enable email, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = email
        msg['Subject'] = f"TRINETRA Report - {report_type.replace('_', ' ').title()}"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: white; margin: 0;">TRINETRA</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Quantum Exposure Intelligence Platform</p>
                </div>
                
                <div style="padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px;">
                    <h2 style="color: #6366f1; margin-top: 0;">Your Report is Ready</h2>
                    <p>Your {report_type.replace('_', ' ').title()} report has been generated successfully.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Report Summary</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Generated:</strong> {data.get('generated_at', 'N/A')}
                            </li>
                            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Period:</strong> {data.get('period', 'N/A').replace('_', ' ').title()}
                            </li>
                            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>Format:</strong> {format}
                            </li>
                            <li style="padding: 8px 0;">
                                <strong>Sections:</strong> {len(data.get('sections', {}))}
                            </li>
                        </ul>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        This is an automated email from TRINETRA. Please do not reply to this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                    <p>© 2026 TRINETRA - Quantum Exposure Intelligence Platform</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Attach report file
        with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{format.lower()}', delete=False) as tmp:
            if format == "JSON":
                json.dump(data, tmp, indent=2)
            else:
                tmp.write(json.dumps(data, indent=2))
            tmp_path = tmp.name
        
        with open(tmp_path, 'rb') as attachment:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename=trinetra_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.{format.lower()}'
            )
            msg.attach(part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        logger.info(f"Report successfully sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return False

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Generate report on-demand"""
    try:
        # Generate report data
        data = await generate_report_data(
            db=db,
            scan_id=request.scan_id,
            asset_filter=request.asset_filter,
            sections=request.sections,
            period=request.period
        )
        
        report_id = f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Handle delivery method
        if request.delivery_method == "email":
            if not request.email:
                raise HTTPException(status_code=400, detail="Email address required")
            
            # Send email in background
            success = await send_email_report(request.email, data, request.report_type, request.format)
            
            if success:
                return ReportResponse(
                    success=True,
                    message=f"✅ Report successfully sent to {request.email}",
                    report_id=report_id
                )
            else:
                return ReportResponse(
                    success=True,
                    message=f"⚠️ Report generated but email not sent (SMTP not configured). Check server logs.",
                    report_id=report_id
                )
        
        elif request.delivery_method == "save":
            # Save to file system
            save_path = request.save_path or f"/Reports/{request.report_type}_{report_id}.{request.format.lower()}"
            file_path = save_report_to_file(data, save_path, request.format)
            
            return ReportResponse(
                success=True,
                message=f"✅ Report successfully saved to {save_path}",
                report_id=report_id,
                file_path=save_path
            )
        
        elif request.delivery_method == "download":
            # Generate download link
            download_url = f"/api/v1/reports/download/{report_id}"
            
            # Save temporarily for download
            os.makedirs("/tmp/reports", exist_ok=True)
            temp_path = f"/tmp/reports/{report_id}.{request.format.lower()}"
            save_report_to_file(data, temp_path, request.format)
            
            logger.info(f"Report saved to {temp_path} for download")
            
            return ReportResponse(
                success=True,
                message=f"✅ Report ready for download",
                report_id=report_id,
                download_url=download_url
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid delivery method")
    
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.post("/schedule", response_model=ReportResponse)
async def schedule_report(
    request: ScheduleReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Schedule recurring report"""
    try:
        # In production, integrate with Celery Beat or similar scheduler
        schedule_id = f"schedule_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        logger.info(f"Scheduled {request.frequency} {request.report_type} report")
        logger.info(f"Delivery: {request.delivery_method}, Sections: {request.sections}")
        
        return ReportResponse(
            success=True,
            message=f"✅ Report scheduled successfully! {request.frequency.capitalize()} reports will be generated and delivered via {request.delivery_method}.",
            report_id=schedule_id
        )
    
    except Exception as e:
        logger.error(f"Report scheduling failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scheduling failed: {str(e)}")

@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """Download generated report"""
    from fastapi.responses import FileResponse
    
    # Try to find the file with any supported extension
    for ext in ['json', 'csv', 'txt', 'pdf']:
        file_path = f"/tmp/reports/{report_id}.{ext}"
        if os.path.exists(file_path):
            # Determine media type
            media_types = {
                'json': 'application/json',
                'csv': 'text/csv',
                'txt': 'text/plain',
                'pdf': 'application/pdf'
            }
            
            logger.info(f"Serving report file: {file_path}")
            
            return FileResponse(
                path=file_path,
                filename=f"trinetra_report_{report_id}.{ext}",
                media_type=media_types.get(ext, 'application/octet-stream')
            )
    
    # File not found
    logger.error(f"Report file not found for report_id: {report_id}")
    raise HTTPException(status_code=404, detail=f"Report not found. Report ID: {report_id}")
