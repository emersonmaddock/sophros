from datetime import date

from pydantic import BaseModel


class LoginStreakRead(BaseModel):
    current_streak: int
    last_login_date: date | None = None
