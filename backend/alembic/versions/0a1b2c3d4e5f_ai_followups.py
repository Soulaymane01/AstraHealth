"""Follow-up requests on surgeon instructions

Revision ID: 0a1b2c3d4e5f
Revises: 9c1d2e3f4a5b
Create Date: 2026-11-14 16:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "9c1d2e3f4a5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "surgeon_instructions",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="surgeon"),
    )
    op.add_column(
        "surgeon_instructions",
        sa.Column("protocol", sa.String(length=60), nullable=True),
    )
    op.add_column(
        "surgeon_instructions",
        sa.Column(
            "target_metrics",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
    )
    op.add_column(
        "surgeon_instructions",
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "surgeon_instructions",
        sa.Column("reason", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("surgeon_instructions", "reason")
    op.drop_column("surgeon_instructions", "due_at")
    op.drop_column("surgeon_instructions", "target_metrics")
    op.drop_column("surgeon_instructions", "protocol")
    op.drop_column("surgeon_instructions", "source")
