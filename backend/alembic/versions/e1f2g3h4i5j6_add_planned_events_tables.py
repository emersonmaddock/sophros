"""add_planned_events_tables

Revision ID: e1f2g3h4i5j6
Revises: d2efffbda75e
Create Date: 2026-04-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e1f2g3h4i5j6"
down_revision: Union[str, Sequence[str], None] = "d2efffbda75e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "planned_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("meal_plan_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("time", sa.Time(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "completed", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["meal_plan_id"], ["saved_meal_plans.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_planned_events_id"), "planned_events", ["id"], unique=False
    )
    op.create_index(
        "ix_planned_events_plan_day",
        "planned_events",
        ["meal_plan_id", "day"],
    )

    op.create_table(
        "meal_details",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("slot_name", sa.String(), nullable=False),
        sa.Column(
            "calories", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column(
            "protein", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column(
            "carbohydrates", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column("fat", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "prep_time_minutes",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "is_leftover",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column("leftover_from_day", sa.String(), nullable=True),
        sa.Column("leftover_from_slot", sa.String(), nullable=True),
        sa.Column("recipe_id", sa.String(), nullable=True),
        sa.Column("recipe_description", sa.String(), nullable=True),
        sa.Column("recipe_ingredients", sa.JSON(), nullable=True),
        sa.Column("recipe_tags", sa.JSON(), nullable=True),
        sa.Column("recipe_warnings", sa.JSON(), nullable=True),
        sa.Column("recipe_source_url", sa.String(), nullable=True),
        sa.Column("recipe_image_url", sa.String(), nullable=True),
        sa.Column("alternatives", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["event_id"], ["planned_events.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(
        op.f("ix_meal_details_id"), "meal_details", ["id"], unique=False
    )

    op.create_table(
        "workout_details",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("exercise_category", sa.String(), nullable=False),
        sa.Column("calories_burned", sa.Integer(), nullable=True),
        sa.Column("muscle_gain_estimate_kg", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["event_id"], ["planned_events.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(
        op.f("ix_workout_details_id"),
        "workout_details",
        ["id"],
        unique=False,
    )

    op.create_table(
        "sleep_details",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("target_hours", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["event_id"], ["planned_events.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(
        op.f("ix_sleep_details_id"), "sleep_details", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_sleep_details_id"), table_name="sleep_details")
    op.drop_table("sleep_details")
    op.drop_index(
        op.f("ix_workout_details_id"), table_name="workout_details"
    )
    op.drop_table("workout_details")
    op.drop_index(op.f("ix_meal_details_id"), table_name="meal_details")
    op.drop_table("meal_details")
    op.drop_index(
        "ix_planned_events_plan_day", table_name="planned_events"
    )
    op.drop_index(
        op.f("ix_planned_events_id"), table_name="planned_events"
    )
    op.drop_table("planned_events")
