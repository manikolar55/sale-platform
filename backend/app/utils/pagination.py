from typing import TypeVar, Type, Optional
from sqlalchemy.orm import Query
from app.schemas.common import PaginatedResponse
import math

T = TypeVar("T")


def paginate(query: Query, page: int, per_page: int, schema_class: Type[T]) -> PaginatedResponse:
    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return PaginatedResponse(
        items=[schema_class.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )
