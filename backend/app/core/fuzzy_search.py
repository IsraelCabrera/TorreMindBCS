from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visit_record import VisitRecord
from app.models.visitor import Visitor


async def find_same_day_visit(
    db: AsyncSession,
    visitor_name: str,
    check_date: date,
) -> VisitRecord | None:
    """
    Find a same-day visit for a visitor with a similar name using pg_trgm similarity.
    
    Returns the most similar active visit (check_out_at IS NULL) for today,
    or None if no similar visit found.
    
    Threshold: similarity > 0.65
    """
    stmt = (
        select(VisitRecord)
        .join(Visitor, VisitRecord.visitor_id == Visitor.id)
        .where(
            func.date(VisitRecord.check_in_at) == check_date,
            VisitRecord.check_out_at.is_(None),
            Visitor.is_active == True,
            func.similarity(Visitor.name, visitor_name) > 0.65,
        )
        .order_by(func.similarity(Visitor.name, visitor_name).desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()