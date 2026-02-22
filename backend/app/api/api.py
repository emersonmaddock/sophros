from fastapi import APIRouter

from app.api.endpoints import meal_plans, schedules, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["meal-plans"])
