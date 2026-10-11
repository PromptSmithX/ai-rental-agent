from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    TypeDecorator,
    func,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.database import Base
from app.domain.enums import LocationAccuracy, ListingStatus, SourceKind


class PointGeography(TypeDecorator):
    """Custom type that uses PostGIS Geography on PostgreSQL, and String on SQLite/in-memory."""
    impl = Geography
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect is not None and dialect.name == "postgresql":
            return dialect.type_descriptor(
                Geography(geometry_type="POINT", srid=4326, spatial_index=False)
            )
        return dialect.type_descriptor(String(255)) if dialect is not None else String(255)

    def process_bind_param(self, value, dialect):
        if dialect is not None and dialect.name == "postgresql":
            return value
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return value


class Campus(Base):
    __tablename__ = "campuses"

    id = Column(String(64), primary_key=True, index=True)
    university_name = Column(String(255), nullable=False)
    campus_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # PostGIS point geography: WGS84 (SRID 4326) on PostgreSQL, String on SQLite
    geom = Column(PointGeography(), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    price_monthly_vnd = Column(Integer, nullable=False, index=True)
    area_m2 = Column(Float, nullable=True)
    address_label = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # PostGIS point geography: WGS84 (SRID 4326) on PostgreSQL, String on SQLite
    geom = Column(PointGeography(), nullable=True)

    location_accuracy = Column(
        String(32), default=LocationAccuracy.UNKNOWN.value, nullable=False
    )
    amenities = Column(JSON, default=list, nullable=False)
    pet_allowed = Column(Boolean, nullable=True)
    listing_status = Column(
        String(32), default=ListingStatus.UNKNOWN.value, nullable=False
    )
    source_kind = Column(String(32), default=SourceKind.DEMO.value, nullable=False)
    source_url = Column(String(1000), nullable=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    utilities_monthly_estimate_vnd = Column(Integer, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship to RoomImage (1-to-many)
    images = relationship(
        "RoomImage",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="RoomImage.display_order",
        lazy="selectin",
    )


class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(
        String(64), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url = Column(Text, nullable=False)
    caption = Column(String(255), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    room = relationship("Room", back_populates="images")
