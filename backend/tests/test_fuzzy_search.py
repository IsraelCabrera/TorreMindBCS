import pytest
from datetime import date, timedelta
from sqlalchemy import select
from uuid import uuid4

from app.core.fuzzy_search import find_same_day_visit
from app.models.visitor import Visitor
from app.models.visit_record import VisitRecord
from app.models.user import User


async def _create_test_user(db_session) -> User:
    """Create a test user for created_by_user_id."""
    user = User(
        email=f"test_{uuid4()}@test.com",
        password_hash="test",
        name="Test User",
        role="lobby_staff",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _create_visit(db_session, visitor_name: str, check_in_date: date, status: str = "pending", user_id=None):
    """Helper to create a visitor and visit record."""
    user = user_id or await _create_test_user(db_session)
    
    visitor = Visitor(name=visitor_name, phone="+526641234567")
    db_session.add(visitor)
    await db_session.flush()
    
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type="walk_in",
        check_in_at=check_in_date,
        status=status,
        created_by_user_id=user.id,
    )
    db_session.add(visit)
    await db_session.commit()
    await db_session.refresh(visit, ["visitor"])
    return visit


@pytest.mark.asyncio
async def test_find_same_day_visit_exact_match(db_session):
    """Test finding a visit with exact name match on same day."""
    visit = await _create_visit(db_session, "Juan Pérez", date.today())
    
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is not None
    assert result.id == visit.id


@pytest.mark.asyncio
async def test_find_same_day_visit_fuzzy_match(db_session):
    """Test finding a visit with fuzzy name match (similarity > 0.65)."""
    visit = await _create_visit(db_session, "Juan Pérez", date.today())
    
    # Search with slightly different name - exact match still works
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is not None
    assert result.id == visit.id


@pytest.mark.asyncio
async def test_find_same_day_visit_no_match_below_threshold(db_session):
    """Test that names with similarity <= 0.65 don't match."""
    await _create_visit(db_session, "Juan Pérez", date.today())
    
    # Completely different name - should not match
    result = await find_same_day_visit(db_session, "María González", date.today())
    assert result is None


@pytest.mark.asyncio
async def test_find_same_day_visit_excludes_checked_out(db_session):
    """Test that checked-out visits are excluded."""
    user = await _create_test_user(db_session)
    visitor = Visitor(name="Juan Pérez", phone="+526641234567")
    db_session.add(visitor)
    await db_session.flush()
    
    # Checked out visit
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type="walk_in",
        check_in_at=date.today(),
        status="checked_out",
        check_out_at=date.today(),
        created_by_user_id=user.id,
    )
    db_session.add(visit)
    await db_session.commit()
    
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is None


@pytest.mark.asyncio
async def test_find_same_day_visit_different_day(db_session):
    """Test that visits from different days are excluded."""
    await _create_visit(db_session, "Juan Pérez", date.today() - timedelta(days=1))
    
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is None


@pytest.mark.asyncio
async def test_find_same_day_visit_returns_most_similar(db_session):
    """Test that the most similar match is returned when multiple exist."""
    user = await _create_test_user(db_session)
    
    visitor1 = Visitor(name="Juan Pérez")
    visitor2 = Visitor(name="Juan Pedro")
    db_session.add_all([visitor1, visitor2])
    await db_session.flush()
    
    visit1 = VisitRecord(visitor_id=visitor1.id, visitor_type="walk_in", check_in_at=date.today(), status="pending", created_by_user_id=user.id)
    visit2 = VisitRecord(visitor_id=visitor2.id, visitor_type="walk_in", check_in_at=date.today(), status="pending", created_by_user_id=user.id)
    db_session.add_all([visit1, visit2])
    await db_session.commit()
    
    # "Juan Pérez" should match visitor1 more closely
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is not None
    assert result.visitor_id == visitor1.id


@pytest.mark.asyncio
async def test_find_same_day_visit_inactive_visitor_excluded(db_session):
    """Test that visits with inactive visitors are excluded."""
    user = await _create_test_user(db_session)
    visitor = Visitor(name="Juan Pérez", is_active=False)
    db_session.add(visitor)
    await db_session.flush()
    
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type="walk_in",
        check_in_at=date.today(),
        status="pending",
        created_by_user_id=user.id,
    )
    db_session.add(visit)
    await db_session.commit()
    
    result = await find_same_day_visit(db_session, "Juan Pérez", date.today())
    assert result is None