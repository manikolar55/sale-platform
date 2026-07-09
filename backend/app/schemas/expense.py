from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class ExpenseCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#6B7280"
    icon: Optional[str] = "DollarSign"


class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    category_id: Optional[int] = None
    description: str
    amount: Decimal
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: str = "Cash"
    expense_date: Optional[datetime] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: Optional[datetime] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    category_id: Optional[int] = None
    description: str
    amount: Decimal
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: str
    expense_date: datetime
    notes: Optional[str] = None
    category: Optional[ExpenseCategoryResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}
