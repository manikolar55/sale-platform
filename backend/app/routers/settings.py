from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.models.setting import Setting
from app.schemas.setting import SettingResponse, SettingsBulkUpdate
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "store_name": "Gohar Butt",
    "store_address": "Main Market, Gujranwala, Punjab, Pakistan",
    "store_phone": "",
    "store_email": "",
    "currency": "PKR - Pakistani Rupee",
    "time_format": "12 Hour (AM/PM)",
    "date_format": "24 May, 2024",
    "language": "English",
    "invoice_prefix": "INV",
    "default_tax": "0",
    "low_stock_alert": "true",
    "auto_deduct_stock": "true",
    "software_version": "v1.0.0",
    "last_updated": "20 May, 2024",
    "database_size": "24.8 MB",
    "license_status": "Active",
    "monthly_budget": "50000",
}


def ensure_defaults(db: Session):
    for key, value in DEFAULT_SETTINGS.items():
        if not db.query(Setting).filter(Setting.key == key).first():
            db.add(Setting(key=key, value=value))
    db.commit()


@router.get("", response_model=List[SettingResponse])
def get_settings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ensure_defaults(db)
    settings = db.query(Setting).all()
    return [SettingResponse.model_validate(s) for s in settings]


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ensure_defaults(db)
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        return SettingResponse(key=key, value=None)
    return setting


@router.put("/bulk", response_model=List[SettingResponse])
def bulk_update_settings(data: SettingsBulkUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    updated = []
    for key, value in data.settings.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            setting = Setting(key=key, value=str(value))
            db.add(setting)
        db.flush()
        updated.append(setting)
    db.commit()
    return [SettingResponse.model_validate(s) for s in updated]


@router.get("/system/info")
def system_info(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    try:
        result = db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))")).scalar()
        db_size = result or "N/A"
    except Exception:
        db_size = "N/A"

    from app.models.sale import Sale
    from app.models.product import Product
    from app.models.expense import Expense

    return {
        "software_version": "v1.0.0",
        "last_updated": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "database_size": db_size,
        "license_status": "Active",
        "total_products": db.query(Product).count(),
        "total_sales": db.query(Sale).count(),
        "total_expenses": db.query(Expense).count(),
    }


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, value: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting
