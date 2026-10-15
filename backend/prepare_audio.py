"""Prime all public prompts before a game: python -m backend.prepare_audio."""
import argparse
import asyncio
import os
from pathlib import Path

from .engine import NARRATION, NARRATION_EN
from .speech import Speech, speech_profile


async def prepare(voice, language="yue"):
    root = Path(__file__).resolve().parent.parent
    database = Path(os.environ.get("WOLFMAN_DB", str(root / "data" / "games.sqlite3")))
    directory = Path(os.environ.get("WOLFMAN_AUDIO_CACHE", str(database.parent / "audio-cache")))
    speech = Speech(directory)
    try:
        script = NARRATION_EN if language == "en" else NARRATION
        results = await speech.warm(script.values(), speech_profile(voice, language), concurrency=2)
        for (phase, _), audio in zip(script.items(), results):
            print(f"{phase}: {'ready (' + str(len(audio)) + ' bytes)' if audio else 'unavailable'}")
        return all(results)
    finally:
        await speech.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voice", choices=["original", "narrator"], default="original")
    parser.add_argument("--language", choices=["yue", "en"], default="yue")
    args = parser.parse_args()
    raise SystemExit(0 if asyncio.run(prepare(args.voice, args.language)) else 1)
