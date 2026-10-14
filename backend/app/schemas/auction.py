from pydantic import BaseModel, Field, field_validator

from ..core.prices import normalize_price


class AuctionBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(default="General", min_length=1, max_length=80)
    startingPrice: str = Field(min_length=1, max_length=40)
    currentBid: str | None = Field(default=None, min_length=1, max_length=40)
    timeLeft: str = Field(min_length=1, max_length=40)
    status: str = Field(default="Proximamente", min_length=1, max_length=40)
    description: str = Field(default="Sin descripcion", min_length=1, max_length=400)
    seller: str = Field(default="Administrador", min_length=1, max_length=120)
    condition: str = Field(default="Pendiente de revision", min_length=1, max_length=120)
    extras: str = Field(default="Sin extras", min_length=1, max_length=240)
    images: list[str] = Field(default_factory=list)

    @field_validator("startingPrice", "currentBid", mode="before")
    @classmethod
    def normalize_prices(cls, value: object) -> object:
        return normalize_price(value)


class AuctionCreate(AuctionBase):
    id: str | None = Field(default=None, min_length=1, max_length=160)


class AuctionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    startingPrice: str | None = Field(default=None, min_length=1, max_length=40)
    currentBid: str | None = Field(default=None, min_length=1, max_length=40)
    timeLeft: str | None = Field(default=None, min_length=1, max_length=40)
    status: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = Field(default=None, min_length=1, max_length=400)
    seller: str | None = Field(default=None, min_length=1, max_length=120)
    condition: str | None = Field(default=None, min_length=1, max_length=120)
    extras: str | None = Field(default=None, min_length=1, max_length=240)
    images: list[str] | None = Field(default=None)

    @field_validator("startingPrice", "currentBid", mode="before")
    @classmethod
    def normalize_prices(cls, value: object) -> object:
        return normalize_price(value)


class BidCreate(BaseModel):
    amount: str = Field(min_length=1, max_length=40)

    @field_validator("amount", mode="before")
    @classmethod
    def normalize_amount(cls, value: object) -> object:
        return normalize_price(value)


class BidOut(BaseModel):
    bidder: str = Field(min_length=1)
    amount: str = Field(min_length=1)
    createdAt: str = Field(min_length=1)

    @field_validator("amount", mode="before")
    @classmethod
    def normalize_amount(cls, value: object) -> object:
        return normalize_price(value)


class AuctionOut(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    category: str = Field(min_length=1)
    currentBid: str = Field(min_length=1)
    startingPrice: str = Field(min_length=1)
    timeLeft: str = Field(min_length=1)
    status: str = Field(min_length=1)
    description: str = Field(min_length=1)
    seller: str = Field(min_length=1)
    condition: str = Field(min_length=1)
    extras: str = Field(min_length=1)
    images: list[str] = Field(default_factory=list)
    bids: list[BidOut] = Field(default_factory=list)

    @field_validator("currentBid", "startingPrice", mode="before")
    @classmethod
    def normalize_prices(cls, value: object) -> object:
        return normalize_price(value)
