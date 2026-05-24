from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from typing import Any


def parse_decimal(value: Any) -> Decimal | None:
    """Parse prices written as numbers or Brazilian currency strings."""
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    normalized = text.replace("R$", "").replace(" ", "")
    if "," in normalized:
        normalized = normalized.replace(".", "").replace(",", ".")

    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid decimal value: {value!r}") from exc


def parse_int(value: Any) -> int | None:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    digits = "".join(character for character in text if character.isdigit())
    if not digits:
        return None

    return int(digits)


def parse_datetime(value: Any) -> datetime:
    if value is None or str(value).strip() == "":
        return datetime.now(timezone.utc)

    text = str(value).strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"

    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def stable_listing_id(url: str, title: str, seller_name: str | None = None) -> str:
    """Build a stable fallback id when the data source does not expose one."""
    raw_identifier = "|".join(
        part.strip().lower() for part in (url, title, seller_name or "") if part
    )
    return sha256(raw_identifier.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class ListingSnapshot:
    listing_id: str
    title: str
    price: Decimal
    captured_at: datetime
    url: str = ""
    source: str = "facebook_marketplace"
    year: int | None = None
    mileage: int | None = None
    location: str = ""
    seller_name: str = ""
    market_value: Decimal | None = None

    @classmethod
    def from_mapping(cls, row: dict[str, Any]) -> "ListingSnapshot":
        title = str(row.get("title", "")).strip()
        url = str(row.get("url", "")).strip()
        seller_name = str(row.get("seller_name", "")).strip()
        listing_id = str(row.get("listing_id", "")).strip()

        if not listing_id:
            listing_id = stable_listing_id(url=url, title=title, seller_name=seller_name)

        price = parse_decimal(row.get("price"))
        if price is None:
            raise ValueError(f"Listing {listing_id!r} is missing a price")

        return cls(
            listing_id=listing_id,
            source=str(row.get("source", "facebook_marketplace")).strip()
            or "facebook_marketplace",
            title=title,
            url=url,
            price=price,
            year=parse_int(row.get("year")),
            mileage=parse_int(row.get("mileage")),
            location=str(row.get("location", "")).strip(),
            seller_name=seller_name,
            market_value=parse_decimal(row.get("market_value")),
            captured_at=parse_datetime(row.get("captured_at")),
        )

    def to_mapping(self) -> dict[str, Any]:
        return {
            "listing_id": self.listing_id,
            "source": self.source,
            "title": self.title,
            "url": self.url,
            "price": str(self.price),
            "year": self.year,
            "mileage": self.mileage,
            "location": self.location,
            "seller_name": self.seller_name,
            "market_value": str(self.market_value) if self.market_value is not None else None,
            "captured_at": self.captured_at.isoformat(),
        }


@dataclass(frozen=True)
class Opportunity:
    listing_id: str
    title: str
    url: str
    year: int | None
    location: str
    current_price: Decimal
    first_seen_price: Decimal
    lowest_price: Decimal
    market_value: Decimal
    price_drop_count: int
    total_drop_amount: Decimal
    total_drop_percent: Decimal
    discount_to_market_percent: Decimal
    score: Decimal
    captured_at: datetime

    def to_mapping(self) -> dict[str, Any]:
        return {
            "listing_id": self.listing_id,
            "title": self.title,
            "url": self.url,
            "year": self.year,
            "location": self.location,
            "current_price": str(self.current_price),
            "first_seen_price": str(self.first_seen_price),
            "lowest_price": str(self.lowest_price),
            "market_value": str(self.market_value),
            "price_drop_count": self.price_drop_count,
            "total_drop_amount": str(self.total_drop_amount),
            "total_drop_percent": str(self.total_drop_percent),
            "discount_to_market_percent": str(self.discount_to_market_percent),
            "score": str(self.score),
            "captured_at": self.captured_at.isoformat(),
        }
