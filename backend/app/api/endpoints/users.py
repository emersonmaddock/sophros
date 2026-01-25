from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.nutrient import DRIOutput
from app.services.nutrient_calculator import NutrientCalculator

router = APIRouter()


@router.post("/", response_model=UserSchema)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(deps.get_db)):
    """
    Create new user.
    Called by frontend after Clerk signup, or via Webhook (secure).
    """
    user = await db.get(User, user_in.id)
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(**user_in.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserSchema)
async def read_user_me(current_user: User = Depends(deps.get_current_user)):
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=UserSchema)
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
    # Check if necessary profile fields are present
    if not all(
        [
            current_user.age,
            current_user.weight,
            current_user.height,
            current_user.gender,
            current_user.activity_level,
        ]
    ):
        raise HTTPException(
            status_code=400,
            detail="Complete profile (age, weight, height, gender, activity_level) required to calculate targets.",
        )

    # Calculate targets
    result = NutrientCalculator.calculate_targets(
        age=current_user.age,
        gender=current_user.gender,
        weight_kg=current_user.weight,
        height_cm=current_user.height,
        activity_level=current_user.activity_level,
    )

    return result
