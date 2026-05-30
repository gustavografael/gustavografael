# Por Dentro de um Pacote de Rede

Dashboard estática e interativa para explicar a jornada de um pacote pela rede.

## Acesso público

Quando o GitHub Pages estiver habilitado para este repositório e esta alteração
estiver na branch `main`, a página ficará disponível em:

https://gustavografael.github.io/gustavografael/

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente o
conteúdo estático do repositório no GitHub Pages a cada push na `main`.

## Executar localmente

Abra `index.html` no navegador ou sirva a pasta com:

```bash
python3 -m http.server 8000
```
