from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_device_or_ip(request: Request) -> str:
    device_id = request.headers.get("X-Device-Id")
    if device_id:
        return f"dev:{device_id.strip()}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_device_or_ip)
