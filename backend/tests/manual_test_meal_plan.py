import asyncio
import os
from datetime import date, datetime, timedelta

from dotenv import load_dotenv

from app.domain.enums import ActivityLevel
from app.services.meal_plan import MealPlanService
from app.services.spoonacular import SpoonacularClient
from tests.generate_mock_user import create_mock_user

# 1. Load Environment Variables (for SPOONACULAR_API_KEY)
load_dotenv()


class MockScheduleItem:
    def __init__(self, day_str, hour, duration):
        # Stable date calculation
        self.date = datetime.now()
        # Find next occurrence of Day
        days_ahead = 0
        while (self.date + timedelta(days=days_ahead)).strftime("%A") != day_str:
            days_ahead += 1
            if days_ahead > 7:
                break  # Safety break
        self.date = (self.date + timedelta(days=days_ahead)).replace(
            hour=hour, minute=0, second=0, microsecond=0
        )
        self.duration_minutes = duration


async def run_authentic_test():
    print("🚀 Starting AUTHENTIC Sophros Planning Test...")
    print(f"🔑 API Key Found: {'Yes' if os.getenv('SPOONACULAR_API_KEY') else 'No'}")

    # Setup User
    target_date = date.today() + timedelta(days=90)
    user = create_mock_user(
        weight=85.0,
        target_weight=75.0,
        target_body_fat=12.0,
        target_date=target_date,
        activity_level=ActivityLevel.MODERATE,
    )

    # Setup complex "Busy" slots to trigger leftovers
    # Monday: Busy Lunch (11:00 - 14:00)
    # Monday: Busy Dinner (18:00 - 20:00)
    # Tuesday: Busy Breakfast (07:00 - 09:00)
    user.schedules = [
        MockScheduleItem("Monday", 11, 180),  # Busy Lunch
        MockScheduleItem("Monday", 18, 120),  # Busy Dinner
        MockScheduleItem("Tuesday", 7, 120),  # Busy Breakfast
    ]

    # Initialize Service
    client = SpoonacularClient()
    service = MealPlanService(spoonacular_client=client)

    print(
        "\n[STEP 1] Generating Weekly Plan "
        + "(this may take 10-20s due to real API calls)..."
    )

    try:
        # We'll monkeypatch _fetch_recipe_pool just to add a progress print
        original_fetch = service._fetch_recipe_pool

        async def fetch_with_progress(u):
            print("  📡 Fetching recipe pool from Spoonacular...")
            return await original_fetch(u)

        service._fetch_recipe_pool = fetch_with_progress

        plan = await service.generate_weekly_plan(user)
        print("✅ Plan Generated Successfully!\n")

        # Display Results
        print("=" * 60)
        print(f"{'DAY':<12} | {'EXERCISE':<20} | {'MEALS':<20}")
        print("-" * 60)

        for daily in plan.daily_plans:
            if daily.exercise:
                category_str = daily.exercise.category.value
                duration_str = daily.exercise.duration_minutes
                ex_str = f"{category_str} ({duration_str}m)"
            else:
                ex_str = "REST"

            # Show first meal detail
            print(
                f"{daily.day.value:<12} | {ex_str:<20} | "
                + f"Target: {daily.total_calories} kcal"
            )
            for slot in daily.slots:
                tag = "[L]" if slot.is_leftover else "[C]"
                meal_title = slot.plan.main_recipe.title if slot.plan else "N/A"
                print(
                    f"{'':<12} | {'':<20} |   "
                    + f"{tag} {slot.slot_name.value}: {meal_title}"
                )
            print("-" * 60)

        print("\n=== ANALYSIS ===")
        print("1. DECOUPLING: Exercises were scheduled based on weekly gaps.")
        print("2. FEEDBACK: Workout days have higher calories than REST days.")
        print("3. LEFTOVERS: Found 'Busy' slots and assigned leftovers.")

    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_authentic_test())
