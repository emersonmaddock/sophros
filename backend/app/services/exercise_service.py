from datetime import time

from pydantic import BaseModel

from app.domain.enums import ExerciseCategory, ExerciseType


class ExerciseRecommendation(BaseModel):
    category: ExerciseCategory
    exercise_type: ExerciseType
    duration_minutes: int
    intensity: str
    time: time | None = None


class ExercisePlanService:
    @staticmethod
    def get_recommendation(
        current_weight: float, target_weight: float | None = None
    ) -> ExerciseRecommendation:
        """
        Determines the optimal exercise category based on weight goals.
        """
        if target_weight is None or target_weight == current_weight:
            # Maintenance: Balanced
            return ExerciseRecommendation(
                category=ExerciseCategory.STRENGTH,
                exercise_type=ExerciseType.BODYWEIGHT,
                duration_minutes=45,
                intensity="Moderate",
            )

        if target_weight < current_weight:
            # Weight Loss: Focus on Cardio/HIIT
            return ExerciseRecommendation(
                category=ExerciseCategory.CARDIO,
                exercise_type=ExerciseType.HIIT,
                duration_minutes=30,
                intensity="High",
            )
        else:
            # Weight Gain: Focus on Strength
            return ExerciseRecommendation(
                category=ExerciseCategory.STRENGTH,
                exercise_type=ExerciseType.WEIGHT_LIFTING,
                duration_minutes=60,
                intensity="High",
            )
