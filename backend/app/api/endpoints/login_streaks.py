from datetime import date, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.login_record import LoginRecord
from app.models.user import User
from app.schemas.login_streak import LoginStreakRead

router = APIRouter()


@router.post("/record", status_code=status.HTTP_201_CREATED)
async def record_login(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Record a login for today. Idempotent — only inserts once per user per day.
    Returns 201 on new insert, 200 if already recorded.
    """
    today = date.today()

    stmt = (
        pg_insert(LoginRecord)
        .values(user_id=current_user.id, login_date=today)
        .on_conflict_do_nothing(constraint="uq_user_login_date")
    )
    result = await db.execute(stmt)
    await db.commit()

    # rowcount == 1 means a new row was inserted; 0 means it already existed
    if result.rowcount == 0:
        return {"detail": "Login already recorded for today", "status": "existing"}

    return {"detail": "Login recorded", "status": "created"}


@router.get("/me", response_model=LoginStreakRead)
async def get_login_streak(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Get the current consecutive-day login streak for the authenticated user.
    """
    stmt = (
        select(LoginRecord.login_date)
        .where(LoginRecord.user_id == current_user.id)
        .order_by(LoginRecord.login_date.desc())
    )
    result = await db.execute(stmt)
    login_dates: list[date] = list(result.scalars().all())

    if not login_dates:
        return LoginStreakRead(current_streak=0, last_login_date=None)

    last_login = login_dates[0]
    today = date.today()

    # If the most recent login isn't today or yesterday, streak is 0
    if (today - last_login).days > 1:
        return LoginStreakRead(current_streak=0, last_login_date=last_login)

    # Count consecutive days backwards
    streak = 1
    for i in range(1, len(login_dates)):
        if login_dates[i] == login_dates[i - 1] - timedelta(days=1):
            streak += 1
        else:
            break

    return LoginStreakRead(current_streak=streak, last_login_date=last_login)
