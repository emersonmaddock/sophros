from fastapi import APIRouter

from app.api.endpoints import (
    google_calendar,
    meal_plans,
    progress,
    schedules,
    users,
)

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["meal-plans"])
api_router.include_router(
    progress.router, prefix="/users/me/progress", tags=["progress"]
)
api_router.include_router(
    google_calendar.router,
    prefix="/calendar/google",
    tags=["calendar"],
)
