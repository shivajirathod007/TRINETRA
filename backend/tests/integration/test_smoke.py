import pytest

def test_api_routes_import():
    import api.routes
    assert api.routes is not None

def test_cbom_generator_import():
    import engine.analysis.cbom_generator
    assert engine.analysis.cbom_generator is not None

def test_cert_analyzer_import():
    import engine.scanners.cert_analyzer
    assert engine.scanners.cert_analyzer is not None

def test_exposure_scorer_import():
    import engine.analysis.exposure_scorer
    assert engine.analysis.exposure_scorer is not None

def test_hndl_engine_import():
    import engine.analysis.hndl_engine
    assert engine.analysis.hndl_engine is not None

def test_scan_pipeline_import():
    import workers.orchestrator
    assert workers.orchestrator is not None
