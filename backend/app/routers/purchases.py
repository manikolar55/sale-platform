from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import math
from app.database import get_db
from app.models.purchase import Purchase, PurchaseItem
from app.models.product import Product
from app.schemas.purchase import PurchaseCreate, PurchaseResponse, PurchaseListResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


def _generate_po_number(db: Session) -> str:
    count = db.query(Purchase).count() + 1
    return f"PO-{count:04d}"


@router.get("", response_model=PaginatedResponse)
def list_purchases(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Purchase).order_by(Purchase.purchase_date.desc())
    if search:
        query = query.filter(Purchase.invoice_number.ilike(f"%{search}%"))
    if supplier_id:
        query = query.filter(Purchase.supplier_id == supplier_id)
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    result = []
    for p in items:
        result.append(PurchaseListResponse(
            id=p.id,
            invoice_number=p.invoice_number,
            supplier=p.supplier,
            total_cost=p.total_cost,
            purchase_date=p.purchase_date,
            item_count=len(p.items),
        ))
    return PaginatedResponse(items=result, total=total, page=page, per_page=per_page, pages=pages)


@router.post("", response_model=PurchaseResponse, status_code=201)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice_number = _generate_po_number(db)
    total_cost = 0.0
    purchase_items = []

    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item_data.product_id} not found")
        item_total = float(item_data.purchase_price) * item_data.quantity
        total_cost += item_total
        purchase_items.append(PurchaseItem(
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            purchase_price=item_data.purchase_price,
            total=item_total,
        ))
        product.stock += item_data.quantity
        product.purchase_price = item_data.purchase_price

    purchase = Purchase(
        invoice_number=invoice_number,
        supplier_id=data.supplier_id,
        user_id=current_user.id,
        total_cost=total_cost,
        notes=data.notes,
    )
    db.add(purchase)
    db.flush()
    for item in purchase_items:
        item.purchase_id = purchase.id
        db.add(item)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(purchase_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(404, "Purchase not found")
    return purchase


@router.delete("/{purchase_id}", response_model=MessageResponse)
def delete_purchase(purchase_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(404, "Purchase not found")
    for item in purchase.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock = max(0, product.stock - item.quantity)
    db.delete(purchase)
    db.commit()
    return MessageResponse(message="Purchase deleted and stock reversed")
