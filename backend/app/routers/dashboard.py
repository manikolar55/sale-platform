from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.sale import Sale, SaleItem
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
    prev_month_end = month_start
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1 query for all product counts
    product_row = db.query(
        func.count(Product.id).label('total'),
        func.sum(case((and_(Product.is_active == True, Product.stock < 10), 1), else_=0)).label('low_stock'),
    ).filter(Product.is_active == True).first()

    # 1 query for all sale aggregations
    sale_row = db.query(
        func.sum(case((Sale.sale_date >= today_start, Sale.total), else_=0)).label('today_sales'),
        func.sum(case((and_(Sale.sale_date >= yesterday_start, Sale.sale_date < today_start), Sale.total), else_=0)).label('yesterday_sales'),
        func.sum(case((Sale.sale_date >= month_start, Sale.total), else_=0)).label('monthly_sales'),
        func.sum(case((and_(Sale.sale_date >= prev_month_start, Sale.sale_date < prev_month_end), Sale.total), else_=0)).label('prev_monthly_sales'),
        func.sum(case((Sale.sale_date >= month_start, Sale.profit), else_=0)).label('monthly_profit'),
        func.sum(case((and_(Sale.sale_date >= prev_month_start, Sale.sale_date < prev_month_end), Sale.profit), else_=0)).label('prev_monthly_profit'),
    ).first()

    # 1 query for all expense aggregations
    exp_row = db.query(
        func.sum(case((Expense.expense_date >= month_start, Expense.amount), else_=0)).label('total_expenses'),
        func.sum(case((and_(Expense.expense_date >= prev_month_start, Expense.expense_date < prev_month_end), Expense.amount), else_=0)).label('prev_total_expenses'),
    ).first()

    monthly_profit = float(sale_row.monthly_profit or 0)
    prev_monthly_profit = float(sale_row.prev_monthly_profit or 0)
    total_expenses = float(exp_row.total_expenses or 0)
    prev_total_expenses = float(exp_row.prev_total_expenses or 0)

    return {
        "total_products": int(product_row.total or 0),
        "low_stock_count": int(product_row.low_stock or 0),
        "today_sales": float(sale_row.today_sales or 0),
        "yesterday_sales": float(sale_row.yesterday_sales or 0),
        "monthly_sales": float(sale_row.monthly_sales or 0),
        "prev_monthly_sales": float(sale_row.prev_monthly_sales or 0),
        "total_profit": monthly_profit,
        "prev_total_profit": prev_monthly_profit,
        "total_expenses": total_expenses,
        "prev_total_expenses": prev_total_expenses,
        "net_profit": monthly_profit - total_expenses,
        "prev_net_profit": prev_monthly_profit - prev_total_expenses,
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
    item_count_sub = (
        db.query(SaleItem.sale_id, func.count(SaleItem.id).label("cnt"))
        .group_by(SaleItem.sale_id)
        .subquery()
    )
    rows = (
        db.query(Sale, func.coalesce(item_count_sub.c.cnt, 0).label("item_count"))
        .outerjoin(item_count_sub, item_count_sub.c.sale_id == Sale.id)
        .order_by(Sale.sale_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "invoice_number": s.invoice_number,
            "customer_name": s.customer_name,
            "market_name": s.market_name,
            "total": float(s.total),
            "profit": float(s.profit),
            "sale_date": s.sale_date.isoformat(),
            "item_count": cnt,
        }
        for s, cnt in rows
    ]
