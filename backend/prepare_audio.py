"""Prime all public prompts before a game: python -m backend.prepare_audio."""
import argparse
import asyncio
import os
from pathlib import Path

from .engine import NARRATION
from .speech import PROFILES, Speech


async def prepare(profile):
    root = Path(__file__).resolve().parent.parent
    database = Path(os.environ.get("WOLFMAN_DB", str(root / "data" / "games.sqlite3")))
    directory = Path(os.environ.get("WOLFMAN_AUDIO_CACHE", str(database.parent / "audio-cache")))
    speech = Speech(directory)
    try:
        results = await speech.warm(NARRATION.values(), profile, concurrency=2)
        for (phase, _), audio in zip(NARRATION.items(), results):
            print(f"{phase}: {'ready (' + str(len(audio)) + ' bytes)' if audio else 'unavailable'}")
        return all(results)
    finally:
        await speech.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voice", choices=PROFILES, default="original")
    raise SystemExit(0 if asyncio.run(prepare(parser.parse_args().voice)) else 1)
