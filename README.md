# Gmail Cleaner Helper

Assistente de linha de comando para revisar e limpar e-mails de uma conta Gmail
usando regras configuraveis.

O projeto foi desenhado para ser seguro por padrao:

- `preview` mostra as mensagens encontradas sem alterar nada.
- `apply` exige `--yes`.
- Exclusao permanente exige duas confirmacoes: `allow_permanent_delete: true`
  na regra e `--allow-delete` na execucao.
- Arquivos locais com credenciais, tokens e regras pessoais ficam no `.gitignore`.

## Requisitos

- Python 3.10+
- Uma credencial OAuth de aplicativo Desktop no Google Cloud
- Gmail API habilitada no projeto do Google Cloud

## Instalacao

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

## Configuracao do Google

1. Acesse o Google Cloud Console.
2. Crie ou escolha um projeto.
3. Habilite a Gmail API.
4. Crie uma credencial OAuth Client ID do tipo Desktop app.
5. Baixe o JSON e salve na raiz do projeto como `credentials.json`.

Na primeira execucao, o CLI abrira um fluxo OAuth no navegador e gravara
`token.json` localmente.

## Criar regras

Gere um arquivo inicial:

```bash
gmail-cleaner init
```

Ou copie o exemplo:

```bash
cp examples/rules.example.yml rules.yml
```

Formato:

```yaml
rules:
  - name: promocoes-antigas
    query: "category:promotions older_than:180d"
    action: trash
    max_messages: 100
```

Campos:

- `name`: nome humano da regra.
- `query`: busca do Gmail, igual a barra de pesquisa do Gmail.
- `action`: uma de `archive`, `trash`, `delete`, `label`, `mark_read`.
- `max_messages`: limite de mensagens processadas pela regra.
- `label`: obrigatorio quando `action: label`; pode ser nome ou ID do label.
- `allow_permanent_delete`: obrigatorio para `action: delete`.

## Revisar antes de aplicar

```bash
gmail-cleaner preview
```

Isso lista as mensagens encontradas por cada regra e nao muda nada no Gmail.

## Aplicar regras

```bash
gmail-cleaner apply --yes
```

Para exclusao permanente:

```bash
gmail-cleaner apply --yes --allow-delete
```

Prefira `trash` quando estiver em duvida, porque a lixeira ainda permite
recuperacao por um periodo.

## Consultas uteis do Gmail

- `older_than:180d`
- `newer_than:30d`
- `category:promotions`
- `from:newsletter@example.com`
- `is:unread`
- `has:attachment`
- `larger:10M`

Exemplo combinando filtros:

```yaml
rules:
  - name: anexos-grandes-antigos
    query: "has:attachment larger:10M older_than:365d"
    action: trash
    max_messages: 50
```

## Testes

```bash
pytest
```
