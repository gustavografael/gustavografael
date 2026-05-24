from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from classic_car_finder.models import ListingSnapshot, Opportunity
from classic_car_finder.storage import group_by_listing


@dataclass(frozen=True)
class OpportunityCriteria:
    max_model_year: int = 1999
    min_price_drop_count: int = 2
    min_discount_to_market_percent: Decimal = Decimal("15")
    min_total_drop_percent: Decimal = Decimal("5")


def count_price_drops(history: list[ListingSnapshot]) -> int:
    drop_count = 0
    previous_price = history[0].price

    for snapshot in history[1:]:
        if snapshot.price < previous_price:
            drop_count += 1
        previous_price = snapshot.price

    return drop_count


def latest_market_value(history: list[ListingSnapshot]) -> Decimal | None:
    for snapshot in reversed(history):
        if snapshot.market_value is not None:
            return snapshot.market_value

    return None


def build_opportunity(
    history: list[ListingSnapshot], criteria: OpportunityCriteria
) -> Opportunity | None:
    if not history:
        return None

    latest = history[-1]
    if latest.year is None or latest.year > criteria.max_model_year:
        return None

    drop_count = count_price_drops(history)
    if drop_count < criteria.min_price_drop_count:
        return None

    market_value = latest_market_value(history)
    if market_value is None or market_value <= 0:
        return None

    first_price = history[0].price
    current_price = latest.price
    lowest_price = min(snapshot.price for snapshot in history)
    total_drop_amount = first_price - current_price
    if first_price <= 0 or total_drop_amount <= 0:
        return None

    total_drop_percent = (total_drop_amount / first_price) * Decimal("100")
    discount_to_market_percent = (
        (market_value - current_price) / market_value
    ) * Decimal("100")

    if total_drop_percent < criteria.min_total_drop_percent:
        return None

    if discount_to_market_percent < criteria.min_discount_to_market_percent:
        return None

    score = (
        discount_to_market_percent
        + total_drop_percent
        + (Decimal(drop_count) * Decimal("2.5"))
    )

    return Opportunity(
        listing_id=latest.listing_id,
        title=latest.title,
        url=latest.url,
        year=latest.year,
        location=latest.location,
        current_price=current_price,
        first_seen_price=first_price,
        lowest_price=lowest_price,
        market_value=market_value,
        price_drop_count=drop_count,
        total_drop_amount=total_drop_amount,
        total_drop_percent=total_drop_percent.quantize(Decimal("0.01")),
        discount_to_market_percent=discount_to_market_percent.quantize(Decimal("0.01")),
        score=score.quantize(Decimal("0.01")),
        captured_at=latest.captured_at,
    )


def find_opportunities(
    snapshots: list[ListingSnapshot],
    criteria: OpportunityCriteria | None = None,
) -> list[Opportunity]:
    criteria = criteria or OpportunityCriteria()
    opportunities: list[Opportunity] = []

    for history in group_by_listing(snapshots).values():
        opportunity = build_opportunity(history, criteria)
        if opportunity is not None:
            opportunities.append(opportunity)

    return sorted(
        opportunities,
        key=lambda opportunity: (
            opportunity.score,
            opportunity.discount_to_market_percent,
            opportunity.price_drop_count,
        ),
        reverse=True,
    )
