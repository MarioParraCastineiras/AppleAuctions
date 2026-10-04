from datetime import datetime, timezone

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pymongo.errors import OperationFailure
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api.routes.auth import router as auth_router
from .api.routes.auctions import router as auctions_router
from .core.config import settings
from .core.exceptions import (
    APIError,
    api_error_handler,
    http_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from .database import close_mongo_connection, connect_to_mongo, get_database
from .core.security import hash_password
from .models.auction_seed import AUCTION_SEED_DATA


async def ensure_auth_session_ttl_index(db, ttl_seconds: int):
    index_name = "created_at_1"
    current_ttl = None

    async for index in db.auth_sessions.list_indexes():
        if index.get("name") == index_name:
            current_ttl = index.get("expireAfterSeconds")
            break

    if current_ttl == ttl_seconds:
        return

    if current_ttl is not None:
        await db.auth_sessions.drop_index(index_name)

    await db.auth_sessions.create_index("created_at", expireAfterSeconds=ttl_seconds)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_mongo()

    db = get_database()
    await db.auctions.create_index("id", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.auth_sessions.create_index("token", unique=True)

    try:
        await ensure_auth_session_ttl_index(
            db,
            ttl_seconds=max(3600, settings.session_ttl_hours * 3600),
        )
    except OperationFailure as exc:
        # If another process updates the index at the same time, retry idempotently.
        if exc.code == 85:
            await db.auth_sessions.drop_index("created_at_1")
            await ensure_auth_session_ttl_index(
                db,
                ttl_seconds=max(3600, settings.session_ttl_hours * 3600),
            )
        else:
            raise

    await db.users.update_one(
        {"username": settings.admin_username},
        {
            "$set": {
                "email": settings.admin_email,
                "password_hash": hash_password(settings.admin_password),
                "role": "admin",
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )

    if settings.auto_seed:
        auction_count = await db.auctions.count_documents({})
        if auction_count == 0:
            await db.auctions.insert_many(AUCTION_SEED_DATA)

    try:
        yield
    finally:
        await close_mongo_connection()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(auctions_router)
app.include_router(auth_router)


@app.get("/api/health")
async def healthcheck():
    return {"success": True, "data": {"status": "ok", "env": settings.app_env}}
