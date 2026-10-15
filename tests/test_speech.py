import asyncio
import sys
from types import SimpleNamespace

from backend.speech import Speech


def install(monkeypatch, stream):
    calls = []
    class Communicate:
        def __init__(self, text, **settings):
            calls.append((text, settings))
    Communicate.stream = staticmethod(stream)
    monkeypatch.setitem(sys.modules, "edge_tts", SimpleNamespace(Communicate=Communicate))
    return calls


async def good_stream():
    await asyncio.sleep(0)
    yield {"type": "audio", "data": b"test-mp3"}


def test_memory_disk_cache_and_voice_keys(monkeypatch, tmp_path):
    calls = install(monkeypatch, good_stream)
    async def run():
        speech = Speech(tmp_path)
        assert await speech.synthesize("天黑請閉眼") == b"test-mp3"
        assert await speech.synthesize("天黑請閉眼") == b"test-mp3"
        restarted = Speech(tmp_path)
        assert await restarted.synthesize("天黑請閉眼") == b"test-mp3"
        assert len(calls) == 1
        assert await restarted.synthesize("天黑請閉眼", "narrator") == b"test-mp3"
        assert calls[0][1] == {"voice": "zh-HK-HiuMaanNeural", "rate": "+0%", "pitch": "+0Hz"}
        assert calls[1][1]["voice"] == "zh-HK-WanLungNeural"
        assert len(list(tmp_path.glob("*.mp3"))) == 2
        assert not list(tmp_path.glob("*.tmp"))
    asyncio.run(run())


def test_simultaneous_replays_share_one_generation(monkeypatch):
    calls = install(monkeypatch, good_stream)
    async def run():
        speech = Speech()
        assert await asyncio.gather(*(speech.synthesize("狼人請睜眼") for _ in range(8))) == [b"test-mp3"] * 8
        assert len(calls) == 1
    asyncio.run(run())


def test_cached_clip_does_not_wait_for_unrelated_network(monkeypatch):
    async def run():
        gate = asyncio.Event()
        async def slow_stream():
            await gate.wait()
            yield {"type": "audio", "data": b"new"}
        install(monkeypatch, slow_stream)
        speech = Speech()
        speech.remember(speech.key("cached", "original"), b"cached")
        pending = asyncio.create_task(speech.synthesize("slow"))
        await asyncio.sleep(0)
        assert await asyncio.wait_for(speech.synthesize("cached"), .1) == b"cached"
        gate.set()
        assert await pending == b"new"
    asyncio.run(run())


def test_cancelled_listener_does_not_discard_shared_generation(monkeypatch):
    async def run():
        gate = asyncio.Event()
        async def delayed():
            await gate.wait()
            yield {"type": "audio", "data": b"ready"}
        calls = install(monkeypatch, delayed)
        speech = Speech()
        listener = asyncio.create_task(speech.synthesize("night"))
        await asyncio.sleep(0)
        listener.cancel()
        await asyncio.gather(listener, return_exceptions=True)
        gate.set()
        assert await speech.synthesize("night") == b"ready"
        assert len(calls) == 1
    asyncio.run(run())


def test_provider_outage_backs_off_without_delaying_every_replay(monkeypatch):
    async def broken():
        raise ConnectionError("offline")
        yield
    calls = install(monkeypatch, broken)
    async def run():
        speech = Speech()
        assert await speech.synthesize("one") is None
        assert await speech.synthesize("one") is None
        assert await speech.synthesize("two") is None
        assert len(calls) == 1
        speech.blocked_until = 0
        assert await speech.synthesize("one") is None
        assert len(calls) == 2
    asyncio.run(run())


def test_empty_response_is_not_saved(monkeypatch, tmp_path):
    async def empty():
        yield {"type": "metadata", "data": b""}
    install(monkeypatch, empty)
    async def run():
        assert await Speech(tmp_path).synthesize("night") is None
        assert not list(tmp_path.iterdir())
    asyncio.run(run())


def test_background_warmup_leaves_capacity_for_foreground_audio(monkeypatch):
    async def run():
        started, release = asyncio.Event(), asyncio.Event()
        class Communicate:
            def __init__(self, text, **settings):
                self.text = text
            async def stream(self):
                if self.text.startswith("background"):
                    started.set()
                    await release.wait()
                yield {"type": "audio", "data": b"mp3"}
        monkeypatch.setitem(sys.modules, "edge_tts", SimpleNamespace(Communicate=Communicate))
        speech = Speech()
        warming = asyncio.create_task(speech.warm(["background-one", "background-two"]))
        await started.wait()
        assert await asyncio.wait_for(speech.synthesize("current"), .1) == b"mp3"
        release.set()
        assert await warming == [b"mp3", b"mp3"]
    asyncio.run(run())
