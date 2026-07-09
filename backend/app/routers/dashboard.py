from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.sale import Sale
from app.models.expense import Expense
from app.models.product import Product
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Previous month window
    prev_month_end = month_start
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_products = db.query(Product).filter(Product.is_active == True).count()
    low_stock_count = db.query(Product).filter(
        Product.is_active == True, Product.stock < 10
    ).count()

    today_sales = db.query(func.sum(Sale.total)).filter(Sale.sale_date >= today_start).scalar() or 0
    yesterday_sales = db.query(func.sum(Sale.total)).filter(
        Sale.sale_date >= yesterday_start, Sale.sale_date < today_start
    ).scalar() or 0

    monthly_sales = db.query(func.sum(Sale.total)).filter(Sale.sale_date >= month_start).scalar() or 0
    prev_monthly_sales = db.query(func.sum(Sale.total)).filter(
        Sale.sale_date >= prev_month_start, Sale.sale_date < prev_month_end
    ).scalar() or 0

    monthly_profit = db.query(func.sum(Sale.profit)).filter(Sale.sale_date >= month_start).scalar() or 0
    prev_monthly_profit = db.query(func.sum(Sale.profit)).filter(
        Sale.sale_date >= prev_month_start, Sale.sale_date < prev_month_end
    ).scalar() or 0

    total_expenses = db.query(func.sum(Expense.amount)).filter(Expense.expense_date >= month_start).scalar() or 0
    prev_total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.expense_date >= prev_month_start, Expense.expense_date < prev_month_end
    ).scalar() or 0

    net_profit = float(monthly_profit) - float(total_expenses)
    prev_net_profit = float(prev_monthly_profit) - float(prev_total_expenses)

    return {
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "today_sales": float(today_sales),
        "yesterday_sales": float(yesterday_sales),
        "monthly_sales": float(monthly_sales),
        "prev_monthly_sales": float(prev_monthly_sales),
        "total_profit": float(monthly_profit),
        "prev_total_profit": float(prev_monthly_profit),
        "total_expenses": float(total_expenses),
        "prev_total_expenses": float(prev_total_expenses),
        "net_profit": net_profit,
        "prev_net_profit": prev_net_profit,
    }


@router.get("/low-stock")
def low_stock_products(
    threshold: int = Query(10, ge=1),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    products = (
        db.query(Product)
        .filter(Product.is_active == True, Product.stock < threshold)
        .order_by(Product.stock.asc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "min_stock": p.min_stock,
            "unit": p.unit,
            "category": p.category.name if p.category else None,
            "sale_price": float(p.sale_price),
        }
        for p in products
    ]


@router.get("/recent-sales")
def recent_sales(limit: int = 8, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    sales = db.query(Sale).order_by(Sale.sale_date.desc()).limit(limit).all()
    return [
        {
            "id": s.id,
            "invoice_number": s.invoice_number,
            "customer_name": s.customer_name,
            "market_name": s.market_name,
            "total": float(s.total),
            "profit": float(s.profit),
            "sale_date": s.sale_date.isoformat(),
            "item_count": len(s.items),
        }
        for s in sales
    ]
