from pydantic import BaseModel
from typing import Optional, Dict, Any


class SettingUpdate(BaseModel):
    value: Optional[str] = None


class SettingResponse(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class SettingsBulkUpdate(BaseModel):
    settings: Dict[str, Any]
