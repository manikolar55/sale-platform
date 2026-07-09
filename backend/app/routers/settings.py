from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.setting import Setting
from app.schemas.setting import SettingResponse, SettingsBulkUpdate
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "store_name": "Al Noor General Store",
    "store_address": "Main Market, Lahore, Punjab, Pakistan",
    "store_phone": "0300-1234567",
    "store_email": "alnoorstore@gmail.com",
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
