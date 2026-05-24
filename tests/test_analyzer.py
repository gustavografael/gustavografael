import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from classic_car_finder.analyzer import OpportunityCriteria, find_opportunities
from classic_car_finder.storage import read_snapshot_file


class AnalyzerTest(unittest.TestCase):
    def write_snapshot(self, rows: list[str]) -> Path:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        snapshot = Path(directory.name) / "snapshot.csv"
        snapshot.write_text("\n".join(rows), encoding="utf-8")
        return snapshot

    def test_finds_old_car_with_multiple_price_drops(self):
        snapshot = self.write_snapshot(
            [
                "listing_id,title,price,year,market_value,captured_at",
                "opala,Chevrolet Opala 1978,45000,1978,50000,2026-05-01T12:00:00Z",
                "opala,Chevrolet Opala 1978,42000,1978,50000,2026-05-10T12:00:00Z",
                "opala,Chevrolet Opala 1978,38000,1978,50000,2026-05-20T12:00:00Z",
            ]
        )

        opportunities = find_opportunities(read_snapshot_file(snapshot))

        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0].listing_id, "opala")
        self.assertEqual(opportunities[0].price_drop_count, 2)
        self.assertEqual(opportunities[0].current_price, Decimal("38000"))
        self.assertEqual(opportunities[0].discount_to_market_percent, Decimal("24.00"))

    def test_requires_more_than_one_price_drop(self):
        snapshot = self.write_snapshot(
            [
                "listing_id,title,price,year,market_value,captured_at",
                "fusca,Volkswagen Fusca 1984,29000,1984,33000,2026-05-01T12:00:00Z",
                "fusca,Volkswagen Fusca 1984,27500,1984,33000,2026-05-20T12:00:00Z",
            ]
        )

        opportunities = find_opportunities(read_snapshot_file(snapshot))

        self.assertEqual(opportunities, [])

    def test_filters_out_modern_cars_even_with_repeated_drops(self):
        snapshot = self.write_snapshot(
            [
                "listing_id,title,price,year,market_value,captured_at",
                "civic,Honda Civic 2012,52000,2012,58000,2026-05-01T12:00:00Z",
                "civic,Honda Civic 2012,50000,2012,58000,2026-05-10T12:00:00Z",
                "civic,Honda Civic 2012,47000,2012,58000,2026-05-20T12:00:00Z",
            ]
        )

        opportunities = find_opportunities(read_snapshot_file(snapshot))

        self.assertEqual(opportunities, [])

    def test_criteria_can_adjust_old_car_cutoff(self):
        snapshot = self.write_snapshot(
            [
                "listing_id,title,price,year,market_value,captured_at",
                "civic,Honda Civic 2012,52000,2012,58000,2026-05-01T12:00:00Z",
                "civic,Honda Civic 2012,50000,2012,58000,2026-05-10T12:00:00Z",
                "civic,Honda Civic 2012,47000,2012,58000,2026-05-20T12:00:00Z",
            ]
        )

        opportunities = find_opportunities(
            read_snapshot_file(snapshot),
            OpportunityCriteria(max_model_year=2015),
        )

        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0].listing_id, "civic")


if __name__ == "__main__":
    unittest.main()
