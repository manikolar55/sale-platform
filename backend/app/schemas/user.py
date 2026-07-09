from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role_id: int
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    avatar: Optional[str] = None
    role: Optional[RoleResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    role: Optional[RoleResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}
