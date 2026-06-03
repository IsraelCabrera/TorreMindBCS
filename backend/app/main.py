import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine
from app.log import setup_logging
from app.models.base import Base
from app.socketio_server import sio, sio_app

logger = logging.getLogger("vlms")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(
        level=getattr(logging, settings.log_level.upper(), logging.DEBUG),
        log_dir=settings.log_dir,
    )
    logger.info("Starting Torre Mind VLMS")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("Shutting down Torre Mind VLMS")
    await engine.dispose()


app = FastAPI(title="Torre Mind VLMS", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %s (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=json.loads(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/ws", sio_app)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


from app.api.v1 import auth, visitors, visits, tenants, deliveries, blocklist, reports, admin
from app.whatsapp import webhook

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(visitors.router, prefix="/api/v1/visitors", tags=["visitors"])
app.include_router(visits.router, prefix="/api/v1/visits", tags=["visits"])
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(deliveries.router, prefix="/api/v1/deliveries", tags=["deliveries"])
app.include_router(blocklist.router, prefix="/api/v1/blocklist", tags=["blocklist"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(webhook.router, prefix="/webhooks", tags=["webhooks"])
