# Passi Lombardi: come si costruisce

App: https://passilombardi.github.io/ · Anteprima Claude: https://claude.ai/artifact/Bqqwa8JJh8jkhTdRUmkgVT

- `bash sorgenti/build.sh` crea sorgenti/index.html (la pagina per l'anteprima, non va su git) e l'index.html del sito (doctype + head con manifest, icone, sw + pagina + </body></html>). La pagina = head_v4.html + script_v4.js con dentro luoghi.js (/*LUOGHI*/), esercizi.js (/*ESERCIZI*/) e giochi.js (/*GIOCHI*/).
- Se cambiano le voci, alzare il numero della cache in sw.js (passi-vN), se no i telefoni tengono le vecchie.
- Da via a via: partenza «Da qui» (GPS), vie suggerite da Nominatim mentre si scrive, percorso con le svolte (OSRM steps) dette a voce 40 m prima. I percorsi pronti sul sito seguono le strade vere (sullaStrada).
- Dove sono: «Dimmi dove sono» dice via, paese e i posti intorno con la direzione; se la via ha il nome di un posto vicino (piazza San Bernardino → chiesa di San Bernardino) racconta il posto.
- Voci: `a/*.mp3`. L{i} = LUOGHI[i] (nome + racconto + gioco), C{i} = LALLIO.cap[i], E{i} = ESERCIZI[i], F* = FRASI. Se cambia l'ordine o il testo dei luoghi, rigenerare quelle voci.
- Voci con kokoro-onnx, voce it 'if_sara', modello int8 dalla release github thewh1teagle/kokoro-onnx model-files-v1.0; mp3 mono 32k. gen.py jobs.json cartella parte n.
- Icona: icon.js (Playwright).
- Sul sito l'app usa GPS, tile OpenStreetMap, Nominatim (vie), routing.openstreetmap.de (percorsi), Overpass (posti intorno) e Wikipedia. Nell'anteprima no: lì le vie si toccano sulla mappa.
- Regole: contenuti adatti a bambini, niente marchi, niente nomi personali. Separata dal Gioco della Vita: non metterla su giocodellavitapm.github.io.
- Commit con identità passilombardi <passilombardi@users.noreply.github.com>.
- Voce: di default la voce italiana più naturale del telefono (bella(): Natural/Premium/Google…); le mp3 di Sara si usano solo se scelte o se il telefono non ha voci naturali. Schermata «La voce della guida» (tab-voce), scelta salvata in localStorage passi_voce.
- Racconti solo vicino: raggio(L,modo) decide quanto vicino devi essere, uguale in percorsi e in Dove sono. Nel giro di Lallio i capitoli delle chiese partono a 80 m dalla chiesa vera (POI OSM).
