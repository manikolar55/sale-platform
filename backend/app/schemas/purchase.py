from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int
    purchase_price: Decimal


class PurchaseCreate(BaseModel):
    items: List[PurchaseItemCreate]
    supplier_id: Optional[int] = None
    notes: Optional[str] = None


class ProductMinimal(BaseModel):
    id: int
    name: str
    unit: str = "pcs"
    model_config = {"from_attributes": True}


class SupplierMinimal(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class PurchaseItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    purchase_price: Decimal
    total: Decimal
    product: Optional[ProductMinimal] = None
    model_config = {"from_attributes": True}


class PurchaseResponse(BaseModel):
    id: int
    invoice_number: str
    supplier_id: Optional[int] = None
    supplier: Optional[SupplierMinimal] = None
    total_cost: Decimal
    notes: Optional[str] = None
    purchase_date: datetime
    items: List[PurchaseItemResponse] = []
    model_config = {"from_attributes": True}


class PurchaseListResponse(BaseModel):
    id: int
    invoice_number: str
    supplier: Optional[SupplierMinimal] = None
    total_cost: Decimal
    purchase_date: datetime
    item_count: int = 0
    model_config = {"from_attributes": True}
