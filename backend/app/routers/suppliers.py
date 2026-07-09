from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import math
from app.database import get_db
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("", response_model=PaginatedResponse)
def list_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Supplier)
    if search:
        query = query.filter(
            Supplier.name.ilike(f"%{search}%") |
            Supplier.contact_person.ilike(f"%{search}%") |
            Supplier.phone.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return PaginatedResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total, page=page, per_page=per_page, pages=pages,
    )


@router.get("/all", response_model=list)
def all_suppliers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    suppliers = db.query(Supplier).filter(Supplier.is_active == True).all()
    return [SupplierResponse.model_validate(s) for s in suppliers]


@router.get("/stats")
def supplier_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = db.query(Supplier).count()
    active = db.query(Supplier).filter(Supplier.is_active == True).count()
    return {"total": total, "active": active}


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{sup_id}", response_model=SupplierResponse)
def get_supplier(sup_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    return supplier


@router.put("/{sup_id}", response_model=SupplierResponse)
def update_supplier(sup_id: int, data: SupplierUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{sup_id}", response_model=MessageResponse)
def delete_supplier(sup_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    db.delete(supplier)
    db.commit()
    return MessageResponse(message="Supplier deleted")
