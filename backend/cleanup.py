import asyncio
import sys

# Add backend to path
sys.path.append("/home/shivaji/Desktop/TRINETRA/trinetra/backend")

from core.logging import get_logger
from db.session import AsyncSessionLocal
from sqlalchemy import text

log = get_logger("cleanup")

async def cleanup():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("DELETE FROM scanned_assets WHERE discovery_method = 'api_inspector_crawl'"))
        deleted_count = result.rowcount
        
        # We also need to fix the scan job counts to reflect the new reality!
        # Re-calc assets_scanned and assets_discovered
        await db.execute(text("""
            UPDATE scan_jobs sj
            SET 
                assets_scanned = (SELECT count(id) FROM scanned_assets sa WHERE sa.scan_job_id = sj.id AND sa.scan_status = 'COMPLETED'),
                assets_discovered = (SELECT count(id) FROM scanned_assets sa WHERE sa.scan_job_id = sj.id),
                shadow_assets_found = (SELECT count(id) FROM scanned_assets sa WHERE sa.scan_job_id = sj.id AND sa.is_shadow_asset = true)
        """))
        await db.commit()
        log.info(f"Deleted {deleted_count} cloned API endpoint assets from the database.")

if __name__ == "__main__":
    asyncio.run(cleanup())
