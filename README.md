# Por Dentro de um Pacote de Rede

Dashboard estática e interativa para explicar a jornada de um pacote pela rede.

## Preview público imediato

Enquanto o GitHub Pages oficial não estiver habilitado, use este preview público:

https://rawcdn.githack.com/gustavografael/gustavografael/fd99bb8e5a387985a233b0025b878879383e3acb/index.html

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

## Recursos

- Detecta automaticamente o IP local e o IP público do usuário.
- Botão **Testar IP** valida o destino e mostra informações da rota.

