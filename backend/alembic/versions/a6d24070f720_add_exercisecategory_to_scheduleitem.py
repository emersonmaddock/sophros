"""Add ExerciseCategory to ScheduleItem

Revision ID: a6d24070f720
Revises: 6ea868ba6f73
Create Date: 2026-04-22 14:01:32.393003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6d24070f720'
down_revision: Union[str, Sequence[str], None] = '6ea868ba6f73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    exercise_category_enum = sa.Enum('CARDIO', 'WEIGHT_LIFTING', name='exercise_category_enum')
    exercise_category_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('schedules', sa.Column('exercise_category', exercise_category_enum, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('schedules', 'exercise_category')
    sa.Enum(name='exercise_category_enum').drop(op.get_bind(), checkfirst=True)
