from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import math
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/categories", tags=["Categories"])


def _with_total(cat: Category, db: Session) -> CategoryResponse:
    total = db.query(Product).filter(Product.category_id == cat.id, Product.is_active == True).count()
    resp = CategoryResponse.model_validate(cat)
    resp.total_products = total
    return resp


@router.get("", response_model=PaginatedResponse)
def list_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Category)
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return PaginatedResponse(
        items=[_with_total(c, db) for c in items],
        total=total, page=page, per_page=per_page, pages=pages,
    )


@router.get("/all", response_model=list)
def all_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cats = db.query(Category).filter(Category.is_active == True).all()
    return [CategoryResponse.model_validate(c) for c in cats]


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(400, "Category name already exists")
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _with_total(cat, db)


@router.get("/{cat_id}", response_model=CategoryResponse)
def get_category(cat_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    return _with_total(cat, db)


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return _with_total(cat, db)


@router.delete("/{cat_id}", response_model=MessageResponse)
def delete_category(cat_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
    return MessageResponse(message="Category deleted")
