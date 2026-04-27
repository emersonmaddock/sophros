"""remove body fat log table and fields

Revision ID: a2b3c4d5e6f7
Revises: e9f3a2b1c4d5
Create Date: 2026-04-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'e9f3a2b1c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop user_body_fat_log table
    op.drop_index(op.f('ix_user_body_fat_log_user_id'), table_name='user_body_fat_log')
    op.drop_table('user_body_fat_log')

    # Remove body-fat columns from user_archived_goal
    op.drop_column('user_archived_goal', 'target_body_fat')
    op.drop_column('user_archived_goal', 'final_body_fat_percent')

    # Remove target_body_fat from user
    op.drop_column('user', 'target_body_fat')


def downgrade() -> None:
    # Restore target_body_fat on user
    op.add_column('user', sa.Column('target_body_fat', sa.Float(), nullable=True))

    # Restore body-fat columns on user_archived_goal
    op.add_column('user_archived_goal', sa.Column('final_body_fat_percent', sa.Float(), nullable=True))
    op.add_column('user_archived_goal', sa.Column('target_body_fat', sa.Float(), nullable=True))

    # Recreate user_body_fat_log table
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
