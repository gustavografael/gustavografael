from __future__ import annotations

import argparse
from pathlib import Path
from typing import NoReturn

from rich.console import Console
from rich.table import Table

from .gmail_api import GmailCleaner, RuleResult, build_service
from .rules import RuleValidationError, load_rules


EXAMPLE_RULES = """rules:
  - name: newsletters-antigas
    query: "category:promotions older_than:180d"
    action: trash
    max_messages: 100

  - name: recibos-arquivados
    query: 'from:(no-reply@example.com) older_than:365d'
    action: archive
    max_messages: 50

  - name: marcar-lidas-promocoes
    query: "category:promotions is:unread older_than:30d"
    action: mark_read
    max_messages: 100
"""


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    console = Console()

    try:
        return args.handler(args, console)
    except (OSError, RuleValidationError, RuntimeError, ValueError) as exc:
        console.print(f"[bold red]Erro:[/bold red] {exc}")
        return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gmail-cleaner",
        description="Ajuda a revisar e limpar mensagens do Gmail com regras seguras.",
    )
    parser.add_argument(
        "--rules",
        type=Path,
        default=Path("rules.yml"),
        help="Arquivo YAML com regras de limpeza (padrao: rules.yml).",
    )
    parser.add_argument(
        "--credentials",
        type=Path,
        default=Path("credentials.json"),
        help="OAuth client JSON baixado do Google Cloud (padrao: credentials.json).",
    )
    parser.add_argument(
        "--token",
        type=Path,
        default=Path("token.json"),
        help="Arquivo local para armazenar token OAuth (padrao: token.json).",
    )

    subparsers = parser.add_subparsers(required=True)

    init_parser = subparsers.add_parser(
        "init",
        help="Cria um arquivo inicial de regras.",
    )
    init_parser.add_argument(
        "--force",
        action="store_true",
        help="Sobrescreve o arquivo de regras se ele ja existir.",
    )
    init_parser.set_defaults(handler=handle_init)

    preview_parser = subparsers.add_parser(
        "preview",
        help="Mostra quais mensagens cada regra encontraria, sem alterar o Gmail.",
    )
    preview_parser.set_defaults(handler=handle_preview)

    apply_parser = subparsers.add_parser(
        "apply",
        help="Executa as regras. Requer --yes para evitar alteracoes acidentais.",
    )
    apply_parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirma que as regras devem ser aplicadas.",
    )
    apply_parser.add_argument(
        "--allow-delete",
        action="store_true",
        help="Permite exclusao permanente quando a regra tambem autoriza.",
    )
    apply_parser.set_defaults(handler=handle_apply)

    return parser


def handle_init(args: argparse.Namespace, console: Console) -> int:
    if args.rules.exists() and not args.force:
        raise FileExistsError(
            f"{args.rules} ja existe. Use --force para sobrescrever."
        )

    args.rules.write_text(EXAMPLE_RULES, encoding="utf-8")
    console.print(f"[green]Arquivo criado:[/green] {args.rules}")

    example_credentials = Path("credentials.json")
    if not example_credentials.exists():
        console.print(
            "Baixe um OAuth client JSON do Google Cloud e salve como "
            "[bold]credentials.json[/bold]."
        )
    return 0


def handle_preview(args: argparse.Namespace, console: Console) -> int:
    rules = load_rules(args.rules)
    cleaner = _build_cleaner(args)

    for rule in rules:
        result = cleaner.preview_rule(rule)
        _render_result(console, result)

    console.print("[bold green]Nenhuma mensagem foi alterada.[/bold green]")
    return 0


def handle_apply(args: argparse.Namespace, console: Console) -> int:
    if not args.yes:
        _fail(
            "apply exige --yes. Execute 'gmail-cleaner preview' antes de aplicar "
            "para conferir as mensagens encontradas."
        )

    rules = load_rules(args.rules)
    cleaner = _build_cleaner(args)

    total = 0
    for rule in rules:
        count = cleaner.apply_rule(
            rule,
            allow_delete=args.allow_delete,
            progress=lambda message: console.print(f"[cyan]{message}[/cyan]"),
        )
        total += count
        console.print(f"{rule.name}: {count} mensagens processadas")

    console.print(f"[bold green]Concluido:[/bold green] {total} mensagens processadas.")
    return 0


def _build_cleaner(args: argparse.Namespace) -> GmailCleaner:
    service = build_service(args.credentials, args.token)
    return GmailCleaner(service)


def _render_result(console: Console, result: RuleResult) -> None:
    title = (
        f"{result.rule.name} | action={result.rule.action.value} | "
        f"query={result.rule.query!r}"
    )
    table = Table(title=title)
    table.add_column("ID", overflow="fold")
    table.add_column("From", overflow="fold")
    table.add_column("Subject", overflow="fold")
    table.add_column("Date", overflow="fold")

    if not result.messages:
        table.add_row("-", "Nenhuma mensagem encontrada", "-", "-")
    else:
        for message in result.messages:
            table.add_row(message.id, message.from_, message.subject, message.date)

    console.print(table)


def _fail(message: str) -> NoReturn:
    raise ValueError(message)


if __name__ == "__main__":
    raise SystemExit(main())
