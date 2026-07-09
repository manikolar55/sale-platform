from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.deps import get_current_user
from app.models.user import User
import json

router = APIRouter(prefix="/api/backup", tags=["Backup"])


@router.get("/export")
def export_backup(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from app.models.category import Category
    from app.models.supplier import Supplier
    from app.models.product import Product
    from app.models.expense import Expense, ExpenseCategory
    from app.models.sale import Sale, SaleItem
    from app.models.setting import Setting

    categories = [{"name": c.name, "description": c.description, "icon": c.icon, "color": c.color} for c in db.query(Category).filter(Category.is_active == True).all()]
    suppliers = [{"name": s.name, "contact_person": s.contact_person, "phone": s.phone, "email": s.email, "address": s.address, "city": s.city, "notes": s.notes} for s in db.query(Supplier).filter(Supplier.is_active == True).all()]
    expense_categories = [{"name": e.name, "color": e.color, "icon": e.icon} for e in db.query(ExpenseCategory).all()]
    settings = [{"key": s.key, "value": s.value} for s in db.query(Setting).all()]

    products = []
    for p in db.query(Product).filter(Product.is_active == True).all():
        cat_name = p.category.name if p.category else None
        sup_name = p.supplier.name if p.supplier else None
        products.append({
            "name": p.name, "description": p.description, "barcode": p.barcode,
            "category_name": cat_name, "supplier_name": sup_name,
            "purchase_price": float(p.purchase_price), "sale_price": float(p.sale_price),
            "stock": p.stock, "min_stock": p.min_stock, "unit": p.unit,
        })

    expenses = []
    for e in db.query(Expense).all():
        cat_name = e.category.name if e.category else None
        expenses.append({
            "category_name": cat_name, "description": e.description,
            "amount": float(e.amount), "quantity": float(e.quantity) if e.quantity else None,
            "unit": e.unit, "vendor": e.vendor, "payment_method": e.payment_method,
            "expense_date": e.expense_date.isoformat(), "notes": e.notes,
        })

    sales = []
    for s in db.query(Sale).all():
        items = []
        for i in s.items:
            prod_name = i.product.name if i.product else None
            items.append({
                "product_name": prod_name, "quantity": i.quantity,
                "sale_price": float(i.sale_price), "purchase_price": float(i.purchase_price),
            })
        sales.append({
            "invoice_number": s.invoice_number, "customer_name": s.customer_name,
            "market_name": s.market_name, "subtotal": float(s.subtotal),
            "tax": float(s.tax), "discount": float(s.discount),
            "total": float(s.total), "profit": float(s.profit),
            "payment_method": s.payment_method, "notes": s.notes,
            "sale_date": s.sale_date.isoformat(), "items": items,
        })

    backup = {
        "version": "1.0",
        "exported_at": __import__('datetime').datetime.utcnow().isoformat(),
        "categories": categories,
        "suppliers": suppliers,
        "expense_categories": expense_categories,
        "settings": settings,
        "products": products,
        "expenses": expenses,
        "sales": sales,
    }
    return JSONResponse(content=backup, headers={"Content-Disposition": "attachment; filename=inventory-backup.json"})


@router.post("/import")
async def import_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.category import Category
    from app.models.supplier import Supplier
    from app.models.product import Product
    from app.models.expense import Expense, ExpenseCategory
    from app.models.sale import Sale, SaleItem
    from app.models.setting import Setting
    from decimal import Decimal
    from datetime import datetime

    content = await file.read()
    try:
        data = json.loads(content)
    except Exception:
        raise HTTPException(400, "Invalid backup file")

    # Settings
    for s in data.get("settings", []):
        existing = db.query(Setting).filter(Setting.key == s["key"]).first()
        if existing:
            existing.value = s["value"]
        else:
            db.add(Setting(key=s["key"], value=s["value"]))

    # Categories
    cat_map = {}
    for c in data.get("categories", []):
        existing = db.query(Category).filter(Category.name == c["name"]).first()
        if not existing:
            obj = Category(name=c["name"], description=c.get("description"), icon=c.get("icon"), color=c.get("color"))
            db.add(obj)
            db.flush()
            cat_map[c["name"]] = obj.id
        else:
            cat_map[c["name"]] = existing.id

    # Suppliers
    sup_map = {}
    for s in data.get("suppliers", []):
        existing = db.query(Supplier).filter(Supplier.name == s["name"]).first()
        if not existing:
            obj = Supplier(name=s["name"], contact_person=s.get("contact_person"), phone=s.get("phone"), email=s.get("email"), address=s.get("address"), city=s.get("city"), notes=s.get("notes"))
            db.add(obj)
            db.flush()
            sup_map[s["name"]] = obj.id
        else:
            sup_map[s["name"]] = existing.id

    # Expense categories
    exp_cat_map = {}
    for e in data.get("expense_categories", []):
        existing = db.query(ExpenseCategory).filter(ExpenseCategory.name == e["name"]).first()
        if not existing:
            obj = ExpenseCategory(name=e["name"], color=e.get("color"), icon=e.get("icon"))
            db.add(obj)
            db.flush()
            exp_cat_map[e["name"]] = obj.id
        else:
            exp_cat_map[e["name"]] = existing.id

    # Products
    prod_map = {}
    for p in data.get("products", []):
        existing = db.query(Product).filter(Product.name == p["name"]).first()
        if not existing:
            obj = Product(
                name=p["name"], description=p.get("description"), barcode=p.get("barcode"),
                category_id=cat_map.get(p.get("category_name")),
                supplier_id=sup_map.get(p.get("supplier_name")),
                purchase_price=Decimal(str(p["purchase_price"])), sale_price=Decimal(str(p["sale_price"])),
                stock=p["stock"], min_stock=p.get("min_stock", 0), unit=p.get("unit", "pcs"),
            )
            db.add(obj)
            db.flush()
            prod_map[p["name"]] = obj.id
        else:
            prod_map[p["name"]] = existing.id

    # Expenses
    for e in data.get("expenses", []):
        obj = Expense(
            category_id=exp_cat_map.get(e.get("category_name")),
            description=e["description"], amount=Decimal(str(e["amount"])),
            quantity=Decimal(str(e["quantity"])) if e.get("quantity") else None,
            unit=e.get("unit"), vendor=e.get("vendor"),
            payment_method=e.get("payment_method", "Cash"),
            expense_date=datetime.fromisoformat(e["expense_date"]),
            notes=e.get("notes"),
        )
        db.add(obj)

    # Sales
    from app.models.user import User as UserModel
    admin = db.query(UserModel).first()
    for s in data.get("sales", []):
        existing = db.query(Sale).filter(Sale.invoice_number == s["invoice_number"]).first()
        if existing:
            continue
        sale = Sale(
            invoice_number=s["invoice_number"], user_id=admin.id if admin else None,
            customer_name=s.get("customer_name"), market_name=s.get("market_name"),
            subtotal=Decimal(str(s["subtotal"])), tax=Decimal(str(s["tax"])),
            discount=Decimal(str(s["discount"])), total=Decimal(str(s["total"])),
            profit=Decimal(str(s["profit"])), payment_method=s.get("payment_method", "Cash"),
            notes=s.get("notes"), sale_date=datetime.fromisoformat(s["sale_date"]),
        )
        db.add(sale)
        db.flush()
        for i in s.get("items", []):
            pid = prod_map.get(i.get("product_name"))
            if pid:
                db.add(SaleItem(
                    sale_id=sale.id, product_id=pid, quantity=i["quantity"],
                    sale_price=Decimal(str(i["sale_price"])), purchase_price=Decimal(str(i["purchase_price"])),
                    total=Decimal(str(i["sale_price"])) * i["quantity"],
                    profit=(Decimal(str(i["sale_price"])) - Decimal(str(i["purchase_price"]))) * i["quantity"],
                ))

    db.commit()
    return {"message": "Backup restored successfully"}
