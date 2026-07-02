import pytest
import pytest_asyncio
from datetime import date, time, timedelta, datetime, timezone
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock

from app.worker import eod_auto_checkout_and_report
from app.models.visit_record import VisitRecord
from app.models.delivery import DeliveryRecord
from app.models.visitor import Visitor
from app.models.user import User
from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession


@pytest_asyncio.fixture
async def eod_test_user(db_session):
    user = User(email="eodtest@test.com", password_hash="test", name="EOD Test", role="lobby_staff", is_active=True)
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def eod_test_visitor(db_session):
    visitor = Visitor(name="EOD Visitor", phone="+526649999999")
    db_session.add(visitor)
    await db_session.flush()
    return visitor


@pytest.mark.asyncio
async def test_eod_report_endpoint_defaults_to_yesterday(client, admin_headers):
    """Test that EOD report defaults to yesterday."""
    resp = await client.get("/api/v1/reports/eod", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "date" in data
    assert "visits" in data
    assert "deliveries" in data
    assert "auto_checkout_details" in data
    assert "pending_deliveries" in data
    # Date should be yesterday
    from datetime import date, timedelta
    expected_date = (date.today() - timedelta(days=1)).isoformat()
    assert data["date"] == expected_date


@pytest.mark.asyncio
async def test_eod_report_endpoint_with_date_param(client, admin_headers):
    """Test EOD report with specific date parameter."""
    test_date = "2026-01-15"
    resp = await client.get(f"/api/v1/reports/eod?date={test_date}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == test_date


@pytest.mark.asyncio
async def test_eod_report_structure(client, admin_headers):
    """Test EOD report returns expected structure."""
    resp = await client.get("/api/v1/reports/eod", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    
    # Check main sections
    assert "visits" in data
    assert "deliveries" in data
    assert "auto_checkout_details" in data
    assert "pending_deliveries" in data
    
    # Check visits sub-structure
    visits = data["visits"]
    assert "total" in visits
    assert "manual_checkouts" in visits
    assert "auto_checkouts_eod" in visits
    assert "still_inside" in visits
    
    # Check deliveries sub-structure
    deliveries = data["deliveries"]
    assert "received" in deliveries
    assert "pending" in deliveries
    assert "collected" in deliveries
    
    # Check auto_checkout_details is a list
    assert isinstance(data["auto_checkout_details"], list)
    
    # Check pending_deliveries is a list
    assert isinstance(data["pending_deliveries"], list)


@pytest.mark.asyncio
async def test_eod_job_runs_without_error(db_session, eod_test_user, eod_test_visitor):
    """Test that EOD job function executes without raising exceptions."""
    # This test verifies the function runs without crashing
    with patch("app.worker.datetime") as mock_dt:
        mock_tz = ZoneInfo("America/Tijuana")
        mock_now = datetime.combine(date.today(), time(23, 59)).replace(tzinfo=mock_tz)
        mock_dt.now.return_value = mock_now
        mock_dt.combine = datetime.combine
        mock_dt.timezone = timezone

        with patch("app.worker.ZoneInfo", return_value=mock_tz):
            with patch("app.worker.emit_visit_update") as mock_emit:
                with patch("app.worker.log_audit") as mock_audit:
                    with patch("app.worker.notify_host") as mock_notify:
                        with patch("app.core.metrics.log_metric") as mock_metric:
                            ctx = {}
                            await eod_auto_checkout_and_report(ctx)
    
    # Should not raise any exceptions
    assert True


@pytest.mark.asyncio
async def test_eod_config_values():
    """Test that EOD config values are properly set."""
    assert settings.eod_checkout_hour == 23
    assert settings.eod_checkout_minute == 59
    assert settings.eod_timezone == "America/Tijuana"
    assert settings.whatsapp_auto_eod_notify == False