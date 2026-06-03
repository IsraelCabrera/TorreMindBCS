from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, staff_or_admin
from app.models.visit_record import VisitRecord
from app.models.metric_log import MetricLog

router = APIRouter()


@router.get("/daily")
async def daily_report(
    date: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    from datetime import date as date_type
    target_date = datetime.fromisoformat(date).date() if date else datetime.now(timezone.utc).date()

    stmt = select(
        VisitRecord.visitor_type,
        func.count(VisitRecord.id).label("count"),
    ).where(
        func.date(VisitRecord.check_in_at) == target_date
    ).group_by(VisitRecord.visitor_type)
    result = await db.execute(stmt)
    rows = result.all()
    total = sum(r.count for r in rows)
    return {"date": target_date.isoformat(), "total": total, "breakdown": {r.visitor_type: r.count for r in rows}}


@router.get("/metrics")
async def metrics(
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    stmt = select(
        MetricLog.action,
        func.avg(MetricLog.duration_ms).label("avg_ms"),
        func.min(MetricLog.duration_ms).label("min_ms"),
        func.max(MetricLog.duration_ms).label("max_ms"),
        func.count(MetricLog.id).label("count"),
    )
    if from_date:
        stmt = stmt.where(MetricLog.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        stmt = stmt.where(MetricLog.created_at <= datetime.fromisoformat(to_date))
    stmt = stmt.group_by(MetricLog.action)
    result = await db.execute(stmt)
    rows = result.all()
    return {
        r.action: {"avg_ms": int(r.avg_ms), "min_ms": r.min_ms, "max_ms": r.max_ms, "count": r.count}
        for r in rows
    }
