from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import math
from datetime import datetime, timezone
from app.database import get_db
from app.models.customer import Customer, CustomerPayment
from app.models.sale import Sale
from app.utils.deps import get_current_user
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerPaymentCreate

router = APIRouter(prefix="/api/customers", tags=["Customers"])


def get_customer_balance(db, customer_id):
    credit_sales = db.query(func.sum(Sale.total)).filter(Sale.customer_id == customer_id, Sale.is_credit == True).scalar() or 0
    total_paid = db.query(func.sum(CustomerPayment.amount)).filter(CustomerPayment.customer_id == customer_id).scalar() or 0
    return float(credit_sales), float(total_paid), float(credit_sales) - float(total_paid)


@router.get("")
def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Customer).filter(Customer.is_active == True).order_by(Customer.name)
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%"))
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    customers = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for c in customers:
        credit, paid, balance = get_customer_balance(db, c.id)
        items.append({
            "id": c.id, "name": c.name, "phone": c.phone, "city": c.city,
            "credit_limit": float(c.credit_limit or 0),
            "total_credit": credit, "total_paid": paid, "balance": balance,
            "is_active": c.is_active, "created_at": c.created_at.isoformat()
        })
    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.get("/all")
def all_customers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customers = db.query(Customer).filter(Customer.is_active == True).order_by(Customer.name).all()
    return [{"id": c.id, "name": c.name, "phone": c.phone} for c in customers]


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    credit, paid, balance = get_customer_balance(db, c.id)
    recent_sales = db.query(Sale).filter(Sale.customer_id == c.id).order_by(Sale.sale_date.desc()).limit(10).all()
    recent_payments = db.query(CustomerPayment).filter(CustomerPayment.customer_id == c.id).order_by(CustomerPayment.payment_date.desc()).limit(10).all()
    return {
        "id": c.id, "name": c.name, "phone": c.phone, "address": c.address,
        "city": c.city, "notes": c.notes, "credit_limit": float(c.credit_limit or 0),
        "total_credit": credit, "total_paid": paid, "balance": balance,
        "is_active": c.is_active, "created_at": c.created_at.isoformat(),
        "recent_sales": [{"id": s.id, "invoice_number": s.invoice_number, "total": float(s.total), "is_credit": s.is_credit, "sale_date": s.sale_date.isoformat()} for s in recent_sales],
        "recent_payments": [{"id": p.id, "amount": float(p.amount), "payment_method": p.payment_method, "notes": p.notes, "payment_date": p.payment_date.isoformat()} for p in recent_payments],
    }


@router.post("")
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = Customer(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "message": "Customer created"}


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return {"message": "Customer updated"}


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    c.is_active = False
    db.commit()
    return {"message": "Customer deleted"}


@router.post("/{customer_id}/payments")
def add_payment(customer_id: int, data: CustomerPaymentCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    payment = CustomerPayment(
        customer_id=customer_id,
        amount=data.amount,
        payment_method=data.payment_method,
        notes=data.notes,
        payment_date=data.payment_date or datetime.now(timezone.utc),
    )
    db.add(payment)
    db.commit()
    return {"message": "Payment recorded"}
