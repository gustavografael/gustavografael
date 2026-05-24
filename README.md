# Classic Car Finder

Projeto inicial para identificar oportunidades de compra de carros antigos em
listagens do Facebook Marketplace ou fontes equivalentes.

O foco do MVP e simples:

- manter um historico local de precos por anuncio;
- considerar apenas carros antigos (por padrao, ano ate 1999);
- encontrar anuncios em que o dono ja baixou o preco mais de uma vez;
- calcular desconto contra um valor de mercado estimado;
- ordenar as oportunidades por um score de revenda.

> Observacao: este projeto nao automatiza login, nao burla controles do
> Facebook e nao faz scraping agressivo. Use snapshots/exportacoes que voce tem
> direito de consultar, dados inseridos manualmente ou integracoes autorizadas.

## Como funciona

1. Voce coleta um snapshot das listagens em CSV ou JSON.
2. O comando `import` adiciona esse snapshot ao historico local.
3. O comando `analyze` cruza o historico e mostra oportunidades.

Para que um carro apareca como oportunidade, ele precisa cumprir todos os
criterios padrao:

- ano do modelo menor ou igual a 1999;
- pelo menos 2 quedas de preco no historico;
- queda total de pelo menos 5% desde o primeiro preco observado;
- preco atual pelo menos 15% abaixo do valor de mercado estimado.

## Formato do snapshot

CSV minimo:

```csv
listing_id,title,price,year,market_value,captured_at
opala-1978-sp,Chevrolet Opala Comodoro 1978,45000,1978,50000,2026-05-01T12:00:00Z
```

Campos aceitos:

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `listing_id` | Nao | Identificador do anuncio. Se faltar, e gerado por URL/titulo/vendedor. |
| `source` | Nao | Fonte do dado. Padrao: `facebook_marketplace`. |
| `title` | Sim | Titulo do anuncio. |
| `url` | Nao | Link do anuncio. |
| `price` | Sim | Preco anunciado. Aceita `45000` ou `R$ 45.000,00`. |
| `year` | Sim | Ano do carro. |
| `mileage` | Nao | Quilometragem. |
| `location` | Nao | Cidade/estado. |
| `seller_name` | Nao | Nome do vendedor, se disponivel. |
| `market_value` | Sim | Valor de mercado/FIPE estimado para avaliar margem. |
| `captured_at` | Nao | Data ISO do snapshot. Se faltar, usa o horario atual. |

## Uso

O projeto usa apenas biblioteca padrao do Python.

```bash
python -m classic_car_finder.cli import examples/marketplace_snapshot.csv
python -m classic_car_finder.cli analyze
```

Tambem e possivel instalar localmente em modo editavel:

```bash
python -m pip install -e .
classic-car-finder import examples/marketplace_snapshot.csv
classic-car-finder analyze
```

Saida JSON:

```bash
classic-car-finder analyze --json
```

Ajustando criterios:

```bash
classic-car-finder analyze --max-year 1989 --min-drops 2 --min-discount 20
```

## Exemplo rapido

```bash
python -m classic_car_finder.cli import examples/marketplace_snapshot.csv
python -m classic_car_finder.cli analyze
```

Resultado esperado: o Opala 1978 do exemplo aparece porque teve duas reducoes
de preco e ficou abaixo do valor de mercado informado.

## Roadmap sugerido

- adicionar avaliacao de margem liquida com custos de transporte, revisao,
  documentacao e comissao;
- criar um conector autorizado para preencher snapshots a partir de uma fonte
  propria;
- enriquecer anuncios com FIPE ou outra referencia de preco;
- adicionar alerta por email/WhatsApp quando uma oportunidade ultrapassar score
  minimo;
- criar uma interface web simples para revisar oportunidades.
