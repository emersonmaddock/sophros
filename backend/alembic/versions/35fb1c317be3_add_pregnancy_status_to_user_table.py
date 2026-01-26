"""add pregnancy_status to user table

Revision ID: 35fb1c317be3
Revises: 89987c2b6f2a
Create Date: 2026-01-26 18:09:54.821640

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35fb1c317be3'
down_revision: Union[str, Sequence[str], None] = '89987c2b6f2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user', sa.Column('pregnancy_status', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user', 'pregnancy_status')
