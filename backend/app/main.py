import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, SessionLocal, Base
from app.routers import auth, users, categories, suppliers, products, sales, expenses, reports, settings as settings_router, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_data(db):
    from app.models.user import Role, User, Permission
    from app.models.category import Category
    from app.models.supplier import Supplier
    from app.models.product import Product
    from app.models.expense import ExpenseCategory, Expense
    from app.models.sale import Sale, SaleItem
    from app.models.setting import Setting
    from app.utils.security import get_password_hash
    from decimal import Decimal
    from datetime import datetime, timezone, timedelta
    import random

    if db.query(Role).count() > 0:
        return

    admin_role = Role(name="admin", description="Administrator with full access")
    manager_role = Role(name="manager", description="Manager with limited access")
    employee_role = Role(name="employee", description="Employee with basic access")
    db.add_all([admin_role, manager_role, employee_role])
    db.flush()

    admin_user = User(
        username="admin",
        email="admin@stockmaster.com",
        full_name="Admin User",
        hashed_password=get_password_hash("admin123"),
        role_id=admin_role.id,
        phone="0300-1234567",
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    categories_data = [
        {"name": "Cold Drinks", "description": "All kinds of cold drinks and beverages", "icon": "Droplets", "color": "#3B82F6"},
        {"name": "Cigarettes", "description": "All types of cigarettes and tobacco products", "icon": "Wind", "color": "#8B5CF6"},
        {"name": "Snacks", "description": "Chips, biscuits and other snacks", "icon": "Cookie", "color": "#F59E0B"},
        {"name": "Daily Items", "description": "Daily use grocery and household items", "icon": "ShoppingBag", "color": "#10B981"},
        {"name": "Household", "description": "Cleaning products and household supplies", "icon": "Home", "color": "#EC4899"},
        {"name": "Personal Care", "description": "Personal care and hygiene products", "icon": "Heart", "color": "#EF4444"},
    ]
    cats = []
    for cd in categories_data:
        c = Category(**cd)
        db.add(c)
        cats.append(c)
    db.flush()

    suppliers_data = [
        {"name": "Coca Cola Pak", "contact_person": "Ali Raza", "phone": "0301-2345678", "email": "aliraza@cocacola.com.pk", "address": "Lahore", "city": "Lahore"},
        {"name": "Pepsi Co.", "contact_person": "Usman Khan", "phone": "0302-3456789", "email": "usman.khan@pepsi.com", "address": "Karachi", "city": "Karachi"},
        {"name": "ITC Pakistan", "contact_person": "Faisal Ahmad", "phone": "0303-4567890", "email": "faisal.ahmad@itc.com.pk", "address": "Islamabad", "city": "Islamabad"},
        {"name": "BAT Pakistan", "contact_person": "Sara Malik", "phone": "0304-5678901", "email": "sara.malik@pmi.com", "address": "Lahore", "city": "Lahore"},
        {"name": "Philip Morris", "contact_person": "Kamran Sheikh", "phone": "0304-5678907", "email": "kamran.sheikh@bat.com", "address": "Karachi", "city": "Karachi"},
        {"name": "Frito Lay Pakistan", "contact_person": "Bilal Hussain", "phone": "0305-6789012", "email": "bilal.hussain@fritolay.com", "address": "Lahore", "city": "Lahore"},
        {"name": "Nestle Pakistan", "contact_person": "Imran Qureshi", "phone": "0306-7890123", "email": "imran.qureshi@nestle.com", "address": "Lahore", "city": "Lahore"},
        {"name": "Unilever Pakistan", "contact_person": "Rizwan Butt", "phone": "0307-8901234", "email": "rizwan.butt@unilever.com", "address": "Karachi", "city": "Karachi"},
    ]
    sups = []
    for sd in suppliers_data:
        s = Supplier(**sd)
        db.add(s)
        sups.append(s)
    db.flush()

    products_data = [
        {"name": "Gold Leaf (20s)", "category_id": cats[1].id, "supplier_id": sups[2].id, "purchase_price": Decimal("160"), "sale_price": Decimal("200"), "stock": 80, "unit": "pkt"},
        {"name": "Capstan (20s)", "category_id": cats[1].id, "supplier_id": sups[2].id, "purchase_price": Decimal("150"), "sale_price": Decimal("190"), "stock": 60, "unit": "pkt"},
        {"name": "Marlboro (20s)", "category_id": cats[1].id, "supplier_id": sups[4].id, "purchase_price": Decimal("300"), "sale_price": Decimal("360"), "stock": 50, "unit": "pkt"},
        {"name": "L&M (20s)", "category_id": cats[1].id, "supplier_id": sups[3].id, "purchase_price": Decimal("160"), "sale_price": Decimal("210"), "stock": 70, "unit": "pkt"},
        {"name": "Dunhill (20s)", "category_id": cats[1].id, "supplier_id": sups[4].id, "purchase_price": Decimal("260"), "sale_price": Decimal("320"), "stock": 40, "unit": "pkt"},
        {"name": "Coca Cola 1.5L", "category_id": cats[0].id, "supplier_id": sups[0].id, "purchase_price": Decimal("90"), "sale_price": Decimal("120"), "stock": 100, "unit": "btl"},
        {"name": "Pepsi 1.5L", "category_id": cats[0].id, "supplier_id": sups[1].id, "purchase_price": Decimal("85"), "sale_price": Decimal("115"), "stock": 90, "unit": "btl"},
        {"name": "Lays Classic 30g", "category_id": cats[2].id, "supplier_id": sups[5].id, "purchase_price": Decimal("35"), "sale_price": Decimal("50"), "stock": 150, "unit": "pkt"},
        {"name": "Kurkure 30g", "category_id": cats[2].id, "supplier_id": sups[5].id, "purchase_price": Decimal("30"), "sale_price": Decimal("45"), "stock": 120, "unit": "pkt"},
        {"name": "Surf Excel 500g", "category_id": cats[4].id, "supplier_id": sups[7].id, "purchase_price": Decimal("180"), "sale_price": Decimal("230"), "stock": 60, "unit": "pkt"},
    ]
    prods = []
    for pd in products_data:
        p = Product(**pd)
        db.add(p)
        prods.append(p)
    db.flush()

    expense_categories_data = [
        {"name": "Rent", "color": "#3B82F6", "icon": "Home"},
        {"name": "Utilities", "color": "#8B5CF6", "icon": "Zap"},
        {"name": "Salaries", "color": "#F59E0B", "icon": "Users"},
        {"name": "Purchase", "color": "#10B981", "icon": "ShoppingCart"},
        {"name": "Miscellaneous", "color": "#EC4899", "icon": "MoreHorizontal"},
        {"name": "Marketing", "color": "#EF4444", "icon": "Megaphone"},
    ]
    exp_cats = []
    for ecd in expense_categories_data:
        ec = ExpenseCategory(**ecd)
        db.add(ec)
        exp_cats.append(ec)
    db.flush()

    now = datetime.now(timezone.utc)
    expenses_data = [
        {"category_id": exp_cats[0].id, "description": "Shop Rent - May 2024", "amount": Decimal("15000"), "payment_method": "Cash", "expense_date": now - timedelta(days=1)},
        {"category_id": exp_cats[1].id, "description": "Electricity Bill", "amount": Decimal("3250"), "payment_method": "Bank Transfer", "expense_date": now - timedelta(days=1)},
        {"category_id": exp_cats[2].id, "description": "Staff Salary", "amount": Decimal("8000"), "payment_method": "Cash", "expense_date": now - timedelta(days=2)},
        {"category_id": exp_cats[3].id, "description": "Transport / Delivery", "amount": Decimal("1800"), "payment_method": "Cash", "expense_date": now - timedelta(days=3)},
        {"category_id": exp_cats[4].id, "description": "Shop Cleaning Material", "amount": Decimal("1250"), "payment_method": "Cash", "expense_date": now - timedelta(days=4)},
        {"category_id": exp_cats[1].id, "description": "Water Bill", "amount": Decimal("650"), "payment_method": "Cash", "expense_date": now - timedelta(days=5)},
        {"category_id": exp_cats[5].id, "description": "Banner Printing", "amount": Decimal("1200"), "payment_method": "Cash", "expense_date": now - timedelta(days=7)},
        {"category_id": exp_cats[4].id, "description": "Stationery", "amount": Decimal("1000"), "payment_method": "Cash", "expense_date": now - timedelta(days=10)},
    ]
    for ed in expenses_data:
        e = Expense(**ed)
        db.add(e)
    db.flush()

    invoice_num = 1
    sales_data = []
    for i in range(8):
        sale_date = now - timedelta(days=i)
        prod = prods[i % len(prods)]
        qty = random.randint(1, 3)
        item_total = float(prod.sale_price) * qty
        item_profit = (float(prod.sale_price) - float(prod.purchase_price)) * qty
        sale = Sale(
            invoice_number=f"INV-{invoice_num:04d}",
            user_id=admin_user.id,
            subtotal=item_total,
            tax=0,
            discount=0,
            total=item_total,
            profit=item_profit,
            payment_method="Cash",
            sale_date=sale_date,
        )
        db.add(sale)
        db.flush()
        si = SaleItem(
            sale_id=sale.id,
            product_id=prod.id,
            quantity=qty,
            sale_price=prod.sale_price,
            purchase_price=prod.purchase_price,
            total=item_total,
            profit=item_profit,
        )
        db.add(si)
        invoice_num += 1

    settings_defaults = [
        Setting(key="store_name", value="Al Noor General Store"),
        Setting(key="store_address", value="Main Market, Lahore, Punjab, Pakistan"),
        Setting(key="store_phone", value="0300-1234567"),
        Setting(key="store_email", value="alnoorstore@gmail.com"),
        Setting(key="currency", value="PKR - Pakistani Rupee"),
        Setting(key="time_format", value="12 Hour (AM/PM)"),
        Setting(key="date_format", value="24 May, 2024"),
        Setting(key="language", value="English"),
        Setting(key="invoice_prefix", value="INV"),
        Setting(key="default_tax", value="0"),
        Setting(key="low_stock_alert", value="true"),
        Setting(key="auto_deduct_stock", value="true"),
        Setting(key="software_version", value="v1.0.0"),
        Setting(key="last_updated", value="20 May, 2024"),
        Setting(key="database_size", value="24.8 MB"),
        Setting(key="license_status", value="Active"),
        Setting(key="monthly_budget", value="50000"),
    ]
    db.add_all(settings_defaults)
    db.commit()
    logger.info("Seed data created successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Inventory Management System API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(settings_router.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
