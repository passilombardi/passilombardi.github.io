# Costruisce sorgenti/index.html (la pagina) e ../index.html (il sito, con manifest, icone e sw)
cd "$(dirname "$0")"
python3 -c "
h=open('head_v4.html').read();s=open('script_v4.js').read()
s=s.replace('/*LUOGHI*/',open('luoghi.js').read()).replace('/*ESERCIZI*/',open('esercizi.js').read()).replace('/*GIOCHI*/',open('giochi.js').read())
pag=h+'\n'+s
open('index.html','w').write(pag)
testa='''<!doctype html>
<html lang=\"it\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"theme-color\" content=\"#0f766e\"><meta name=\"description\" content=\"Passi Lombardi: la guida a voce per camminare, correre e pedalare in Lombardia.\"><link rel=\"manifest\" href=\"manifest.json\"><link rel=\"icon\" href=\"icona-192.png\"><link rel=\"apple-touch-icon\" href=\"icona-180.png\"><style>*{box-sizing:border-box}html,body{margin:0}</style></head><body>
'''
open('../index.html','w').write(testa+pag+'\n</body></html>\n')"
