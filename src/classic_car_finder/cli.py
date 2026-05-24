from __future__ import annotations

import argparse
import json
from decimal import Decimal
from pathlib import Path

from classic_car_finder.analyzer import OpportunityCriteria, find_opportunities
from classic_car_finder.storage import (
    load_store,
    merge_snapshots,
    read_snapshot_file,
    save_store,
)


DEFAULT_STORE = Path("data/listings.json")


def money(value: Decimal) -> str:
    return f"R$ {value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def percent(value: Decimal) -> str:
    return f"{value:.2f}%".replace(".", ",")


def import_snapshots(args: argparse.Namespace) -> int:
    store_path = Path(args.store)
    incoming = read_snapshot_file(Path(args.snapshot))
    existing = load_store(store_path)
    merged = merge_snapshots(existing, incoming)
    save_store(store_path, merged)

    print(
        f"Importadas {len(incoming)} observacoes. "
        f"Historico salvo em {store_path} com {len(merged)} observacoes."
    )
    return 0


def analyze(args: argparse.Namespace) -> int:
    snapshots = load_store(Path(args.store))
    criteria = OpportunityCriteria(
        max_model_year=args.max_year,
        min_price_drop_count=args.min_drops,
        min_discount_to_market_percent=Decimal(str(args.min_discount)),
        min_total_drop_percent=Decimal(str(args.min_total_drop)),
    )
    opportunities = find_opportunities(snapshots, criteria)

    if args.json:
        print(
            json.dumps(
                [opportunity.to_mapping() for opportunity in opportunities],
                indent=2,
                ensure_ascii=False,
            )
        )
        return 0

    if not opportunities:
        print("Nenhuma oportunidade encontrada com os criterios atuais.")
        return 0

    for index, opportunity in enumerate(opportunities, start=1):
        print(f"{index}. {opportunity.title} ({opportunity.year})")
        print(f"   Local: {opportunity.location or 'n/a'}")
        print(f"   Preco atual: {money(opportunity.current_price)}")
        print(f"   FIPE/mercado estimado: {money(opportunity.market_value)}")
        print(
            "   Quedas: "
            f"{opportunity.price_drop_count} | "
            f"queda total {money(opportunity.total_drop_amount)} "
            f"({percent(opportunity.total_drop_percent)}) | "
            f"desconto vs mercado {percent(opportunity.discount_to_market_percent)}"
        )
        print(f"   Score: {opportunity.score}")
        if opportunity.url:
            print(f"   Link: {opportunity.url}")
        print()

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="classic-car-finder",
        description=(
            "Encontra oportunidades de carros antigos com reducoes recorrentes "
            "de preco e margem potencial para revenda."
        ),
    )
    subparsers = parser.add_subparsers(required=True)

    import_parser = subparsers.add_parser(
        "import", help="Importa um snapshot CSV ou JSON de anuncios."
    )
    import_parser.add_argument("snapshot", help="Arquivo CSV ou JSON com listagens.")
    import_parser.add_argument(
        "--store",
        default=DEFAULT_STORE,
        help=f"Arquivo de historico local. Padrao: {DEFAULT_STORE}",
    )
    import_parser.set_defaults(func=import_snapshots)

    analyze_parser = subparsers.add_parser(
        "analyze", help="Analisa o historico e lista oportunidades."
    )
    analyze_parser.add_argument(
        "--store",
        default=DEFAULT_STORE,
        help=f"Arquivo de historico local. Padrao: {DEFAULT_STORE}",
    )
    analyze_parser.add_argument(
        "--max-year",
        type=int,
        default=1999,
        help="Ano maximo para considerar carro antigo. Padrao: 1999.",
    )
    analyze_parser.add_argument(
        "--min-drops",
        type=int,
        default=2,
        help="Quantidade minima de reducoes de preco. Padrao: 2.",
    )
    analyze_parser.add_argument(
        "--min-discount",
        type=Decimal,
        default=Decimal("15"),
        help="Desconto minimo em relacao ao valor de mercado estimado. Padrao: 15.",
    )
    analyze_parser.add_argument(
        "--min-total-drop",
        type=Decimal,
        default=Decimal("5"),
        help="Queda minima desde o primeiro preco visto. Padrao: 5.",
    )
    analyze_parser.add_argument(
        "--json",
        action="store_true",
        help="Imprime oportunidades em JSON.",
    )
    analyze_parser.set_defaults(func=analyze)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
