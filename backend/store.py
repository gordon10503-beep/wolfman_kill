"""SQLite persistence with atomic optimistic concurrency checks."""
from contextlib import closing
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import sqlite3

from .engine import RuleError, act


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as db, db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, host TEXT NOT NULL, viewer TEXT NOT NULL, state TEXT NOT NULL)")

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def read_record(self, game_id):
        with closing(self.connect()) as db:
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=?", (game_id,)).fetchone()
        if row is None:
            raise LookupError("找不到遊戲。 / Game not found.")
        return json.loads(row[2]), row[0], row[1]

    def mutate(self, game_id, operation):
        """Run a room operation and its authorization under the same write lock."""
        with closing(self.connect()) as db, db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=?", (game_id,)).fetchone()
            if row is None:
                raise LookupError("找不到遊戲。 / Game not found.")
            state = json.loads(row[2])
            result = operation(state, row[0], row[1])
            db.execute("UPDATE games SET state=? WHERE id=?", (json.dumps(state), game_id))
            return result

    @staticmethod
    def digest(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def create(self, state):
        game_id, host, viewer = secrets.token_urlsafe(12), secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with closing(self.connect()) as db, db:
            db.execute("INSERT INTO games VALUES (?, ?, ?, ?)", (game_id, self.digest(host), self.digest(viewer), json.dumps(state)))
        return game_id, host, viewer

    def get(self, game_id, token, host_only=False):
        with closing(self.connect()) as db:
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=?", (game_id,)).fetchone()
        if row is None:
            raise LookupError("找不到遊戲。")
        digest = self.digest(token)
        if not hmac.compare_digest(row[0], digest) and (host_only or not hmac.compare_digest(row[1], digest)):
            raise PermissionError("無效的遊戲通行證。")
        return json.loads(row[2])

    def update(self, game_id, token, version, action, data):
        # Acquire the write reservation before reading; two tabs cannot both commit.
        with closing(self.connect()) as db, db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT host, state FROM games WHERE id=?", (game_id,)).fetchone()
            if row is None:
                raise LookupError("找不到遊戲。")
            if not hmac.compare_digest(row[0], self.digest(token)):
                raise PermissionError("只有主持人可以操作。")
            state = json.loads(row[1])
            if state["version"] != version:
                raise RuleError("畫面已過時，已重新同步。請確認目前階段後再操作。")
            from .rooms import host_action
            updated = host_action(state, action, data)
            db.execute("UPDATE games SET state=? WHERE id=?", (json.dumps(updated), game_id))
            return updated
