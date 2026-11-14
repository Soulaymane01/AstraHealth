"""flight surgeon console

Revision ID: 9c1d2e3f4a5b
Revises: 7f3a2b1c9d10
Create Date: 2026-11-14 15:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9c1d2e3f4a5b"
down_revision: Union[str, Sequence[str], None] = "7f3a2b1c9d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "surgeon_assessments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("surgeon_id", sa.Integer(), nullable=False),
        sa.Column("crew_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="final"),
        sa.Column("working_diagnosis", sa.Text(), nullable=False),
        sa.Column("findings", sa.Text(), nullable=False),
        sa.Column("plan", sa.Text(), nullable=False),
        sa.Column("follow_up", sa.Text(), nullable=True),
        sa.Column("share_with_crew", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["crew_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["surgeon_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_surgeon_assessments_crew_user_id",
        "surgeon_assessments",
        ["crew_user_id"],
    )
    op.create_index(
        "ix_surgeon_assessments_surgeon_id",
        "surgeon_assessments",
        ["surgeon_id"],
    )

    op.create_table(
        "surgeon_instructions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("surgeon_id", sa.Integer(), nullable=False),
        sa.Column("crew_user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False, server_default="note"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["crew_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["surgeon_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_surgeon_instructions_crew_user_id",
        "surgeon_instructions",
        ["crew_user_id"],
    )
    op.create_index(
        "ix_surgeon_instructions_surgeon_id",
        "surgeon_instructions",
        ["surgeon_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_surgeon_instructions_surgeon_id", table_name="surgeon_instructions")
    op.drop_index("ix_surgeon_instructions_crew_user_id", table_name="surgeon_instructions")
    op.drop_table("surgeon_instructions")
    op.drop_index("ix_surgeon_assessments_surgeon_id", table_name="surgeon_assessments")
    op.drop_index("ix_surgeon_assessments_crew_user_id", table_name="surgeon_assessments")
    op.drop_table("surgeon_assessments")
