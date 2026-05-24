from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from classic_car_finder.models import ListingSnapshot


def read_csv_snapshots(path: Path) -> list[ListingSnapshot]:
    with path.open(newline="", encoding="utf-8") as file:
        return [ListingSnapshot.from_mapping(row) for row in csv.DictReader(file)]


def read_json_snapshots(path: Path) -> list[ListingSnapshot]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Snapshot JSON must contain a list of listings")

    return [ListingSnapshot.from_mapping(row) for row in payload]


def read_snapshot_file(path: Path) -> list[ListingSnapshot]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return read_csv_snapshots(path)
    if suffix == ".json":
        return read_json_snapshots(path)

    raise ValueError(f"Unsupported snapshot file type: {path.suffix}")


def load_store(path: Path) -> list[ListingSnapshot]:
    if not path.exists():
        return []

    return read_json_snapshots(path)


def save_store(path: Path, snapshots: list[ListingSnapshot]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(
        snapshots,
        key=lambda snapshot: (snapshot.listing_id, snapshot.captured_at, snapshot.price),
    )
    payload = [snapshot.to_mapping() for snapshot in ordered]
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def merge_snapshots(
    existing: list[ListingSnapshot], incoming: list[ListingSnapshot]
) -> list[ListingSnapshot]:
    indexed: dict[tuple[str, str, str], ListingSnapshot] = {}

    for snapshot in [*existing, *incoming]:
        key = (
            snapshot.listing_id,
            snapshot.captured_at.isoformat(),
            str(snapshot.price),
        )
        indexed[key] = snapshot

    return list(indexed.values())


def group_by_listing(
    snapshots: list[ListingSnapshot],
) -> dict[str, list[ListingSnapshot]]:
    grouped: dict[str, list[ListingSnapshot]] = defaultdict(list)
    for snapshot in snapshots:
        grouped[snapshot.listing_id].append(snapshot)

    return {
        listing_id: sorted(items, key=lambda snapshot: snapshot.captured_at)
        for listing_id, items in grouped.items()
    }
