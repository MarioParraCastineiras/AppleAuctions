from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=120)


class UserLogin(BaseModel):
    username_or_email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=120)


class UserOut(BaseModel):
    username: str
    email: str
    role: str


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=40)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    password: str | None = Field(default=None, min_length=6, max_length=120)


class AdminUserOut(BaseModel):
    username: str
    email: str
    role: str
    createdAt: str | None = None


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=6, max_length=120)


class AuthResponse(BaseModel):
    token: str
    user: UserOut
