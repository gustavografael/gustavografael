from __future__ import annotations

import argparse
import json
from decimal import Decimal
from pathlib import Path

from classic_car_finder.analyzer import OpportunityCriteria, find_opportunities
from classic_car_finder.presentation import money, percent, render_html_report
from classic_car_finder.storage import (
    load_store,
    merge_snapshots,
    read_snapshot_file,
    save_store,
)


DEFAULT_STORE = Path("data/listings.json")
DEFAULT_REPORT = Path("reports/recommendations.html")


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
    criteria = criteria_from_args(args)
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


def criteria_from_args(args: argparse.Namespace) -> OpportunityCriteria:
    return OpportunityCriteria(
        max_model_year=args.max_year,
        min_price_drop_count=args.min_drops,
        min_discount_to_market_percent=Decimal(str(args.min_discount)),
        min_total_drop_percent=Decimal(str(args.min_total_drop)),
    )


def report(args: argparse.Namespace) -> int:
    snapshots = load_store(Path(args.store))
    opportunities = find_opportunities(snapshots, criteria_from_args(args))
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        render_html_report(opportunities, title=args.title),
        encoding="utf-8",
    )

    print(
        f"Relatorio HTML salvo em {output_path} "
        f"com {len(opportunities)} recomendacao(oes)."
    )
    return 0


def add_criteria_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--max-year",
        type=int,
        default=1999,
        help="Ano maximo para considerar carro antigo. Padrao: 1999.",
    )
    parser.add_argument(
        "--min-drops",
        type=int,
        default=2,
        help="Quantidade minima de reducoes de preco. Padrao: 2.",
    )
    parser.add_argument(
        "--min-discount",
        type=Decimal,
        default=Decimal("15"),
        help="Desconto minimo em relacao ao valor de mercado estimado. Padrao: 15.",
    )
    parser.add_argument(
        "--min-total-drop",
        type=Decimal,
        default=Decimal("5"),
        help="Queda minima desde o primeiro preco visto. Padrao: 5.",
    )


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
    add_criteria_arguments(analyze_parser)
    analyze_parser.add_argument(
        "--json",
        action="store_true",
        help="Imprime oportunidades em JSON.",
    )
    analyze_parser.set_defaults(func=analyze)

    report_parser = subparsers.add_parser(
        "report", help="Gera uma pagina HTML com as recomendacoes."
    )
    report_parser.add_argument(
        "--store",
        default=DEFAULT_STORE,
        help=f"Arquivo de historico local. Padrao: {DEFAULT_STORE}",
    )
    report_parser.add_argument(
        "--output",
        default=DEFAULT_REPORT,
        help=f"Arquivo HTML de saida. Padrao: {DEFAULT_REPORT}",
    )
    report_parser.add_argument(
        "--title",
        default="Recomendacoes de carros antigos",
        help="Titulo exibido no relatorio HTML.",
    )
    add_criteria_arguments(report_parser)
    report_parser.set_defaults(func=report)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
