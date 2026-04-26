from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.progress import UserArchivedGoal, UserBodyFatLog, UserWeightLog
from app.models.user import User
from app.schemas.progress import (
    ArchivedGoalCreate,
    ArchivedGoalRead,
    BodyFatLogEntryCreate,
    BodyFatLogEntryRead,
    WeightLogEntryCreate,
    WeightLogEntryRead,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Weight log
# ---------------------------------------------------------------------------


@router.get("/weight-log", response_model=list[WeightLogEntryRead])
async def get_weight_log(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> list[UserWeightLog]:
    """Return all weight log entries for the current user, oldest first."""
    result = await db.execute(
        select(UserWeightLog)
        .where(UserWeightLog.user_id == current_user.id)
        .order_by(UserWeightLog.date)
    )
    return list(result.scalars().all())


@router.post("/weight-log", response_model=WeightLogEntryRead, status_code=status.HTTP_200_OK)
async def upsert_weight_entry(
    entry_in: WeightLogEntryCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> UserWeightLog:
    """Upsert a weight entry for the given date (one entry per user per date)."""
    result = await db.execute(
        select(UserWeightLog).where(
            UserWeightLog.user_id == current_user.id,
            UserWeightLog.date == entry_in.date,
        )
    )
    entry = result.scalar_one_or_none()

    if entry is None:
        entry = UserWeightLog(
            user_id=current_user.id,
            date=entry_in.date,
            weight_kg=entry_in.weight_kg,
            source=entry_in.source,
        )
        db.add(entry)
    else:
        entry.weight_kg = entry_in.weight_kg
        entry.source = entry_in.source

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/weight-log/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weight_entry(
    entry_date: str,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> None:
    """Delete the weight log entry for a specific date (YYYY-MM-DD)."""
    await db.execute(
        delete(UserWeightLog).where(
            UserWeightLog.user_id == current_user.id,
            UserWeightLog.date == entry_date,
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Body fat log
# ---------------------------------------------------------------------------


@router.get("/body-fat-log", response_model=list[BodyFatLogEntryRead])
async def get_body_fat_log(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> list[UserBodyFatLog]:
    """Return all body fat log entries for the current user, oldest first."""
    result = await db.execute(
        select(UserBodyFatLog)
        .where(UserBodyFatLog.user_id == current_user.id)
        .order_by(UserBodyFatLog.date)
    )
    return list(result.scalars().all())


@router.post("/body-fat-log", response_model=BodyFatLogEntryRead, status_code=status.HTTP_200_OK)
async def upsert_body_fat_entry(
    entry_in: BodyFatLogEntryCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> UserBodyFatLog:
    """Upsert a body fat entry for the given date (one entry per user per date)."""
    result = await db.execute(
        select(UserBodyFatLog).where(
            UserBodyFatLog.user_id == current_user.id,
            UserBodyFatLog.date == entry_in.date,
        )
    )
    entry = result.scalar_one_or_none()

    if entry is None:
        entry = UserBodyFatLog(
            user_id=current_user.id,
            date=entry_in.date,
            body_fat_percent=entry_in.body_fat_percent,
            source=entry_in.source,
        )
        db.add(entry)
    else:
        entry.body_fat_percent = entry_in.body_fat_percent
        entry.source = entry_in.source

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/body-fat-log/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_body_fat_entry(
    entry_date: str,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> None:
    """Delete the body fat log entry for a specific date (YYYY-MM-DD)."""
    await db.execute(
        delete(UserBodyFatLog).where(
            UserBodyFatLog.user_id == current_user.id,
            UserBodyFatLog.date == entry_date,
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Archived goals
# ---------------------------------------------------------------------------


@router.get("/archived-goals", response_model=list[ArchivedGoalRead])
async def get_archived_goals(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> list[UserArchivedGoal]:
    """Return all archived goals for the current user, most recent first."""
    result = await db.execute(
        select(UserArchivedGoal)
        .where(UserArchivedGoal.user_id == current_user.id)
        .order_by(UserArchivedGoal.archived_at.desc())
    )
    return list(result.scalars().all())


@router.post("/archived-goals", response_model=ArchivedGoalRead, status_code=status.HTTP_200_OK)
async def upsert_archived_goal(
    goal_in: ArchivedGoalCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> UserArchivedGoal:
    """Upsert an archived goal summary by its stable id."""
    result = await db.execute(
        select(UserArchivedGoal).where(
            UserArchivedGoal.user_id == current_user.id,
            UserArchivedGoal.id == goal_in.id,
        )
    )
    goal = result.scalar_one_or_none()

    if goal is None:
        goal = UserArchivedGoal(
            id=goal_in.id,
            user_id=current_user.id,
            start_date=goal_in.start_date,
            target_date=goal_in.target_date,
            start_weight_kg=goal_in.start_weight_kg,
            target_weight_kg=goal_in.target_weight_kg,
            target_body_fat=goal_in.target_body_fat,
            end_date=goal_in.end_date,
            final_weight_kg=goal_in.final_weight_kg,
            final_body_fat_percent=goal_in.final_body_fat_percent,
            weight_change_kg=goal_in.weight_change_kg,
            archived_at=goal_in.archived_at,
        )
        db.add(goal)
    else:
        for field, value in goal_in.model_dump(exclude={"id"}).items():
            setattr(goal, field, value)

    await db.commit()
    await db.refresh(goal)
    return goal
