"""add progress tables and goal snapshot fields

Revision ID: e9f3a2b1c4d5
Revises: db1bc88ad384
Create Date: 2026-04-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e9f3a2b1c4d5'
down_revision: Union[str, None] = 'db1bc88ad384'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New columns on user ---
    op.add_column('user', sa.Column('goal_start_date', sa.Date(), nullable=True))
    op.add_column('user', sa.Column('goal_start_weight_kg', sa.Float(), nullable=True))

    # --- user_weight_log ---
    op.create_table(
        'user_weight_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'date', name='uq_weight_log_user_date'),
    )
    op.create_index(op.f('ix_user_weight_log_user_id'), 'user_weight_log', ['user_id'], unique=False)

    # --- user_body_fat_log ---
    op.create_table(
        'user_body_fat_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('body_fat_percent', sa.Float(), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'date', name='uq_body_fat_log_user_date'),
    )
    op.create_index(op.f('ix_user_body_fat_log_user_id'), 'user_body_fat_log', ['user_id'], unique=False)

    # --- user_archived_goal ---
    op.create_table(
        'user_archived_goal',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('start_weight_kg', sa.Float(), nullable=False),
        sa.Column('target_weight_kg', sa.Float(), nullable=False),
        sa.Column('target_body_fat', sa.Float(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('final_weight_kg', sa.Float(), nullable=True),
        sa.Column('final_body_fat_percent', sa.Float(), nullable=True),
        sa.Column('weight_change_kg', sa.Float(), nullable=True),
        sa.Column('archived_at', sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_archived_goal_user_id'), 'user_archived_goal', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_archived_goal_user_id'), table_name='user_archived_goal')
    op.drop_table('user_archived_goal')
    op.drop_index(op.f('ix_user_body_fat_log_user_id'), table_name='user_body_fat_log')
    op.drop_table('user_body_fat_log')
    op.drop_index(op.f('ix_user_weight_log_user_id'), table_name='user_weight_log')
    op.drop_table('user_weight_log')
    op.drop_column('user', 'goal_start_weight_kg')
    op.drop_column('user', 'goal_start_date')
