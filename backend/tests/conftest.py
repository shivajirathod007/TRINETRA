import sys
from unittest.mock import MagicMock

# Mock out heavy ML dependencies that fail to install due to disk space limits
mock_torch = MagicMock()
mock_transformers = MagicMock()

sys.modules['torch'] = mock_torch
sys.modules['transformers'] = mock_transformers
