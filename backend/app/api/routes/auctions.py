import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, Request, UploadFile, status
from pymongo.errors import DuplicateKeyError

from ...core.exceptions import APIError
from ...database import get_database
from ...schemas.auction import AuctionCreate, AuctionOut, AuctionUpdate, BidCreate

router = APIRouter(prefix="/api/auctions", tags=["auctions"])


def _extract_amount(value: str) -> float | None:
    normalized = value.replace(",", ".")
    match = re.search(r"\d+(?:\.\d+)?", normalized)
    if not match:
        return None

    try:
        return float(match.group(0))
    except ValueError:
        return None


async def _require_authenticated(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise APIError(
            code="UNAUTHORIZED",
            message="Debes iniciar sesion para esta accion.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token = auth_header.replace("Bearer ", "", 1).strip()
    if not token:
        raise APIError(
            code="UNAUTHORIZED",
            message="Debes iniciar sesion para esta accion.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    db = get_database()
    session = await db.auth_sessions.find_one({"token": token})
    if not session:
        raise APIError(
            code="UNAUTHORIZED",
            message="Sesion invalida.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return session


async def _require_admin(request: Request):
    session = await _require_authenticated(request)

    if session.get("role") != "admin":
        raise APIError(
            code="FORBIDDEN",
            message="Solo administradores pueden modificar subastas.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return session


def _build_auction_id(raw_id: str | None, title: str) -> str:
    if raw_id:
        base_value = raw_id.strip().lower()
    else:
        base_value = title.strip().lower()

    slug = re.sub(r"[^a-z0-9]+", "-", base_value).strip("-")
    if not slug:
        slug = "subasta"

    if raw_id:
        return slug

    return f"{slug}-{uuid4().hex[:6]}"


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "producto"


@router.get("", response_model=dict)
async def list_auctions():
    db = get_database()
    auctions = await db.auctions.find({}, {"_id": 0}).to_list(length=500)
    return {"success": True, "data": auctions}


@router.get("/{auction_id}", response_model=dict)
async def get_auction(auction_id: str):
    db = get_database()
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if auction is None:
        raise APIError(
            code="AUCTION_NOT_FOUND",
            message="La subasta solicitada no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    validated = AuctionOut.model_validate(auction)
    return {"success": True, "data": validated.model_dump()}


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_auction(payload: AuctionCreate, request: Request):
    await _require_admin(request)
    db = get_database()
    auction_data = payload.model_dump()

    auction_data["id"] = _build_auction_id(payload.id, payload.title)
    if not auction_data.get("currentBid"):
        auction_data["currentBid"] = auction_data["startingPrice"]

    try:
        await db.auctions.insert_one(auction_data)
    except DuplicateKeyError as exc:
        raise APIError(
            code="AUCTION_ALREADY_EXISTS",
            message="Ya existe una subasta con ese identificador.",
            status_code=status.HTTP_409_CONFLICT,
            details={"id": auction_data["id"]},
        ) from exc

    response_data = {k: v for k, v in auction_data.items() if k != "_id"}
    return {"success": True, "data": response_data}


@router.put("/{auction_id}", response_model=dict)
async def update_auction(auction_id: str, payload: AuctionUpdate, request: Request):
    await _require_admin(request)
    db = get_database()
    update_data = payload.model_dump(exclude_none=True)

    if not update_data:
        raise APIError(
            code="EMPTY_UPDATE",
            message="No se enviaron campos para actualizar.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    result = await db.auctions.update_one({"id": auction_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise APIError(
            code="AUCTION_NOT_FOUND",
            message="La subasta que intentas actualizar no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    updated = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    return {"success": True, "data": updated}


@router.delete("/{auction_id}", response_model=dict)
async def delete_auction(auction_id: str, request: Request):
    await _require_admin(request)
    db = get_database()
    result = await db.auctions.delete_one({"id": auction_id})

    if result.deleted_count == 0:
        raise APIError(
            code="AUCTION_NOT_FOUND",
            message="La subasta que intentas eliminar no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return {"success": True, "data": {"deleted": True, "id": auction_id}}


@router.post("/{auction_id}/bids", response_model=dict)
async def place_bid(auction_id: str, payload: BidCreate, request: Request):
    session = await _require_authenticated(request)
    db = get_database()

    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if auction is None:
        raise APIError(
            code="AUCTION_NOT_FOUND",
            message="La subasta solicitada no existe.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    new_amount_raw = payload.amount.strip()
    new_amount = _extract_amount(new_amount_raw)
    if new_amount is None:
        raise APIError(
            code="INVALID_BID_AMOUNT",
            message="El importe de la puja no es valido.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    current_amount = _extract_amount(str(auction.get("currentBid", "")))
    if current_amount is not None and new_amount <= current_amount:
        raise APIError(
            code="BID_TOO_LOW",
            message="La nueva puja debe ser mayor a la puja actual.",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"currentBid": auction.get("currentBid")},
        )

    bid_record = {
        "bidder": session.get("username", "usuario"),
        "amount": new_amount_raw,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await db.auctions.update_one(
        {"id": auction_id},
        {
            "$set": {"currentBid": new_amount_raw},
            "$push": {"bids": {"$each": [bid_record], "$position": 0, "$slice": 25}},
        },
    )

    updated = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    return {"success": True, "data": updated}


@router.post("/upload-image", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_auction_image(
    request: Request,
    image: UploadFile = File(...),
    productId: str | None = Form(default=None),
):
    await _require_admin(request)

    file_name = image.filename or "image.avif"
    if not file_name.lower().endswith(".avif"):
        raise APIError(
            code="INVALID_IMAGE_FORMAT",
            message="Solo se permiten archivos .avif.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    content = await image.read()
    if not content:
        raise APIError(
            code="EMPTY_IMAGE_FILE",
            message="El archivo enviado esta vacio.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    max_size_bytes = 8 * 1024 * 1024
    if len(content) > max_size_bytes:
        raise APIError(
            code="IMAGE_TOO_LARGE",
            message="El archivo supera el limite de 8 MB.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    folder_slug = _slugify(productId or "general")
    file_stem = _slugify(Path(file_name).stem)
    new_name = f"{file_stem}-{uuid4().hex[:8]}.avif"

    repo_root = Path(__file__).resolve().parents[4]
    target_dir = repo_root / "public" / "productos" / folder_slug
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / new_name
    target_file.write_bytes(content)

    relative_path = f"/productos/{folder_slug}/{new_name}"
    return {"success": True, "data": {"path": relative_path}}
