import sys
from types import SimpleNamespace

import pytest

from backend.speech import Speech


def test_retry_and_cache_without_real_network(monkeypatch):
    import asyncio
    attempts = []
    class Communicate:
        def __init__(self, text, voice):
            attempts.append((text, voice))

        async def stream(self):
            if len(attempts) == 1:
                raise ConnectionError("offline")
            yield {"type": "audio", "data": b"test-mp3"}

    monkeypatch.setitem(sys.modules, "edge_tts", SimpleNamespace(Communicate=Communicate))
    async def run():
        speech = Speech()
        assert await speech.synthesize("天黑請閉眼") == b"test-mp3"
        assert await speech.synthesize("天黑請閉眼") == b"test-mp3"
        assert len(attempts) == 2
    asyncio.run(run())
