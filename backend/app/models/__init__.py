# Import all models here so they are registered with SQLAlchemy
from app.models.user import User
from app.models.goal import UserGoal

__all__ = ["User", "UserGoal"]
