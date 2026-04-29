"""add_meal_type_to_schedules

Adds a nullable meal_type column to schedules to record whether a meal
slot is Breakfast, Lunch, or Dinner.  Nullable so existing rows and
non-meal activity types (exercise, sleep) remain unaffected.

Revision ID: b1c2d3e4f5a6
Revises: f03efbe9a54f
Create Date: 2026-04-27 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'schedules',
        sa.Column('meal_type', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('schedules', 'meal_type')
