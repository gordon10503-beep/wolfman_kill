"""Local launcher: reload Python changes so new UI cannot outpace the API."""
import argparse
import os
from pathlib import Path

import uvicorn


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Moonfall locally with automatic backend reload.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-reload", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    os.chdir(root)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=args.port,
                reload=not args.no_reload, reload_dirs=[str(root)] if not args.no_reload else None)
