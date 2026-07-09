from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class ProductImageResponse(BaseModel):
    id: int
    url: str
    is_primary: bool

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    purchase_price: Decimal
    sale_price: Decimal
    stock: int = 0
    min_stock: int = 5
    unit: str = "pcs"


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    purchase_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryMinimal(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class SupplierMinimal(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    purchase_price: Decimal
    sale_price: Decimal
    stock: int
    min_stock: int
    unit: str
    is_active: bool
    category: Optional[CategoryMinimal] = None
    supplier: Optional[SupplierMinimal] = None
    images: List[ProductImageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
