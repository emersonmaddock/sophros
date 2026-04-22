"""add_schedule_source_metadata

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-22 00:01:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # source_type is NOT NULL — use server_default so existing rows get 'sophros'
    op.add_column(
        'schedules',
        sa.Column(
            'source_type',
            sa.String(),
            nullable=False,
            server_default='sophros',
        ),
    )
    op.add_column('schedules', sa.Column('source_calendar_id', sa.String(), nullable=True))
    op.add_column('schedules', sa.Column('source_external_id', sa.String(), nullable=True))
    op.add_column('schedules', sa.Column('source_sync_batch_id', sa.String(), nullable=True))
    op.add_column('schedules', sa.Column('imported_at', sa.DateTime(), nullable=True))

    # Index for efficient deletion of google calendar rows during sync
    op.create_index(
        'ix_schedules_user_source_type',
        'schedules',
        ['user_id', 'source_type'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_schedules_user_source_type', table_name='schedules')
    op.drop_column('schedules', 'imported_at')
    op.drop_column('schedules', 'source_sync_batch_id')
    op.drop_column('schedules', 'source_external_id')
    op.drop_column('schedules', 'source_calendar_id')
    op.drop_column('schedules', 'source_type')
