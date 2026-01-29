from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.user import UserCreate, UserUpdate

router = APIRouter()


@router.post("/", response_model=UserSchema)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    payload: dict = Depends(deps.get_auth_payload),
):
    """
    Create new user.
    Called by frontend after Clerk signup, or via Webhook (secure).
    """
    user = await db.get(User, payload.get("id"))
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(**user_in.model_dump(), id=payload.get("id"))
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
