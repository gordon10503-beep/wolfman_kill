"""Durable cloud snapshots with PostgreSQL row locks; local play keeps SQLite."""
import hmac
import json
import secrets

import psycopg

from .engine import RuleError, act
from .store import Store


class PostgresStore:
    digest = staticmethod(Store.digest)

    def __init__(self, url):
        self._url = url
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, host TEXT NOT NULL, viewer TEXT NOT NULL, state TEXT NOT NULL)")

    def connect(self):
        # Disable prepared statements for compatibility with pooled endpoints.
        return psycopg.connect(self._url, connect_timeout=10, prepare_threshold=None)

    def create(self, state):
        game_id, host, viewer = secrets.token_urlsafe(12), secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with self.connect() as db:
            db.execute("INSERT INTO games VALUES (%s, %s, %s, %s)",
                       (game_id, self.digest(host), self.digest(viewer), json.dumps(state)))
        return game_id, host, viewer

    def read_record(self, game_id):
        with self.connect() as db:
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=%s", (game_id,)).fetchone()
        if row is None:
            raise LookupError("找不到遊戲。 / Game not found.")
        return json.loads(row[2]), row[0], row[1]

    def mutate(self, game_id, operation):
        with self.connect() as db:
            db.execute("SET LOCAL lock_timeout = '10s'")
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=%s FOR UPDATE", (game_id,)).fetchone()
            if row is None:
                raise LookupError("找不到遊戲。 / Game not found.")
            state = json.loads(row[2])
            result = operation(state, row[0], row[1])
            db.execute("UPDATE games SET state=%s WHERE id=%s", (json.dumps(state), game_id))
            return result

    def get(self, game_id, token, host_only=False):
        with self.connect() as db:
            row = db.execute("SELECT host, viewer, state FROM games WHERE id=%s", (game_id,)).fetchone()
        if row is None:
            raise LookupError("找不到遊戲。")
        digest = self.digest(token)
        if not hmac.compare_digest(row[0], digest) and (host_only or not hmac.compare_digest(row[1], digest)):
            raise PermissionError("無效的遊戲通行證。")
        return json.loads(row[2])

    def update(self, game_id, token, version, action, data, debug=False):
        with self.connect() as db:
            db.execute("SET LOCAL lock_timeout = '10s'")
            row = db.execute("SELECT host, state FROM games WHERE id=%s FOR UPDATE", (game_id,)).fetchone()
            if row is None:
                raise LookupError("找不到遊戲。")
            if not hmac.compare_digest(row[0], self.digest(token)):
                raise PermissionError("只有主持人可以操作。")
            state = json.loads(row[1])
            if state["version"] != version:
                raise RuleError("畫面已過時，已重新同步。請確認目前階段後再操作。")
            from .rooms import host_action
            updated = host_action(state, action, data, debug=debug)
            db.execute("UPDATE games SET state=%s WHERE id=%s", (json.dumps(updated), game_id))
            return updated
