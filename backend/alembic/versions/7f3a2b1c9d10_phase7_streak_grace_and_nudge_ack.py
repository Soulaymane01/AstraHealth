"""phase 7 streak grace and nudge acknowledgement

Revision ID: 7f3a2b1c9d10
Revises: 2be3e303e49a
Create Date: 2026-11-14 10:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f3a2b1c9d10"
down_revision: Union[str, Sequence[str], None] = "2be3e303e49a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "streaks",
        sa.Column("grace_used", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "crew_nudges",
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("crew_nudges", "acknowledged_at")
    op.drop_column("streaks", "grace_used")
