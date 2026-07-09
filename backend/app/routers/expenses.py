from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import math
from datetime import datetime, timezone
from app.database import get_db
from app.models.expense import Expense, ExpenseCategory
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseCategoryCreate, ExpenseCategoryResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


@router.get("/categories", response_model=list)
def list_expense_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cats = db.query(ExpenseCategory).all()
    return [ExpenseCategoryResponse.model_validate(c) for c in cats]


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=201)
def create_expense_category(data: ExpenseCategoryCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = ExpenseCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/stats")
def expense_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total_this_month = db.query(func.sum(Expense.amount)).filter(Expense.expense_date >= month_start).scalar() or 0
    count_this_month = db.query(func.count(Expense.id)).filter(Expense.expense_date >= month_start).scalar() or 0
    daily_avg = float(total_this_month) / now.day if now.day > 0 else 0
    return {
        "total_this_month": float(total_this_month),
        "daily_average": round(daily_avg, 2),
        "count_this_month": count_this_month,
    }


@router.get("", response_model=PaginatedResponse)
def list_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Expense).order_by(Expense.expense_date.desc())
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if payment_method:
        query = query.filter(Expense.payment_method == payment_method)
    if date_from:
        query = query.filter(Expense.expense_date >= datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Expense.expense_date <= datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc))
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return PaginatedResponse(
        items=[ExpenseResponse.model_validate(e) for e in items],
        total=total, page=page, per_page=per_page, pages=pages,
    )


@router.post("", response_model=ExpenseResponse, status_code=201)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    expense = Expense(**data.model_dump())
    if not expense.expense_date:
        expense.expense_date = datetime.now(timezone.utc)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", response_model=MessageResponse)
def delete_expense(expense_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    db.delete(expense)
    db.commit()
    return MessageResponse(message="Expense deleted")
