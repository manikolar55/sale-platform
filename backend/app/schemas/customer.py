from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    credit_limit: Decimal = Decimal("0")


class CustomerPaymentCreate(BaseModel):
    amount: Decimal
    payment_method: str = "Cash"
    notes: Optional[str] = None
    payment_date: Optional[datetime] = None
