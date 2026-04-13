"""
Professional PDF Report Generator with Cover Page, TOC, Charts, and Enhanced Layout
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, 
    PageBreak, Image, KeepTogether, Frame, PageTemplate
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF

def safe_get(data, *keys, default=None):
    """Safely get nested dictionary values"""
    result = data
    for key in keys:
        if isinstance(result, dict):
            result = result.get(key)
            if result is None:
                return default
        else:
            return default
    return result if result is not None else default

class NumberedCanvas(canvas.Canvas):
    """Custom canvas for page numbers and headers"""
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        page_num = self._pageNumber
        if page_num > 1:  # Skip page number on cover page
            self.setFont("Helvetica", 9)
            self.setFillColor(colors.HexColor('#6b7280'))
            self.drawRightString(7.5*inch, 0.5*inch, f"Page {page_num - 1} of {page_count - 1}")
            self.drawString(0.75*inch, 0.5*inch, "TRINETRA - Quantum Security Report")


def create_cover_page(logo_path: str, data: dict):
    """Create professional cover page"""
    elements = []
    styles = getSampleStyleSheet()
    
    # Large logo at top
    elements.append(Spacer(1, 1.5*inch))
    
    try:
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=4.5*inch, height=1.35*inch)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 0.5*inch))
    except Exception:
        pass
    
    # Main title
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontSize=36,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=42
    )
    
    elements.append(Paragraph("Quantum Security<br/>Assessment Report", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Subtitle
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.HexColor('#6366f1'),
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    )
    
    elements.append(Paragraph("Post-Quantum Cryptography Readiness Analysis", subtitle_style))
    elements.append(Spacer(1, 1*inch))
    
    # Info box
    info_data = []
    if 'scan' in data:
        info_data.append(['Organization Domain:', data['scan'].get('domain', 'N/A')])
    info_data.extend([
        ['Report Generated:', data.get('generated_at', 'N/A')[:19]],
        ['Analysis Period:', data.get('period', 'N/A').replace('_', ' ').title()],
        ['Report Type:', 'Comprehensive Security Assessment'],
    ])
    
    info_table = Table(info_data, colWidths=[2.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#6366f1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 1.5*inch))
    
    # Confidential notice
    conf_style = ParagraphStyle(
        'Confidential',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#dc2626'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        borderColor=colors.HexColor('#dc2626'),
        borderWidth=2,
        borderPadding=15,
        backColor=colors.HexColor('#fef2f2')
    )
    
    elements.append(Paragraph("⚠ CONFIDENTIAL - FOR INTERNAL USE ONLY ⚠<br/>This report contains sensitive security information", conf_style))
    
    elements.append(PageBreak())
    return elements


def create_table_of_contents(data: dict):
    """Create table of contents"""
    elements = []
    styles = getSampleStyleSheet()
    
    toc_title = ParagraphStyle(
        'TOCTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=30,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    elements.append(Paragraph("Table of Contents", toc_title))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
    elements.append(Spacer(1, 0.3*inch))
    
    toc_style = ParagraphStyle(
        'TOCEntry',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        leftIndent=20,
        fontName='Helvetica'
    )
    
    toc_items = [
        "1. Executive Summary",
        "2. Key Findings & Risk Overview",
    ]
    
    section_num = 3
    sections = data.get('sections', {})
    if "discovery" in sections:
        toc_items.append(f"{section_num}. Asset Discovery Analysis")
        section_num += 1
    if "cbom" in sections:
        toc_items.append(f"{section_num}. Cryptographic Bill of Materials (CBOM)")
        section_num += 1
    if "pqc" in sections:
        toc_items.append(f"{section_num}. Post-Quantum Cryptography Posture")
        section_num += 1
    if "rating" in sections:
        toc_items.append(f"{section_num}. Cyber Security Rating")
        section_num += 1
    if "inventory" in sections:
        toc_items.append(f"{section_num}. Detailed Asset Inventory")
        section_num += 1
    
    toc_items.extend([
        f"{section_num}. Recommendations & Next Steps",
        f"{section_num + 1}. Appendix"
    ])
    
    for item in toc_items:
        elements.append(Paragraph(f"• {item}", toc_style))
    
    elements.append(PageBreak())
    return elements


def create_executive_summary(data: dict, styles):
    """Create executive summary with key metrics"""
    elements = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    elements.append(Paragraph("1. Executive Summary", heading_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
    elements.append(Spacer(1, 0.2*inch))
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
        leading=16,
        alignment=TA_JUSTIFY
    )
    
    # Summary text with safe data access
    sections = data.get('sections', {})
    total_assets = sections.get('discovery', {}).get('total_assets', 0) if sections.get('discovery') else 0
    risk_score = sections.get('pqc', {}).get('organization_risk_score', 0) if sections.get('pqc') else 0
    vulnerable = sections.get('cbom', {}).get('quantum_vulnerable', 0) if sections.get('cbom') else 0
    
    summary_text = f"""
    This comprehensive quantum security assessment analyzes <b>{total_assets} digital assets</b> across your 
    organization's infrastructure to evaluate readiness for the post-quantum cryptography era. The analysis 
    identifies cryptographic vulnerabilities, shadow assets, and provides actionable recommendations for 
    quantum-safe migration.
    """
    
    elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Key metrics in colored boxes
    if risk_score < 25:
        risk_color = colors.HexColor('#16a34a')
        risk_status = "LOW RISK"
    elif risk_score < 50:
        risk_color = colors.HexColor('#3b82f6')
        risk_status = "MODERATE RISK"
    elif risk_score < 75:
        risk_color = colors.HexColor('#f59e0b')
        risk_status = "HIGH RISK"
    else:
        risk_color = colors.HexColor('#dc2626')
        risk_status = "CRITICAL RISK"
    
    cbom_section = sections.get('cbom', {}) or {}
    rating_section = sections.get('rating', {}) or {}
    
    metrics_data = [
        ['Overall Risk Score', f'{risk_score}/100', risk_status],
        ['Total Assets Analyzed', str(total_assets), 'Comprehensive Scan'],
        ['Quantum Vulnerable', str(vulnerable), f'{cbom_section.get("vulnerable_percentage", 0)}% of total'],
        ['Security Rating', rating_section.get('grade', 'N/A'), rating_section.get('rating', 'N/A')],
    ]
    
    metrics_table = Table(metrics_data, colWidths=[2.2*inch, 1.8*inch, 2.5*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (2, 0), (2, 0), risk_color),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(metrics_table)
    elements.append(Spacer(1, 0.3*inch))
    
    return elements


def create_risk_chart(data: dict):
    """Create visual risk distribution chart"""
    sections = data.get('sections', {})
    pqc_data = sections.get('pqc', {})
    risk_dist = pqc_data.get('risk_distribution', {})
    
    # Return empty drawing if no data
    if not risk_dist or sum(risk_dist.values()) == 0:
        return Drawing(400, 200)
    
    # Create pie chart
    drawing = Drawing(400, 200)
    
    pie = Pie()
    pie.x = 150
    pie.y = 50
    pie.width = 120
    pie.height = 120
    
    pie.data = [
        risk_dist.get('critical', 0),
        risk_dist.get('high', 0),
        risk_dist.get('medium', 0),
        risk_dist.get('low', 0)
    ]
    
    pie.labels = ['Critical', 'High', 'Medium', 'Low']
    pie.slices.strokeWidth = 0.5
    pie.slices[0].fillColor = colors.HexColor('#dc2626')
    pie.slices[1].fillColor = colors.HexColor('#f59e0b')
    pie.slices[2].fillColor = colors.HexColor('#3b82f6')
    pie.slices[3].fillColor = colors.HexColor('#16a34a')
    
    drawing.add(pie)
    
    # Add legend
    legend_y = 150
    legend_items = [
        ('Critical', colors.HexColor('#dc2626')),
        ('High', colors.HexColor('#f59e0b')),
        ('Medium', colors.HexColor('#3b82f6')),
        ('Low', colors.HexColor('#16a34a'))
    ]
    
    for i, (label, color) in enumerate(legend_items):
        y_pos = legend_y - (i * 20)
        rect = Rect(10, y_pos, 15, 15)
        rect.fillColor = color
        rect.strokeColor = colors.HexColor('#e5e7eb')
        drawing.add(rect)
        
        text = String(30, y_pos + 5, label)
        text.fontSize = 10
        text.fillColor = colors.HexColor('#374151')
        drawing.add(text)
    
    return drawing


def create_quantum_safety_chart(data: dict):
    """Create quantum safety status bar chart"""
    sections = data.get('sections', {})
    cbom_data = sections.get('cbom', {})
    
    # Return empty drawing if no data
    if not cbom_data:
        return Drawing(400, 200)
    
    drawing = Drawing(400, 200)
    
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 50
    bc.height = 125
    bc.width = 300
    
    bc.data = [[
        cbom_data.get('quantum_vulnerable', 0),
        cbom_data.get('pqc_ready', 0),
        cbom_data.get('fully_quantum_safe', 0),
        cbom_data.get('unknown_status', 0)
    ]]
    
    bc.categoryAxis.categoryNames = ['Vulnerable', 'PQC Ready', 'Quantum Safe', 'Unknown']
    bc.categoryAxis.labels.fontSize = 9
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(bc.data[0]) + 5 if bc.data[0] else 10
    
    bc.bars[0].fillColor = colors.HexColor('#6366f1')
    bc.barWidth = 40
    
    drawing.add(bc)
    
    return drawing


def create_key_findings(data: dict, styles):
    """Create key findings section with charts"""
    elements = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    elements.append(PageBreak())
    elements.append(Paragraph("2. Key Findings & Risk Overview", heading_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
    elements.append(Spacer(1, 0.2*inch))
    
    subheading_style = ParagraphStyle(
        'Subheading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    # Risk Distribution Chart
    elements.append(Paragraph("Risk Distribution by Severity", subheading_style))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(create_risk_chart(data))
    elements.append(Spacer(1, 0.3*inch))
    
    # Quantum Safety Status Chart
    elements.append(Paragraph("Quantum Safety Status", subheading_style))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(create_quantum_safety_chart(data))
    elements.append(Spacer(1, 0.3*inch))
    
    # Key findings bullets
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#374151'),
        spaceAfter=10,
        leading=16,
        leftIndent=20,
        bulletIndent=10
    )
    
    sections = data.get('sections', {})
    findings = []
    
    if 'discovery' in sections and sections['discovery']:
        shadow_pct = sections['discovery'].get('shadow_percentage', 0)
        if shadow_pct > 20:
            findings.append(f"<b>Shadow Assets:</b> {shadow_pct}% of discovered assets are shadow assets, indicating potential security blind spots.")
    
    if 'cbom' in sections and sections['cbom']:
        vuln_pct = sections['cbom'].get('vulnerable_percentage', 0)
        if vuln_pct > 0:
            findings.append(f"<b>Quantum Vulnerability:</b> {vuln_pct}% of cryptographic components are vulnerable to quantum attacks.")
    
    if 'pqc' in sections and sections['pqc']:
        priority = sections['pqc'].get('migration_priority', 'N/A')
        if priority != 'N/A':
            findings.append(f"<b>Migration Priority:</b> {priority} - Immediate action recommended for quantum-safe transition.")
    
    if findings:
        elements.append(Paragraph("<b>Critical Findings:</b>", subheading_style))
        for finding in findings:
            elements.append(Paragraph(f"• {finding}", body_style))
    
    return elements


def generate_ultra_professional_pdf(data: dict, file_path: str, logger=None):
    """
    Generate an ultra-professional PDF report with:
    - Cover page with logo
    - Table of contents
    - Executive summary
    - Visual charts and graphs
    - Detailed sections
    - Page numbers and headers
    - Professional styling throughout
    """
    
    try:
        # Create document with custom canvas for page numbers
        doc = SimpleDocTemplate(
            file_path, 
            pagesize=letter,
            rightMargin=0.75*inch, 
            leftMargin=0.75*inch,
            topMargin=0.75*inch, 
            bottomMargin=0.75*inch
        )
        
        story = []
        styles = getSampleStyleSheet()
        logo_path = "/app/backend/assets/trinetra_logo.png"
        
        # 1. Cover Page
        try:
            story.extend(create_cover_page(logo_path, data))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_cover_page: {str(e)}")
            raise Exception(f"Cover page error: {str(e)}")
        
        # 2. Table of Contents
        try:
            story.extend(create_table_of_contents(data))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_table_of_contents: {str(e)}")
            raise Exception(f"TOC error: {str(e)}")
        
        # 3. Executive Summary
        try:
            story.extend(create_executive_summary(data, styles))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_executive_summary: {str(e)}")
            raise Exception(f"Executive summary error: {str(e)}")
        
        # 4. Key Findings with Charts
        try:
            story.extend(create_key_findings(data, styles))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_key_findings: {str(e)}")
            raise Exception(f"Key findings error: {str(e)}")
        
        # 5. Detailed Sections
        try:
            story.extend(create_detailed_sections(data, styles))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_detailed_sections: {str(e)}")
            raise Exception(f"Detailed sections error: {str(e)}")
        
        # 6. Recommendations
        try:
            story.extend(create_recommendations(data, styles))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_recommendations: {str(e)}")
            raise Exception(f"Recommendations error: {str(e)}")
        
        # 7. Appendix
        try:
            story.extend(create_appendix(data, styles))
        except Exception as e:
            if logger:
                logger.error(f"Error in create_appendix: {str(e)}")
            raise Exception(f"Appendix error: {str(e)}")
        
        # Build PDF with custom canvas
        doc.build(story, canvasmaker=NumberedCanvas)
        
        if logger:
            logger.info(f"Ultra-professional PDF report generated: {file_path}")
        
        return file_path
    
    except Exception as e:
        if logger:
            logger.error(f"PDF generation error: {str(e)}")
        raise


def create_detailed_sections(data: dict, styles):
    """Create all detailed analysis sections"""
    elements = []
    sections = data.get('sections', {})
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'Subheading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
        leading=16,
        alignment=TA_JUSTIFY
    )
    
    section_num = 3
    
    # Discovery Section
    if "discovery" in sections:
        elements.append(PageBreak())
        elements.append(Paragraph(f"{section_num}. Asset Discovery Analysis", heading_style))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
        elements.append(Spacer(1, 0.2*inch))
        
        disc_data = sections["discovery"]
        
        desc_text = """
        The asset discovery phase identifies all digital endpoints across your infrastructure, including 
        both known managed assets and shadow assets that may exist outside of formal IT governance. 
        This comprehensive scan provides visibility into your complete attack surface.
        """
        elements.append(Paragraph(desc_text, body_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Metrics table
        metrics_data = [
            ['Metric', 'Value', 'Analysis'],
            ['Total Assets Discovered', str(disc_data.get('total_assets', 0)), 'Complete infrastructure scan'],
            ['Shadow Assets', str(disc_data.get('shadow_assets', 0)), 
             f"{disc_data.get('shadow_percentage', 0)}% - Unmanaged endpoints"],
            ['Known Assets', str(disc_data.get('known_assets', 0)), 'Managed infrastructure'],
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2.2*inch, 1.5*inch, 2.8*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(metrics_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Asset type distribution
        if 'asset_types' in disc_data and disc_data['asset_types']:
            elements.append(Paragraph("Asset Type Distribution", subheading_style))
            asset_types = disc_data['asset_types']
            type_data = [['Asset Type', 'Count', 'Percentage']]
            total = disc_data.get('total_assets', 1) or 1
            for asset_type, count in asset_types.items():
                if count > 0:
                    pct = round((count / total) * 100, 1)
                    type_data.append([asset_type.upper(), str(count), f"{pct}%"])
            
            if len(type_data) > 1:
                type_table = Table(type_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
                type_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf5ff')]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                elements.append(type_table)
        
        section_num += 1
    
    # CBOM Section
    if "cbom" in sections:
        elements.append(PageBreak())
        elements.append(Paragraph(f"{section_num}. Cryptographic Bill of Materials (CBOM)", heading_style))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
        elements.append(Spacer(1, 0.2*inch))
        
        cbom_text = """
        The Cryptographic Bill of Materials provides a comprehensive inventory of all cryptographic 
        implementations across your infrastructure. This analysis identifies quantum-vulnerable algorithms 
        and assesses readiness for post-quantum cryptography migration.
        """
        elements.append(Paragraph(cbom_text, body_style))
        elements.append(Spacer(1, 0.2*inch))
        
        cbom_data = sections["cbom"]
        
        cbom_table_data = [
            ['Cryptographic Status', 'Asset Count', 'Percentage', 'Risk Level'],
            ['Quantum Vulnerable', str(cbom_data.get('quantum_vulnerable', 0)), 
             f"{cbom_data.get('vulnerable_percentage', 0)}%", 'CRITICAL'],
            ['PQC Ready', str(cbom_data.get('pqc_ready', 0)), '—', 'MODERATE'],
            ['Fully Quantum Safe', str(cbom_data.get('fully_quantum_safe', 0)), 
             f"{cbom_data.get('safe_percentage', 0)}%", 'LOW'],
            ['Unknown Status', str(cbom_data.get('unknown_status', 0)), '—', 'UNKNOWN'],
        ]
        
        cbom_table = Table(cbom_table_data, colWidths=[2.2*inch, 1.5*inch, 1.3*inch, 1.5*inch])
        cbom_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 3), (-1, 3), colors.HexColor('#16a34a')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(cbom_table)
        section_num += 1
    
    return elements


def create_recommendations(data: dict, styles):
    """Create recommendations section"""
    elements = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
        leading=16,
        leftIndent=20
    )
    
    elements.append(PageBreak())
    elements.append(Paragraph("Recommendations & Next Steps", heading_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
    elements.append(Spacer(1, 0.2*inch))
    
    sections = data.get('sections', {})
    pqc_section = sections.get('pqc', {}) or {}
    risk_score = pqc_section.get('organization_risk_score', 0)
    
    recommendations = []
    
    if risk_score > 75:
        recommendations.extend([
            "<b>IMMEDIATE ACTION REQUIRED:</b> Begin quantum-safe migration planning immediately",
            "Prioritize critical assets with highest exposure scores for immediate remediation",
            "Implement hybrid cryptographic solutions as interim protection",
        ])
    elif risk_score > 50:
        recommendations.extend([
            "<b>HIGH PRIORITY:</b> Develop comprehensive PQC migration roadmap within 90 days",
            "Conduct detailed risk assessment for high-value assets",
            "Begin pilot testing of quantum-safe algorithms",
        ])
    else:
        recommendations.extend([
            "Continue monitoring quantum computing developments",
            "Maintain current security posture while planning gradual PQC adoption",
            "Stay informed about NIST PQC standardization progress",
        ])
    
    # Add general recommendations
    recommendations.extend([
        "Address shadow assets to reduce attack surface",
        "Implement continuous cryptographic monitoring",
        "Establish quantum readiness governance framework",
        "Train security teams on post-quantum cryptography",
        "Engage with vendors on their PQC roadmaps",
    ])
    
    for i, rec in enumerate(recommendations, 1):
        elements.append(Paragraph(f"{i}. {rec}", body_style))
        elements.append(Spacer(1, 0.05*inch))
    
    return elements


def create_appendix(data: dict, styles):
    """Create appendix with detailed asset inventory"""
    elements = []
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'Subheading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    elements.append(PageBreak())
    elements.append(Paragraph("Appendix: Detailed Asset Inventory", heading_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
    elements.append(Spacer(1, 0.2*inch))
    
    sections = data.get('sections', {})
    
    if "inventory" in sections and sections["inventory"]:
        inv_data = sections["inventory"]
        assets = inv_data.get('assets', []) if inv_data else []
        
        if assets:
            elements.append(Paragraph(f"Total Assets: {len(assets)}", subheading_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Create detailed asset table
            asset_table_data = [['#', 'Asset URL', 'Type', 'Risk', 'Score', 'Quantum Status']]
            
            for idx, asset in enumerate(assets[:150], 1):  # Limit to 150 for PDF size
                url = asset.get('url', 'N/A') or 'N/A'
                if len(url) > 40:
                    url = url[:37] + '...'
                
                asset_type = asset.get('type') or 'N/A'
                risk_level = asset.get('risk_level') or 'N/A'
                quantum_safe = asset.get('quantum_safe') or 'N/A'
                
                asset_table_data.append([
                    str(idx),
                    url,
                    str(asset_type)[:6],
                    str(risk_level)[:4],
                    str(asset.get('score', 0)),
                    str(quantum_safe)[:15]
                ])
            
            asset_table = Table(asset_table_data, colWidths=[0.35*inch, 2.5*inch, 0.7*inch, 0.7*inch, 0.6*inch, 1.65*inch])
            asset_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elements.append(asset_table)
            
            if len(assets) > 150:
                body_style = ParagraphStyle(
                    'Body',
                    parent=styles['Normal'],
                    fontSize=10,
                    textColor=colors.HexColor('#6b7280'),
                    spaceAfter=10,
                    alignment=TA_CENTER,
                    fontName='Helvetica-Oblique'
                )
                elements.append(Spacer(1, 0.15*inch))
                elements.append(Paragraph(f"... and {len(assets) - 150} more assets (contact support for complete export)", body_style))
    
    # Final footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#e5e7eb')))
    elements.append(Spacer(1, 0.2*inch))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph("© 2026 TRINETRA - Quantum Exposure Intelligence Platform", footer_style))
    elements.append(Paragraph("For questions or support, contact: support@trinetra.io", footer_style))
    
    return elements
