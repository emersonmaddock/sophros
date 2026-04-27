"""add_custom_meal_fields

Adds is_custom (NOT NULL DEFAULT FALSE) and nullable user_id on meals,
relaxes recipe_id to nullable, and adds a CHECK constraint enforcing that
custom meals always have an owner.

Revision ID: f03efbe9a54f
Revises: 500d7ca07f8b
Create Date: 2026-04-25 20:05:36.112420
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f03efbe9a54f'
down_revision: Union[str, Sequence[str], None] = '500d7ca07f8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'meals',
        sa.Column('is_custom', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'meals',
        sa.Column('user_id', sa.String(), nullable=True),
    )
    op.create_foreign_key(
        'fk_meals_user_id_user',
        'meals', 'user',
        ['user_id'], ['id'],
    )
    op.alter_column('meals', 'recipe_id', existing_type=sa.String(), nullable=True)
    op.create_check_constraint(
        'ck_meals_custom_requires_user',
        'meals',
        'is_custom = false OR user_id IS NOT NULL',
    )


def downgrade() -> None:
    op.drop_constraint('ck_meals_custom_requires_user', 'meals', type_='check')
    # Custom meals (recipe_id IS NULL) can't satisfy the pre-migration NOT NULL
    # constraint. They're the rows this migration was added to support, so a
    # downgrade necessarily discards them.
    op.execute("DELETE FROM meals WHERE recipe_id IS NULL")
    op.alter_column('meals', 'recipe_id', existing_type=sa.String(), nullable=False)
    op.drop_constraint('fk_meals_user_id_user', 'meals', type_='foreignkey')
    op.drop_column('meals', 'user_id')
    op.drop_column('meals', 'is_custom')
