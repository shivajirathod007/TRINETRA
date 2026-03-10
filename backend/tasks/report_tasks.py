from .celery_app import celery_app

@celery_app.task
def generate_pdf_report(scan_id: str):
    """
    Generate PDF/export reports for the dashboard.
    """
    return {"status": "report_ready", "scan_id": scan_id, "file_url": f"/exports/{scan_id}.pdf"}
