from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.dietary import UserAllergy, UserExcludeCuisine, UserIncludeCuisine
from app.models.user import User
from app.schemas.nutrient import DRIOutput
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.nutrient_calculator import NutrientCalculator

router = APIRouter()


async def _load_user_with_dietary(db: AsyncSession, user_id: str) -> User:
    """Fetch a user with all dietary relationships eagerly loaded."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.user_allergies),
            selectinload(User.user_include_cuisines),
            selectinload(User.user_exclude_cuisines),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.post("", response_model=UserRead)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    payload: dict = Depends(deps.get_auth_payload),
):
    """
    Create new user.
    Called by frontend after Clerk signup, or via Webhook (secure).
    """
    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token"
        )

    existing = await db.get(User, user_id)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    # Create the User row (excludes dietary list fields — those go in relational tables)
    user_data = user_in.model_dump(
        exclude={"allergies", "include_cuisine", "exclude_cuisine"}
    )
    user = User(**user_data, id=user_id)
    db.add(user)

    # Insert dietary relationship rows
    for allergy in user_in.allergies:
        db.add(UserAllergy(user_id=user_id, value=allergy))
    for cuisine in user_in.include_cuisine:
        db.add(UserIncludeCuisine(user_id=user_id, value=cuisine))
    for cuisine in user_in.exclude_cuisine:
        db.add(UserExcludeCuisine(user_id=user_id, value=cuisine))

    await db.commit()

    # Re-fetch with relationships loaded for serialization
    return await _load_user_with_dietary(db, user_id)


@router.get(
    "/me",
    response_model=UserRead,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
)
async def read_user_me(current_user: User = Depends(deps.get_current_user)):
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=UserRead)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Update current user profile.
    Dietary list fields (allergies, include_cuisine, exclude_cuisine) are
    replaced wholesale — existing rows are deleted and new ones inserted.
    """
    update_data = user_in.model_dump(exclude_unset=True)

    # Handle dietary relationship fields (delete + re-insert pattern)
    if "allergies" in update_data:
        allergies = update_data.pop("allergies")
        await db.execute(
            delete(UserAllergy).where(UserAllergy.user_id == current_user.id)
        )
        for allergy in allergies:
            db.add(UserAllergy(user_id=current_user.id, value=allergy))

    if "include_cuisine" in update_data:
        cuisines = update_data.pop("include_cuisine")
        await db.execute(
            delete(UserIncludeCuisine).where(
                UserIncludeCuisine.user_id == current_user.id
            )
        )
        for cuisine in cuisines:
            db.add(UserIncludeCuisine(user_id=current_user.id, value=cuisine))

    if "exclude_cuisine" in update_data:
        cuisines = update_data.pop("exclude_cuisine")
        await db.execute(
            delete(UserExcludeCuisine).where(
                UserExcludeCuisine.user_id == current_user.id
            )
        )
        for cuisine in cuisines:
            db.add(UserExcludeCuisine(user_id=current_user.id, value=cuisine))

    # Update scalar fields directly on the ORM object
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.commit()

    # Re-fetch with relationships loaded for serialization
    return await _load_user_with_dietary(db, current_user.id)


@router.get("/me/targets", response_model=DRIOutput)
async def read_user_targets(current_user: User = Depends(deps.get_current_user)):
    """
    Get nutrient targets based on user profile.
    """

    # Calculate targets
    return NutrientCalculator.calculate_targets(
        age=current_user.age,
        gender=current_user.gender,
        weight_kg=current_user.weight,
        height_cm=current_user.height,
        activity_level=current_user.activity_level,
    )
