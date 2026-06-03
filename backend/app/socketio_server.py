import json

import socketio

from app.config import settings

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=json.loads(settings.cors_origins))
sio_app = socketio.ASGIApp(sio, socketio_path="ws/socket.io")


@sio.event
async def connect(sid, environ, auth):
    await sio.enter_room(sid, "dashboard")


@sio.event
async def disconnect(sid):
    pass
