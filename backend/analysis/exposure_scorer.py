def calculate_score(algorithm_risk: float, hndl_urgency: float, public_exposure: float) -> float:
    """
    Computes a 0-100 quantum risk score.
    Rule: Score = (Algorithm Risk × 0.40) + (HNDL Urgency × 0.40) + (Public Exposure × 0.20)
    """
    # Normalize inputs to 0-100 just in case
    algo_risk_clamped = max(0, min(100, algorithm_risk))
    hndl_clamped = max(0, min(100, hndl_urgency))
    pub_exp_clamped = max(0, min(100, public_exposure))
    
    score = (algo_risk_clamped * 0.40) + (hndl_clamped * 0.40) + (pub_exp_clamped * 0.20)
    return round(score, 2)
