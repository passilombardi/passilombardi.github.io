# Passi Lombardi: come si costruisce

App: https://passilombardi.github.io/ · Anteprima Claude: https://claude.ai/artifact/Bqqwa8JJh8jkhTdRUmkgVT

- `build.sh` crea la pagina: head_v4.html + script_v4.js, con dentro luoghi.js (/*LUOGHI*/), esercizi.js (/*ESERCIZI*/) e giochi.js (/*GIOCHI*/). Cambiare il percorso della cartella in build.sh.
- index.html del sito = doctype + head (manifest, icone, sw) + pagina costruita + </body></html>.
- Voci: `a/*.mp3`. L{i} = LUOGHI[i] (nome + racconto + gioco), C{i} = LALLIO.cap[i], E{i} = ESERCIZI[i], F* = FRASI. Se cambia l'ordine o il testo dei luoghi, rigenerare quelle voci.
- Voci con kokoro-onnx, voce it 'if_sara', modello int8 dalla release github thewh1teagle/kokoro-onnx model-files-v1.0; mp3 mono 32k. gen.py jobs.json cartella parte n.
- Icona: icon.js (Playwright).
- Sul sito l'app usa GPS, tile OpenStreetMap, Nominatim (vie), routing.openstreetmap.de (percorsi), Overpass (posti intorno) e Wikipedia. Nell'anteprima no: lì le vie si toccano sulla mappa.
- Regole: contenuti adatti a bambini, niente marchi, niente nomi personali. Separata dal Gioco della Vita: non metterla su giocodellavitapm.github.io.
- Commit con identità passilombardi <passilombardi@users.noreply.github.com>.
