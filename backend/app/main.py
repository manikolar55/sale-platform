import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, SessionLocal, Base
from app.routers import auth, users, categories, suppliers, products, sales, expenses, reports, settings as settings_router, dashboard, backup
from app.routers import customers as customers_router
from app.routers import purchases as purchases_router
from app.models import customer as _customer_models  # noqa: F401 — ensures tables are registered with Base.metadata
from app.models import purchase as _purchase_models  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_data(db):
    from app.models.user import Role, User
    from app.models.setting import Setting
    from app.utils.security import get_password_hash

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
        is_active=True,
    )
    db.add(admin_user)

    settings_defaults = [
        Setting(key="store_name", value="Gohar Butt"),
        Setting(key="store_address", value=""),
        Setting(key="store_phone", value=""),
        Setting(key="store_email", value=""),
        Setting(key="currency", value="PKR - Pakistani Rupee"),
        Setting(key="invoice_prefix", value="INV"),
        Setting(key="default_tax", value="0"),
        Setting(key="low_stock_alert", value="true"),
        Setting(key="auto_deduct_stock", value="true"),
        Setting(key="monthly_budget", value="50000"),
    ]
    db.add_all(settings_defaults)
    db.commit()
    logger.info("Initial setup complete")


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
app.include_router(backup.router)
app.include_router(customers_router.router)
app.include_router(purchases_router.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
