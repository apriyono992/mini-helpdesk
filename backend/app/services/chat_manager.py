from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, ticket_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[ticket_id].append(ws)

    def disconnect(self, ticket_id: int, ws: WebSocket) -> None:
        self._connections[ticket_id].remove(ws)

    async def broadcast(self, ticket_id: int, data: dict) -> None:
        for ws in list(self._connections[ticket_id]):
            await ws.send_json(data)


manager = ConnectionManager()
