from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)
        self._business_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, ticket_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[ticket_id].append(ws)

    def disconnect(self, ticket_id: int, ws: WebSocket) -> None:
        conns = self._connections.get(ticket_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, ticket_id: int, data: dict) -> None:
        for ws in list(self._connections.get(ticket_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(ticket_id, ws)

    async def connect_business(self, business_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._business_connections[business_id].append(ws)

    def disconnect_business(self, business_id: int, ws: WebSocket) -> None:
        conns = self._business_connections.get(business_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast_business(self, business_id: int, data: dict) -> None:
        for ws in list(self._business_connections.get(business_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect_business(business_id, ws)


manager = ConnectionManager()
