from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.nutrient import DRIOutput
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.nutrient_calculator import NutrientCalculator

router = APIRouter()


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
    user = await db.get(User, payload.get("sub"))
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(**user_in.model_dump(), id=payload.get("sub"))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


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
    """
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


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
