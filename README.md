# Por Dentro de um Pacote de Rede

Dashboard estática e interativa para explicar a jornada de um pacote pela rede.

## Preview público imediato

Enquanto o GitHub Pages oficial não estiver habilitado, use este preview público:

https://rawcdn.githack.com/gustavografael/gustavografael/6ecb7ff8a4f30919caef0806242c3c7b232c87f9/index.html

Esse link usa os arquivos HTML, CSS e JS armazenados neste repositório no GitHub.

## GitHub Pages oficial

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
