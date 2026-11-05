cd "$(dirname "$0")"
python3 -c "
h=open('head_v4.html').read();s=open('script_v4.js').read()
s=s.replace('/*LUOGHI*/',open('luoghi.js').read()).replace('/*ESERCIZI*/',open('esercizi.js').read()).replace('/*GIOCHI*/',open('giochi.js').read())
open('index.html','w').write(h+'\n'+s)"
