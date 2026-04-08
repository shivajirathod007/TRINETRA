import pytest
from datetime import date, datetime, time, timezone

from workers.schedule_utils import compute_next_run_at


# Fixed reference datetime: 2024-03-13 (Wednesday) at 10:00 UTC
# weekday() == 2 (Wednesday)
REF = datetime(2024, 3, 13, 10, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# daily
# ---------------------------------------------------------------------------

def test_daily_time_in_future_today():
    # 14:00 is after REF (10:00) → should return today at 14:00
    t = time(14, 0, 0)
    result = compute_next_run_at("daily", t, None, None, None, from_dt=REF)
    assert result == datetime(2024, 3, 13, 14, 0, 0, tzinfo=timezone.utc)


def test_daily_time_already_passed_today():
    # 08:00 is before REF (10:00) → should return tomorrow at 08:00
    t = time(8, 0, 0)
    result = compute_next_run_at("daily", t, None, None, None, from_dt=REF)
    assert result == datetime(2024, 3, 14, 8, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# weekly
# ---------------------------------------------------------------------------

def test_weekly_target_day_today_time_in_future():
    # REF is Wednesday (weekday=2), scheduled_time 14:00 → today at 14:00
    t = time(14, 0, 0)
    result = compute_next_run_at("weekly", t, 2, None, None, from_dt=REF)
    assert result == datetime(2024, 3, 13, 14, 0, 0, tzinfo=timezone.utc)


def test_weekly_target_day_today_time_already_passed():
    # REF is Wednesday (weekday=2), scheduled_time 08:00 (passed) → next Wednesday
    t = time(8, 0, 0)
    result = compute_next_run_at("weekly", t, 2, None, None, from_dt=REF)
    assert result == datetime(2024, 3, 20, 8, 0, 0, tzinfo=timezone.utc)


def test_weekly_target_day_in_future_this_week():
    # REF is Wednesday (weekday=2), target is Friday (weekday=4) → this Friday
    t = time(10, 0, 0)
    result = compute_next_run_at("weekly", t, 4, None, None, from_dt=REF)
    assert result == datetime(2024, 3, 15, 10, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# monthly
# ---------------------------------------------------------------------------

def test_monthly_day_in_future_this_month():
    # REF is 2024-03-13, day_of_month=20 → 2024-03-20
    t = time(10, 0, 0)
    result = compute_next_run_at("monthly", t, None, 20, None, from_dt=REF)
    assert result == datetime(2024, 3, 20, 10, 0, 0, tzinfo=timezone.utc)


def test_monthly_day_already_passed_this_month():
    # REF is 2024-03-13, day_of_month=5 (already passed) → 2024-04-05
    t = time(10, 0, 0)
    result = compute_next_run_at("monthly", t, None, 5, None, from_dt=REF)
    assert result == datetime(2024, 4, 5, 10, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# once
# ---------------------------------------------------------------------------

def test_once_valid_future_date():
    # Future date: 2024-04-01 at 09:00
    t = time(9, 0, 0)
    d = date(2024, 4, 1)
    result = compute_next_run_at("once", t, None, None, d, from_dt=REF)
    assert result == datetime(2024, 4, 1, 9, 0, 0, tzinfo=timezone.utc)


def test_once_past_date_raises():
    # Past date: 2024-01-01 → should raise ValueError
    t = time(9, 0, 0)
    d = date(2024, 1, 1)
    with pytest.raises(ValueError):
        compute_next_run_at("once", t, None, None, d, from_dt=REF)
