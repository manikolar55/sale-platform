from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
import math
from datetime import datetime, timezone
from app.database import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.setting import Setting
from app.schemas.sale import SaleCreate, SaleResponse, SaleListResponse, CustomerBalanceInfo
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/sales", tags=["Sales"])


def _get_invoice_prefix(db: Session) -> str:
    s = db.query(Setting).filter(Setting.key == "invoice_prefix").first()
    return s.value if s else "INV"


def _generate_invoice_number(db: Session) -> str:
    prefix = _get_invoice_prefix(db)
    count = db.query(Sale).count() + 1
    return f"{prefix}-{count:04d}"


@router.get("", response_model=PaginatedResponse)
def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Sale).order_by(Sale.sale_date.desc())
    if search:
        query = query.filter(Sale.invoice_number.ilike(f"%{search}%"))
    if payment_method:
        query = query.filter(Sale.payment_method == payment_method)
    if date_from:
        query = query.filter(Sale.sale_date >= datetime.fromisoformat(date_from).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Sale.sale_date <= datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc))
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for sale in items:
        item_count = len(sale.items)
        s = SaleListResponse(
            id=sale.id,
            invoice_number=sale.invoice_number,
            customer_name=sale.customer_name,
            market_name=sale.market_name,
            total=sale.total,
            profit=sale.profit,
            payment_method=sale.payment_method,
            sale_date=sale.sale_date,
            item_count=item_count,
        )
        result.append(s)
    return PaginatedResponse(items=result, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/stats")
def sale_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales = db.query(func.sum(Sale.total)).filter(Sale.sale_date >= today_start).scalar() or 0
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_sales = db.query(func.sum(Sale.total)).filter(Sale.sale_date >= month_start).scalar() or 0
    monthly_profit = db.query(func.sum(Sale.profit)).filter(Sale.sale_date >= month_start).scalar() or 0
    return {
        "today_sales": float(today_sales),
        "monthly_sales": float(monthly_sales),
        "monthly_profit": float(monthly_profit),
    }


@router.post("", response_model=SaleResponse, status_code=201)
def create_sale(data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice_number = _generate_invoice_number(db)
    subtotal = 0
    profit = 0
    sale_items = []

    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        if product.stock < item_data.quantity:
            raise HTTPException(400, f"Insufficient stock for {product.name}")
        item_total = float(item_data.sale_price) * item_data.quantity
        item_profit = (float(item_data.sale_price) - float(product.purchase_price)) * item_data.quantity
        subtotal += item_total
        profit += item_profit
        sale_items.append(SaleItem(
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            sale_price=item_data.sale_price,
            purchase_price=product.purchase_price,
            total=item_total,
            profit=item_profit,
        ))
        product.stock -= item_data.quantity

    tax_amount = subtotal * float(data.tax) / 100 if data.tax else 0
    total = subtotal + tax_amount - float(data.discount)

    sale = Sale(
        invoice_number=invoice_number,
        user_id=current_user.id,
        customer_name=data.customer_name,
        market_name=data.market_name,
        subtotal=subtotal,
        tax=tax_amount,
        discount=data.discount,
        total=total,
        profit=profit,
        payment_method=data.payment_method,
        notes=data.notes,
        customer_id=data.customer_id,
        is_credit=data.is_credit,
    )
    db.add(sale)
    db.flush()
    for item in sale_items:
        item.sale_id = sale.id
        db.add(item)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from app.models.customer import Customer, CustomerPayment
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")

    response = SaleResponse.model_validate(sale)

    if sale.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        if customer:
            total_credit = db.query(func.sum(Sale.total)).filter(
                Sale.customer_id == sale.customer_id,
                Sale.is_credit == True,
            ).scalar() or 0
            total_paid = db.query(func.sum(CustomerPayment.amount)).filter(
                CustomerPayment.customer_id == sale.customer_id,
            ).scalar() or 0
            current_balance = float(total_credit) - float(total_paid)
            # prev = balance before this sale (undo this sale's effect)
            prev_balance = current_balance - float(sale.total) if sale.is_credit else current_balance + float(sale.total)
            response.customer_info = CustomerBalanceInfo(
                name=customer.name,
                phone=customer.phone,
                prev_balance=round(prev_balance, 2),
                current_balance=round(current_balance, 2),
            )

    return response


@router.delete("/{sale_id}", response_model=MessageResponse)
def delete_sale(sale_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
    db.delete(sale)
    db.commit()
    return MessageResponse(message="Sale deleted and stock restored")
