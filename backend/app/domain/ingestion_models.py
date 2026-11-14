import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
    CheckConstraint,
    func,
)
from sqlalchemy.types import Uuid
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database import Base


def get_json_type():
    return JSON().with_variant(JSONB(), "postgresql")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name = Column(Text, nullable=False)
    scope_city = Column(Text, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Text,
        CheckConstraint("status IN ('running','paused','completed','failed','cancelled')"),
        nullable=False,
        default="running",
    )
    source_category_url = Column(Text, nullable=False)
    config_snapshot = Column(get_json_type(), nullable=False, default=dict)
    discovered_count = Column(Integer, nullable=False, default=0)
    fetched_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    changed_count = Column(Integer, nullable=False, default=0)
    error_summary = Column(get_json_type(), nullable=False, default=dict)

    snapshots = relationship("RawListingSnapshot", back_populates="run")
    errors = relationship("IngestionError", back_populates="run")


class RawListing(Base):
    __tablename__ = "raw_listings"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name = Column(Text, nullable=False)
    normalized_source_url = Column(Text, nullable=False)
    source_listing_id = Column(Text, nullable=True)
    scope_city = Column(Text, nullable=False)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    latest_snapshot_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("raw_listing_snapshots.id", use_alter=True, name="fk_latest_snapshot"),
        nullable=True,
    )
    is_active_in_source = Column(Boolean, nullable=True)

    __table_args__ = (
        UniqueConstraint("source_name", "normalized_source_url", name="uq_raw_source_normalized_url"),
        Index("ix_raw_scope", "scope_city", "source_name", "last_seen_at"),
    )

    snapshots = relationship(
        "RawListingSnapshot",
        back_populates="raw_listing",
        foreign_keys="RawListingSnapshot.raw_listing_id",
        cascade="all, delete-orphan",
    )
    latest_snapshot = relationship(
        "RawListingSnapshot",
        foreign_keys=[latest_snapshot_id],
        post_update=True,
    )
    images = relationship(
        "RawListingImage",
        back_populates="raw_listing",
        cascade="all, delete-orphan",
    )


class RawListingSnapshot(Base):
    __tablename__ = "raw_listing_snapshots"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_listing_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("raw_listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("ingestion_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    captured_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    schema_version = Column(Text, nullable=False, default="1.0.0")
    content_sha256 = Column(Text, nullable=False)
    payload = Column(get_json_type(), nullable=False)

    __table_args__ = (
        UniqueConstraint("raw_listing_id", "content_sha256", name="uq_raw_snapshot_hash"),
        Index("ix_snapshot_run", "run_id"),
    )

    raw_listing = relationship(
        "RawListing",
        back_populates="snapshots",
        foreign_keys=[raw_listing_id],
    )
    run = relationship("IngestionRun", back_populates="snapshots")
    images = relationship("RawListingImage", back_populates="first_seen_snapshot")


class RawListingImage(Base):
    __tablename__ = "raw_listing_images"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_listing_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("raw_listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    first_seen_snapshot_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("raw_listing_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    position = Column(Integer, CheckConstraint("position >= 0"), nullable=False, default=0)
    source_url = Column(Text, nullable=False)
    source_thumbnail_url = Column(Text, nullable=True)
    alt_raw = Column(Text, nullable=True)
    storage_key = Column(Text, nullable=True)
    sha256 = Column(Text, nullable=True)
    mime_type = Column(Text, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    bytes = Column(BigInteger, nullable=True)
    permission_status = Column(
        Text,
        CheckConstraint("permission_status IN ('unknown','allowed','disallowed','revoked')"),
        nullable=False,
        default="unknown",
    )
    download_status = Column(
        Text,
        CheckConstraint("download_status IN ('not_attempted','queued','downloaded','failed','skipped')"),
        nullable=False,
        default="not_attempted",
    )
    download_error = Column(Text, nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True, default=lambda: datetime.now(timezone.utc))
    downloaded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("raw_listing_id", "source_url", name="uq_raw_image_url"),
        Index("ix_images_listing_position", "raw_listing_id", "position"),
    )

    raw_listing = relationship("RawListing", back_populates="images")
    first_seen_snapshot = relationship("RawListingSnapshot", back_populates="images")


class IngestionError(Base):
    __tablename__ = "ingestion_errors"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("ingestion_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_url = Column(Text, nullable=True)
    stage = Column(Text, nullable=False)
    error_code = Column(Text, nullable=False)
    message = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    retryable = Column(Boolean, nullable=False, default=False)

    run = relationship("IngestionRun", back_populates="errors")
