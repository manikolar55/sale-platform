from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, text
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.sale import Sale, SaleItem
from app.models.expense import Expense
from app.models.product import Product
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/overview")
def report_overview(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    df = datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc) if date_from else now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else now

    sales_query = db.query(Sale).filter(Sale.sale_date >= df, Sale.sale_date <= dt)
    total_sales = sales_query.with_entities(func.sum(Sale.total)).scalar() or 0
    gross_profit = sales_query.with_entities(func.sum(Sale.profit)).scalar() or 0

    expenses_query = db.query(Expense).filter(Expense.expense_date >= df, Expense.expense_date <= dt)
    total_expenses = expenses_query.with_entities(func.sum(Expense.amount)).scalar() or 0

    total_purchases = db.query(func.sum(SaleItem.purchase_price * SaleItem.quantity)).join(
        Sale, SaleItem.sale_id == Sale.id
    ).filter(Sale.sale_date >= df, Sale.sale_date <= dt).scalar() or 0

    net_profit = float(gross_profit) - float(total_expenses)

    return {
        "total_sales": float(total_sales),
        "total_purchases": float(total_purchases),
        "gross_profit": float(gross_profit),
        "total_expenses": float(total_expenses),
        "net_profit": net_profit,
    }


@router.get("/sales-chart")
def sales_chart(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    df = datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc) if date_from else now - timedelta(days=30)
    dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else now

    sales = db.query(Sale).filter(Sale.sale_date >= df, Sale.sale_date <= dt).all()

    data = {}
    for sale in sales:
        date = sale.sale_date
        if period == "daily":
            key = date.strftime("%d %b")
        elif period == "weekly":
            key = f"W{date.isocalendar()[1]}"
        else:
            key = date.strftime("%b %Y")
        if key not in data:
            data[key] = {"sales": 0, "profit": 0}
        data[key]["sales"] += float(sale.total)
        data[key]["profit"] += float(sale.profit)

    return [{"date": k, "sales": v["sales"], "profit": v["profit"]} for k, v in data.items()]


@router.get("/products/top")
def top_products(
    limit: int = Query(10, ge=1, le=50),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    df = datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc) if date_from else now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else now

    results = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("total_qty"),
        func.sum(SaleItem.total).label("total_sales"),
        func.sum(SaleItem.profit).label("total_profit"),
    ).join(SaleItem, SaleItem.product_id == Product.id
    ).join(Sale, SaleItem.sale_id == Sale.id
    ).filter(Sale.sale_date >= df, Sale.sale_date <= dt
    ).group_by(Product.id, Product.name
    ).order_by(func.sum(SaleItem.total).desc()
    ).limit(limit).all()

    return [{"name": r.name, "qty": int(r.total_qty or 0), "sales": float(r.total_sales or 0), "profit": float(r.total_profit or 0)} for r in results]


@router.get("/expenses/by-category")
def expenses_by_category(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.expense import ExpenseCategory
    now = datetime.now(timezone.utc)
    df = datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc) if date_from else now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else now

    results = db.query(
        ExpenseCategory.name,
        ExpenseCategory.color,
        func.sum(Expense.amount).label("total"),
    ).join(Expense, Expense.category_id == ExpenseCategory.id
    ).filter(Expense.expense_date >= df, Expense.expense_date <= dt
    ).group_by(ExpenseCategory.id, ExpenseCategory.name, ExpenseCategory.color
    ).all()

    return [{"name": r.name, "color": r.color, "total": float(r.total or 0)} for r in results]
