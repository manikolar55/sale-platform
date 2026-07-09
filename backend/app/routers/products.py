from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import math, os, shutil, uuid
from app.database import get_db
from app.models.product import Product, ProductImage
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse)
def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Product)
    if search:
        query = query.filter(
            Product.name.ilike(f"%{search}%") |
            Product.barcode.ilike(f"%{search}%")
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if supplier_id:
        query = query.filter(Product.supplier_id == supplier_id)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if low_stock:
        query = query.filter(Product.stock <= Product.min_stock)
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return PaginatedResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total, page=page, per_page=per_page, pages=pages,
    )


@router.get("/all", response_model=list)
def all_products(
    include_zero_stock: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Product).filter(Product.is_active == True)
    if not include_zero_stock:
        query = query.filter(Product.stock > 0)
    return [ProductResponse.model_validate(p) for p in query.all()]


@router.get("/stats")
def product_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = db.query(Product).filter(Product.is_active == True).count()
    low_stock = db.query(Product).filter(Product.stock <= Product.min_stock, Product.is_active == True).count()
    out_of_stock = db.query(Product).filter(Product.stock == 0, Product.is_active == True).count()
    return {"total": total, "low_stock": low_stock, "out_of_stock": out_of_stock}


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if data.barcode and db.query(Product).filter(Product.barcode == data.barcode).first():
        raise HTTPException(400, "Barcode already exists")
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return MessageResponse(message="Product deleted")


@router.post("/{product_id}/images")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    upload_dir = os.path.join(settings.UPLOAD_DIR, "products")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    is_primary = not db.query(ProductImage).filter(ProductImage.product_id == product_id).first()
    img = ProductImage(product_id=product_id, url=f"/uploads/products/{filename}", is_primary=is_primary)
    db.add(img)
    db.commit()
    return {"url": img.url, "id": img.id}
