from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from html import escape

from classic_car_finder.models import Opportunity


def money(value: Decimal) -> str:
    return f"R$ {value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def percent(value: Decimal) -> str:
    return f"{value:.2f}%".replace(".", ",")


def render_opportunity_card(opportunity: Opportunity, position: int) -> str:
    safe_title = escape(opportunity.title)
    safe_location = escape(opportunity.location or "n/a")
    safe_year = escape(str(opportunity.year or "n/a"))
    safe_url = escape(opportunity.url, quote=True)
    button_label = (
        "Buscar no Marketplace"
        if "/marketplace/search/" in opportunity.url
        else "Ver anuncio"
    )
    link = (
        f'<a class="button" href="{safe_url}" target="_blank" '
        f'rel="noopener noreferrer">{button_label}</a>'
        if opportunity.url
        else '<span class="button button-disabled">Sem link</span>'
    )

    return f"""
      <article class="card">
        <div class="card-header">
          <div>
            <p class="rank">#{position} recomendacao</p>
            <h2>{safe_title}</h2>
            <p class="muted">{safe_year} - {safe_location}</p>
          </div>
          <div class="score">
            <span>Score</span>
            <strong>{escape(str(opportunity.score))}</strong>
          </div>
        </div>

        <div class="metrics">
          <div>
            <span>Preco atual</span>
            <strong>{escape(money(opportunity.current_price))}</strong>
          </div>
          <div>
            <span>Valor de mercado</span>
            <strong>{escape(money(opportunity.market_value))}</strong>
          </div>
          <div>
            <span>Desconto vs mercado</span>
            <strong>{escape(percent(opportunity.discount_to_market_percent))}</strong>
          </div>
          <div>
            <span>Quedas de preco</span>
            <strong>{opportunity.price_drop_count}</strong>
          </div>
        </div>

        <p class="reason">
          O dono ja baixou o valor {opportunity.price_drop_count} vezes.
          A queda total foi de {escape(money(opportunity.total_drop_amount))}
          ({escape(percent(opportunity.total_drop_percent))}) desde o primeiro
          preco observado.
        </p>

        <div class="actions">
          {link}
        </div>
      </article>
    """


def render_html_report(
    opportunities: list[Opportunity],
    title: str = "Recomendacoes de carros antigos",
) -> str:
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    cards = "\n".join(
        render_opportunity_card(opportunity, index)
        for index, opportunity in enumerate(opportunities, start=1)
    )
    if not cards:
        cards = """
      <section class="empty">
        <h2>Nenhuma recomendacao encontrada</h2>
        <p>Tente reduzir os filtros ou importar mais snapshots de precos.</p>
      </section>
        """

    safe_title = escape(title)
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_title}</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #f4f1ec;
      --card: #ffffff;
      --ink: #211a16;
      --muted: #756b62;
      --primary: #9b3d12;
      --primary-dark: #6f2a0c;
      --border: #e6ddd3;
      --green: #0f7a43;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(155, 61, 18, 0.18), transparent 28rem),
        var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }}

    .page {{
      max-width: 1120px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }}

    .hero {{
      display: grid;
      gap: 12px;
      margin-bottom: 28px;
    }}

    .eyebrow {{
      color: var(--primary);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      margin: 0;
      text-transform: uppercase;
    }}

    h1 {{
      font-size: clamp(2rem, 5vw, 4.5rem);
      line-height: 0.95;
      margin: 0;
      max-width: 780px;
    }}

    .subtitle {{
      color: var(--muted);
      font-size: 1.08rem;
      margin: 0;
      max-width: 760px;
    }}

    .summary {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 24px 0 34px;
    }}

    .pill {{
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      padding: 8px 14px;
    }}

    .grid {{
      display: grid;
      gap: 18px;
    }}

    .card,
    .empty {{
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 18px 42px rgba(44, 28, 17, 0.08);
      padding: 24px;
    }}

    .card-header {{
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }}

    .rank {{
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 4px;
      text-transform: uppercase;
    }}

    h2 {{
      font-size: clamp(1.35rem, 3vw, 2.1rem);
      line-height: 1.1;
      margin: 0;
    }}

    .muted {{
      color: var(--muted);
      margin: 6px 0 0;
    }}

    .score {{
      background: #f7eee6;
      border-radius: 18px;
      min-width: 92px;
      padding: 10px 14px;
      text-align: center;
    }}

    .score span,
    .metrics span {{
      color: var(--muted);
      display: block;
      font-size: 0.78rem;
      margin-bottom: 2px;
    }}

    .score strong {{
      color: var(--primary-dark);
      font-size: 1.35rem;
    }}

    .metrics {{
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-top: 22px;
    }}

    .metrics div {{
      background: #fbf8f4;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 12px;
    }}

    .metrics strong {{
      color: var(--ink);
      font-size: 1.05rem;
    }}

    .reason {{
      border-left: 4px solid var(--green);
      color: var(--muted);
      margin: 20px 0 0;
      padding-left: 14px;
    }}

    .actions {{
      display: flex;
      margin-top: 20px;
    }}

    .button {{
      background: var(--primary);
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      font-weight: 700;
      padding: 12px 18px;
      text-decoration: none;
    }}

    .button:hover {{
      background: var(--primary-dark);
    }}

    .button-disabled {{
      background: #b9afa6;
    }}

    @media (max-width: 780px) {{
      .card-header {{
        display: grid;
      }}

      .score {{
        text-align: left;
      }}

      .metrics {{
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }}
    }}

    @media (max-width: 520px) {{
      .metrics {{
        grid-template-columns: 1fr;
      }}
    }}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Facebook Marketplace radar</p>
      <h1>{safe_title}</h1>
      <p class="subtitle">
        Carros antigos que parecem oportunidade para revenda porque tiveram
        mais de uma reducao de preco e estao abaixo do valor de mercado estimado.
      </p>
    </section>

    <section class="summary" aria-label="Resumo">
      <span class="pill">{len(opportunities)} recomendacao(oes)</span>
      <span class="pill">Gerado em {escape(generated_at)}</span>
      <span class="pill">Filtro: 2+ quedas de preco</span>
    </section>

    <section class="grid">
{cards}
    </section>
  </main>
</body>
</html>
"""
