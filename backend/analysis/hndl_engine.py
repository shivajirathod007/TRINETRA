from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from config import settings

def calculate_hndl_deadline(algorithm_weight: float, cert_expiry: datetime, crqc_year: int = None) -> datetime:
    """
    Calculates the Harvest Now, Decrypt Later (HNDL) migration deadline.
    Rule: algorithm vulnerability weight + certificate expiry + CRQC timeline
    """
    target_crqc_year = crqc_year or settings.CRQC_TIMELINE_YEAR
    now = datetime.now(timezone.utc)
    
    # Simple heuristic formula for the deadline calculation:
    # Stronger weight = longer until it breaks, weaker weight = breaks sooner.
    # Expiry is a hard limit unless CRQC happens first.
    
    # Just an example heuristic for scaffolding:
    # If algo weight is high (100 = bad), deadline is sooner.
    months_deduction = int(algorithm_weight * 0.5) 
    
    base_deadline = datetime(year=target_crqc_year, month=1, day=1, tzinfo=timezone.utc)
    
    # Deadline is whichever is sooner: the adjusted CRQC timeline or the cert expiry
    adjusted_crqc = base_deadline - relativedelta(months=months_deduction)
    
    # If cert expires earlier, you have to renew/migrate then anyway
    final_deadline = min(adjusted_crqc, cert_expiry)
    
    # Ensure deadline isn't in the past
    return max(now, final_deadline)
