import re
from datetime import datetime, timezone

from fastapi import APIRouter, Request, status

from ...core.exceptions import APIError
from ...core.security import create_session_token, hash_password, verify_password
from ...database import get_database
from ...schemas.user import (
    AdminPasswordReset,
    AdminUserOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _sanitize_username(value: str) -> str:
    return value.strip().lower()


def _sanitize_email(value: str) -> str:
    return value.strip().lower()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate):
    db = get_database()

    username = _sanitize_username(payload.username)
    email = _sanitize_email(payload.email)

    if not EMAIL_REGEX.match(email):
        raise APIError(
            code="INVALID_EMAIL",
            message="El correo electronico no tiene un formato valido.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    existing_by_username = await db.users.find_one({"username": username})
    if existing_by_username:
        raise APIError(
            code="USERNAME_ALREADY_EXISTS",
            message="Ese nombre de usuario ya esta en uso.",
            status_code=status.HTTP_409_CONFLICT,
        )

    existing_by_email = await db.users.find_one({"email": email})
    if existing_by_email:
        raise APIError(
            code="EMAIL_ALREADY_EXISTS",
            message="Ese correo electronico ya esta registrado.",
            status_code=status.HTTP_409_CONFLICT,
        )

    user_doc = {
        "username": username,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)

    user_out = UserOut(username=username, email=email, role="user")
    return {"success": True, "data": user_out.model_dump()}


@router.post("/login", response_model=dict)
async def login_user(payload: UserLogin):
    db = get_database()

    identity = payload.username_or_email.strip().lower()
    user = await db.users.find_one(
        {"$or": [{"username": identity}, {"email": identity}]}
    )
    if user is None or not verify_password(payload.password, user.get("password_hash", "")):
        raise APIError(
            code="INVALID_CREDENTIALS",
            message="Credenciales invalidas.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token = create_session_token()
    await db.auth_sessions.insert_one(
        {
            "token": token,
            "username": user["username"],
            "role": user["role"],
            "created_at": datetime.now(timezone.utc),
        }
    )

    user_out = UserOut(username=user["username"], email=user["email"], role=user["role"])
    return {"success": True, "data": {"token": token, "user": user_out.model_dump()}}


@router.get("/me", response_model=dict)
async def me(request: Request):
    session = await _require_session(request)
    db = get_database()
    user = await db.users.find_one({"username": session["username"]}, {"_id": 0, "password_hash": 0, "created_at": 0})
    if not user:
        raise APIError(
            code="UNAUTHORIZED",
            message="La sesion no es valida.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return {"success": True, "data": user}


async def _require_session(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise APIError(
            code="UNAUTHORIZED",
            message="No hay sesion activa.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token = auth_header.replace("Bearer ", "", 1).strip()
    if not token:
        raise APIError(
            code="UNAUTHORIZED",
            message="No hay sesion activa.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    db = get_database()
    session = await db.auth_sessions.find_one({"token": token})
    if not session:
        raise APIError(
            code="UNAUTHORIZED",
            message="La sesion no es valida.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return session


async def _require_admin_session(request: Request):
    session = await _require_session(request)
    if session.get("role") != "admin":
        raise APIError(
            code="FORBIDDEN",
            message="Solo los administradores pueden acceder a esta seccion.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return session


@router.patch("/me", response_model=dict)
async def update_me(payload: UserUpdate, request: Request):
    session = await _require_session(request)
    db = get_database()

    current_user = await db.users.find_one({"username": session["username"]})
    if not current_user:
        raise APIError(
            code="UNAUTHORIZED",
            message="La sesion no es valida.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise APIError(
            code="EMPTY_UPDATE",
            message="No se enviaron cambios para actualizar.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if "email" in update_data:
        update_data["email"] = _sanitize_email(update_data["email"])
        if not EMAIL_REGEX.match(update_data["email"]):
            raise APIError(
                code="INVALID_EMAIL",
                message="El correo electronico no tiene un formato valido.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        existing_email = await db.users.find_one({"email": update_data["email"], "username": {"$ne": current_user["username"]}})
        if existing_email:
            raise APIError(
                code="EMAIL_ALREADY_EXISTS",
                message="Ese correo electronico ya esta registrado.",
                status_code=status.HTTP_409_CONFLICT,
            )

    if "username" in update_data:
        update_data["username"] = _sanitize_username(update_data["username"])
        existing_username = await db.users.find_one({"username": update_data["username"], "_id": {"$ne": current_user["_id"]}})
        if existing_username:
            raise APIError(
                code="USERNAME_ALREADY_EXISTS",
                message="Ese nombre de usuario ya esta en uso.",
                status_code=status.HTTP_409_CONFLICT,
            )

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    old_username = current_user["username"]
    user_update = {k: v for k, v in update_data.items() if k != "password_hash"}
    if "password_hash" in update_data:
        user_update["password_hash"] = update_data["password_hash"]

    await db.users.update_one({"username": old_username}, {"$set": user_update})

    updated_username = user_update.get("username", old_username)
    if updated_username != old_username:
        await db.auth_sessions.update_many({"username": old_username}, {"$set": {"username": updated_username}})
        session["username"] = updated_username

    updated_user = await db.users.find_one({"username": updated_username}, {"_id": 0, "password_hash": 0, "created_at": 0})
    return {"success": True, "data": updated_user}


@router.get("/admin/users", response_model=dict)
async def list_users(request: Request):
    await _require_admin_session(request)
    db = get_database()

    users = []
    async for user in db.users.find({}, {"_id": 0, "password_hash": 0}):
        users.append(
            AdminUserOut(
                username=user["username"],
                email=user["email"],
                role=user["role"],
                createdAt=user.get("created_at").isoformat() if user.get("created_at") else None,
            ).model_dump()
        )

    return {"success": True, "data": users}


@router.get("/admin/users/{username}", response_model=dict)
async def get_user_detail(username: str, request: Request):
    await _require_admin_session(request)
    db = get_database()

    user = await db.users.find_one({"username": username.lower()}, {"_id": 0, "password_hash": 0})
    if not user:
        raise APIError(
            code="USER_NOT_FOUND",
            message="El usuario solicitado no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return {
        "success": True,
        "data": AdminUserOut(
            username=user["username"],
            email=user["email"],
            role=user["role"],
            createdAt=user.get("created_at").isoformat() if user.get("created_at") else None,
        ).model_dump(),
    }


@router.patch("/admin/users/{username}/reset-password", response_model=dict)
async def reset_user_password(username: str, payload: AdminPasswordReset, request: Request):
    await _require_admin_session(request)
    db = get_database()

    result = await db.users.update_one(
        {"username": username.lower()},
        {"$set": {"password_hash": hash_password(payload.password)}},
    )
    if result.matched_count == 0:
        raise APIError(
            code="USER_NOT_FOUND",
            message="El usuario solicitado no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return {"success": True, "data": {"username": username.lower(), "passwordReset": True}}


@router.delete("/admin/users/{username}", response_model=dict)
async def delete_user(username: str, request: Request):
    session = await _require_admin_session(request)
    db = get_database()

    target_username = username.lower()
    if target_username == session.get("username"):
        raise APIError(
            code="FORBIDDEN",
            message="No puedes eliminar tu propia cuenta activa.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    result = await db.users.delete_one({"username": target_username})
    if result.deleted_count == 0:
        raise APIError(
            code="USER_NOT_FOUND",
            message="El usuario solicitado no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    await db.auth_sessions.delete_many({"username": target_username})

    return {"success": True, "data": {"username": target_username, "deleted": True}}
