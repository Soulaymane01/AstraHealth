import sys
from pathlib import Path

# Vercel executes this file from the project root. Make the backend package
# importable regardless of the function working directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402,F401
