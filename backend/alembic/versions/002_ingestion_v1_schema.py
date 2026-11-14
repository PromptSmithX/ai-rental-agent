"""Ingestion v1 schema

Revision ID: 002_ingestion_v1_schema
Revises: 001_initial_schema
Create Date: 2026-10-12 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_ingestion_v1_schema'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # 1. Ingestion runs
    op.create_table(
        'ingestion_runs',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('source_name', sa.Text(), nullable=False),
        sa.Column('scope_city', sa.Text(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('source_category_url', sa.Text(), nullable=False),
        sa.Column('config_snapshot', json_type, nullable=False),
        sa.Column('discovered_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('fetched_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('changed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_summary', json_type, nullable=False),
    )

    # 2. Raw listings
    op.create_table(
        'raw_listings',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('source_name', sa.Text(), nullable=False),
        sa.Column('normalized_source_url', sa.Text(), nullable=False),
        sa.Column('source_listing_id', sa.Text(), nullable=True),
        sa.Column('scope_city', sa.Text(), nullable=False),
        sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latest_snapshot_id', sa.Uuid(as_uuid=True), nullable=True),
        sa.Column('is_active_in_source', sa.Boolean(), nullable=True),
        sa.UniqueConstraint('source_name', 'normalized_source_url', name='uq_raw_source_normalized_url'),
    )
    op.create_index('ix_raw_scope', 'raw_listings', ['scope_city', 'source_name', 'last_seen_at'])

    if is_postgres:
        op.create_index(
            'ux_raw_source_stable_id',
            'raw_listings',
            ['source_name', 'source_listing_id'],
            unique=True,
            postgresql_where=sa.text('source_listing_id IS NOT NULL'),
        )
    else:
        op.create_index('ix_raw_source_stable_id', 'raw_listings', ['source_name', 'source_listing_id'])

    # 3. Raw listing snapshots
    op.create_table(
        'raw_listing_snapshots',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('raw_listing_id', sa.Uuid(as_uuid=True), sa.ForeignKey('raw_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_id', sa.Uuid(as_uuid=True), sa.ForeignKey('ingestion_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('schema_version', sa.Text(), nullable=False),
        sa.Column('content_sha256', sa.Text(), nullable=False),
        sa.Column('payload', json_type, nullable=False),
        sa.UniqueConstraint('raw_listing_id', 'content_sha256', name='uq_raw_snapshot_hash'),
    )
    op.create_index('ix_snapshot_run', 'raw_listing_snapshots', ['run_id'])
    if is_postgres:
        op.create_index('ix_snapshot_data', 'raw_listing_snapshots', ['payload'], postgresql_using='gin')

    # Foreign key for latest_snapshot_id on raw_listings
    with op.batch_alter_table('raw_listings') as batch_op:
        batch_op.create_foreign_key(
            'fk_latest_snapshot',
            'raw_listing_snapshots',
            ['latest_snapshot_id'],
            ['id'],
            ondelete='SET NULL',
        )

    # 4. Raw listing images
    op.create_table(
        'raw_listing_images',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('raw_listing_id', sa.Uuid(as_uuid=True), sa.ForeignKey('raw_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('first_seen_snapshot_id', sa.Uuid(as_uuid=True), sa.ForeignKey('raw_listing_snapshots.id', ondelete='SET NULL'), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=False),
        sa.Column('source_thumbnail_url', sa.Text(), nullable=True),
        sa.Column('alt_raw', sa.Text(), nullable=True),
        sa.Column('storage_key', sa.Text(), nullable=True),
        sa.Column('sha256', sa.Text(), nullable=True),
        sa.Column('mime_type', sa.Text(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('bytes', sa.BigInteger(), nullable=True),
        sa.Column('permission_status', sa.Text(), nullable=False, server_default='unknown'),
        sa.Column('download_status', sa.Text(), nullable=False, server_default='not_attempted'),
        sa.Column('download_error', sa.Text(), nullable=True),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('downloaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('raw_listing_id', 'source_url', name='uq_raw_image_url'),
    )
    op.create_index('ix_images_listing_position', 'raw_listing_images', ['raw_listing_id', 'position'])

    # 5. Ingestion errors
    op.create_table(
        'ingestion_errors',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('run_id', sa.Uuid(as_uuid=True), sa.ForeignKey('ingestion_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('stage', sa.Text(), nullable=False),
        sa.Column('error_code', sa.Text(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('retryable', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )


def downgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    op.drop_table('ingestion_errors')
    op.drop_index('ix_images_listing_position', table_name='raw_listing_images')
    op.drop_table('raw_listing_images')

    with op.batch_alter_table('raw_listings') as batch_op:
        batch_op.drop_constraint('fk_latest_snapshot', type_='foreignkey')

    if is_postgres:
        op.drop_index('ix_snapshot_data', table_name='raw_listing_snapshots')
    op.drop_index('ix_snapshot_run', table_name='raw_listing_snapshots')
    op.drop_table('raw_listing_snapshots')

    if is_postgres:
        op.drop_index('ux_raw_source_stable_id', table_name='raw_listings')
    else:
        op.drop_index('ix_raw_source_stable_id', table_name='raw_listings')
    op.drop_index('ix_raw_scope', table_name='raw_listings')
    op.drop_table('raw_listings')
    op.drop_table('ingestion_runs')
