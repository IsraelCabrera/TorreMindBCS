from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db_session, staff_or_admin
from app.models.visit_record import VisitRecord
from app.models.metric_log import MetricLog
from app.models.delivery import DeliveryRecord
from app.config import settings

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


@router.get("/deliveries")
async def delivery_report(
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    start = datetime.fromisoformat(from_date).replace(tzinfo=timezone.utc) if from_date else None
    end = datetime.fromisoformat(to_date).replace(tzinfo=timezone.utc) if to_date else None

    query = select(DeliveryRecord)
    if start:
        query = query.where(DeliveryRecord.check_in_at >= start)
    if end:
        query = query.where(DeliveryRecord.check_in_at <= end)

    result = await db.execute(query)
    deliveries = result.scalars().all()

    total_received = len(deliveries)
    collected = [d for d in deliveries if d.status == "collected"]
    pending = [d for d in deliveries if d.status == "pending"]
    collected_by_owner = [d for d in collected if d.collected_by == "owner"]
    collected_by_other = [d for d in collected if d.collected_by == "other"]

    daily: dict[str, dict] = {}
    for d in deliveries:
        day = d.check_in_at.date().isoformat()
        if day not in daily:
            daily[day] = {"date": day, "received": 0, "collected": 0}
        daily[day]["received"] += 1
        if d.status == "collected":
            daily[day]["collected"] += 1

    return {
        "total_received": total_received,
        "total_collected": len(collected),
        "pending": len(pending),
        "collected_by_owner": len(collected_by_owner),
        "collected_by_other": len(collected_by_other),
        "daily": sorted(daily.values(), key=lambda x: x["date"]),
    }


@router.get("/eod")
async def eod_report(
    date: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    """
    End-of-Day report for a specific date.
    Defaults to yesterday (since EOD job runs at 23:59).
    Computed on-demand from existing tables.
    """
    tz = ZoneInfo(settings.eod_timezone)
    now = datetime.now(tz)
    
    if date:
        target_date = datetime.fromisoformat(date).date()
    else:
        # Default to yesterday since EOD runs at 23:59
        target_date = (now - timedelta(days=1)).date()

    # Visits for the target date
    visits_stmt = (
        select(VisitRecord)
        .where(func.date(VisitRecord.check_in_at) == target_date)
        .options(selectinload(VisitRecord.visitor))
    )
    visits_result = await db.execute(visits_stmt)
    visits = visits_result.scalars().all()

    total_visits = len(visits)
    manual_checkouts = [v for v in visits if v.status == "checked_out" and v.escalation_state != "auto_eod"]
    auto_checkouts = [v for v in visits if v.status == "checked_out" and v.escalation_state == "auto_eod"]
    still_inside = [v for v in visits if v.check_out_at is None]

    # Deliveries for the target date
    deliveries_stmt = select(DeliveryRecord).where(func.date(DeliveryRecord.check_in_at) == target_date)
    deliveries_result = await db.execute(deliveries_stmt)
    deliveries = deliveries_result.scalars().all()

    deliveries_received = len(deliveries)
    deliveries_pending = [d for d in deliveries if d.status == "pending"]
    deliveries_collected = [d for d in deliveries if d.status == "collected"]

    return {
        "date": target_date.isoformat(),
        "generated_at": now.isoformat(),
"visits": {
            "total": total_visits,
            "manual_checkouts": len(manual_checkouts),
            "auto_checkouts_eod": len(auto_checkouts),
            "still_inside": len(still_inside),
        },
        "deliveries": {
            "received": deliveries_received,
            "pending": len(deliveries_pending),
            "collected": len(deliveries_collected),
        },
        "auto_checkout_details": [
            {
                "visit_id": str(v.id),
                "visitor_name": v.visitor.name if v.visitor else "Unknown",
                "check_in_at": v.check_in_at.isoformat(),
                "check_out_at": v.check_out_at.isoformat() if v.check_out_at else None,
                "host_name": v.host_name,
                "purpose": v.purpose,
            }
            for v in auto_checkouts
        ],
        "pending_deliveries": [
            {
                "delivery_id": str(d.id),
                "courier": d.courier,
                "recipient_name": d.recipient_name,
                "check_in_at": d.check_in_at.isoformat(),
                "guide_number": d.guide_number,
            }
            for d in deliveries_pending
        ],
    }
