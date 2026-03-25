"""initial_users_and_jobs

Revision ID: f5a327c59729
Revises: 
Create Date: 2026-03-24 20:00:35.071329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a327c59729'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "primer_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("gene_name", sa.String(), nullable=False, server_default=""),
        sa.Column("sequence_snippet", sa.String(), nullable=False, server_default=""),
        sa.Column("mode", sa.String(), nullable=False, server_default="sequence"),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_primer_jobs_user_id", "primer_jobs", ["user_id"])

    op.create_table(
        "grna_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("gene_name", sa.String(), nullable=False, server_default=""),
        sa.Column("sequence_snippet", sa.String(), nullable=False, server_default=""),
        sa.Column("cas_type", sa.String(), nullable=False, server_default="SpCas9"),
        sa.Column("species", sa.String(), nullable=False, server_default="human"),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_grna_jobs_user_id", "grna_jobs", ["user_id"])

    op.create_table(
        "blast_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("sequence_snippet", sa.String(), nullable=False, server_default=""),
        sa.Column("program", sa.String(), nullable=False, server_default="blastn"),
        sa.Column("database", sa.String(), nullable=False, server_default="nt"),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blast_jobs_user_id", "blast_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_blast_jobs_user_id", "blast_jobs")
    op.drop_table("blast_jobs")
    op.drop_index("ix_grna_jobs_user_id", "grna_jobs")
    op.drop_table("grna_jobs")
    op.drop_index("ix_primer_jobs_user_id", "primer_jobs")
    op.drop_table("primer_jobs")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
