"""Initial schema with Campus, Room, and RoomImage

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-11 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Attempt to enable postgis extension if on PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # 1. Create campuses table
    op.create_table(
        'campuses',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('university_name', sa.String(length=255), nullable=False),
        sa.Column('campus_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('geom', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_campuses_id'), 'campuses', ['id'], unique=False)

    # 2. Create rooms table
    op.create_table(
        'rooms',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('price_monthly_vnd', sa.Integer(), nullable=False),
        sa.Column('area_m2', sa.Float(), nullable=True),
        sa.Column('address_label', sa.String(length=500), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('geom', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('location_accuracy', sa.String(length=32), nullable=False, server_default='unknown'),
        sa.Column('amenities', sa.JSON(), nullable=False),
        sa.Column('pet_allowed', sa.Boolean(), nullable=True),
        sa.Column('listing_status', sa.String(length=32), nullable=False, server_default='unknown'),
        sa.Column('source_kind', sa.String(length=32), nullable=False, server_default='demo'),
        sa.Column('source_url', sa.String(length=1000), nullable=True),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('utilities_monthly_estimate_vnd', sa.Integer(), nullable=True),
        sa.Column('is_simulated', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'], unique=False)
    op.create_index(op.f('ix_rooms_price_monthly_vnd'), 'rooms', ['price_monthly_vnd'], unique=False)

    # 3. Create room_images table
    op.create_table(
        'room_images',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
        sa.Column('room_id', sa.String(length=64), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('caption', sa.String(length=255), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_room_images_room_id'), 'room_images', ['room_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_room_images_room_id'), table_name='room_images')
    op.drop_table('room_images')
    op.drop_index(op.f('ix_rooms_price_monthly_vnd'), table_name='rooms')
    op.drop_index(op.f('ix_rooms_id'), table_name='rooms')
    op.drop_table('rooms')
    op.drop_index(op.f('ix_campuses_id'), table_name='campuses')
    op.drop_table('campuses')
