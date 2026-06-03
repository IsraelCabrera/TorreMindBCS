from app.socketio_server import sio


async def emit_visit_update(event: str, data: dict):
    await sio.emit(event, data, room="dashboard")


async def emit_notification(data: dict):
    await sio.emit("notification", data, room="dashboard")
