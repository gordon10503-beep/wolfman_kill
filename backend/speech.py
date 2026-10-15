"""Bounded Cantonese synthesis. The browser alone owns audio playback."""
import asyncio
from collections import OrderedDict
import logging

logger = logging.getLogger(__name__)


class Speech:
    def __init__(self):
        self.cache = OrderedDict()
        self.lock = asyncio.Lock()

    async def synthesize(self, text):
        async with self.lock:
            if text in self.cache:
                return self.cache[text]
            try:
                import edge_tts
                async def generate():
                    audio = bytearray()
                    async for chunk in edge_tts.Communicate(text, "zh-HK-HiuMaanNeural").stream():
                        if chunk["type"] == "audio":
                            audio.extend(chunk["data"])
                    if not audio:
                        raise RuntimeError("Empty speech response")
                    return bytes(audio)
                for attempt in range(2):
                    try:
                        result = await asyncio.wait_for(generate(), timeout=8)
                        self.cache[text] = result
                        if len(self.cache) > 16:
                            self.cache.popitem(last=False)
                        return result
                    except Exception:
                        if attempt:
                            raise
                        await asyncio.sleep(0.25)
            except Exception as exc:
                logger.warning("Cantonese synthesis unavailable: %s", type(exc).__name__)
                return None
