from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int
    sale_price: Decimal


class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    customer_name: Optional[str] = None
    market_name: Optional[str] = None
    payment_method: str = "Cash"
    discount: Decimal = Decimal("0")
    tax: Decimal = Decimal("0")
    notes: Optional[str] = None
    customer_id: Optional[int] = None
    is_credit: bool = False


class ProductMinimal(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    sale_price: Decimal
    purchase_price: Decimal
    total: Decimal
    profit: Decimal
    product: Optional[ProductMinimal] = None

    model_config = {"from_attributes": True}


class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    customer_name: Optional[str] = None
    market_name: Optional[str] = None
    subtotal: Decimal
    tax: Decimal
    discount: Decimal
    total: Decimal
    profit: Decimal
    payment_method: str
    notes: Optional[str] = None
    sale_date: datetime
    items: List[SaleItemResponse] = []

    model_config = {"from_attributes": True}


class SaleListResponse(BaseModel):
    id: int
    invoice_number: str
    customer_name: Optional[str] = None
    market_name: Optional[str] = None
    total: Decimal
    profit: Decimal
    payment_method: str
    sale_date: datetime
    item_count: int = 0

    model_config = {"from_attributes": True}
