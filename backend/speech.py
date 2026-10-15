"""Persistent public-prompt audio with single-flight synthesis and outage backoff."""
import asyncio
from collections import OrderedDict
import hashlib
import json
import logging
from pathlib import Path
import time
import uuid

logger = logging.getLogger(__name__)
PROFILES = {
    "original": {"voice": "zh-HK-HiuMaanNeural", "rate": "+0%", "pitch": "+0Hz"},
    "narrator": {"voice": "zh-HK-WanLungNeural", "rate": "-5%", "pitch": "+0Hz"},
}


class Speech:
    def __init__(self, cache_dir=None):
        self.cache_dir = Path(cache_dir) if cache_dir else None
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache = OrderedDict()
        self.pending = {}
        self.slots = asyncio.Semaphore(2)
        self.blocked_until = 0

    @staticmethod
    def key(text, profile):
        settings = {"revision": 1, "text": text, **PROFILES[profile]}
        return hashlib.sha256(json.dumps(settings, sort_keys=True).encode()).hexdigest()

    def remember(self, key, audio):
        self.cache[key] = audio
        self.cache.move_to_end(key)
        if len(self.cache) > 32:
            self.cache.popitem(last=False)

    async def synthesize(self, text, profile="original"):
        key = self.key(text, profile)
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        path = self.cache_dir / f"{key}.mp3" if self.cache_dir else None
        if path:
            try:
                audio = await asyncio.to_thread(path.read_bytes)
                if audio:
                    self.remember(key, audio)
                    return audio
            except OSError:
                pass
        if time.monotonic() < self.blocked_until:
            return None
        if key not in self.pending:
            task = asyncio.create_task(self.generate(text, profile, key, path))
            self.pending[key] = task
            task.add_done_callback(lambda done: self.pending.pop(key, None))
        # A browser disconnect must not discard a nearly finished reusable clip.
        return await asyncio.shield(self.pending[key])

    async def generate(self, text, profile, key, path):
        async with self.slots:
            if time.monotonic() < self.blocked_until:
                return None
            try:
                import edge_tts
                async with asyncio.timeout(12):
                    audio = bytearray()
                    async for chunk in edge_tts.Communicate(text, **PROFILES[profile]).stream():
                        if chunk["type"] == "audio":
                            audio.extend(chunk["data"])
                    if not audio:
                        raise RuntimeError("Empty speech response")
                result = bytes(audio)
                self.remember(key, result)
                if path:
                    def save():
                        temporary = path.with_suffix(f".{uuid.uuid4().hex}.tmp")
                        try:
                            temporary.write_bytes(result)
                            temporary.replace(path)
                        finally:
                            temporary.unlink(missing_ok=True)
                    try:
                        await asyncio.to_thread(save)
                    except OSError:
                        logger.warning("Speech disk cache unavailable; using memory cache")
                return result
            except Exception as exc:
                self.blocked_until = time.monotonic() + 30
                logger.warning("Cantonese synthesis unavailable: %s; backing off for 30s", type(exc).__name__)
                return None

    async def warm(self, texts, profile="original", concurrency=1):
        texts = list(texts)
        results = [None] * len(texts)
        queue = iter(enumerate(texts))
        async def worker():
            for index, text in queue:
                results[index] = await self.synthesize(text, profile)
        # Startup uses one slot, leaving capacity for an immediate player request.
        await asyncio.gather(*(worker() for _ in range(min(concurrency, len(texts)))))
        return results

    async def close(self):
        tasks = list(self.pending.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
