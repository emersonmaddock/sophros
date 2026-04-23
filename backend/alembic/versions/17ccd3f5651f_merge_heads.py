"""merge_heads

Revision ID: 17ccd3f5651f
Revises: db1bc88ad384, a8aa6cc580d3
Create Date: 2026-04-23 17:01:51.093888

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17ccd3f5651f'
down_revision: Union[str, Sequence[str], None] = ('db1bc88ad384', 'a8aa6cc580d3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
