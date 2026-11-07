/* =========================================================
   CALCIOMANIA PM — ICONE, VOLTI E DIVISE
   Icone a linea tutte uguali (SVG), volti dei giocatori disegnati dal gioco, maglie con i disegni.
   ========================================================= */
'use strict';

const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  squadra: '<path d="M8 3 3.5 6 5 10l2-.8V21h10V9.2l2 .8L20.5 6 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3z"/>',
  mercato: '<path d="M4 8h14.5l-3.5-3.5"/><path d="M20 16H5.5L9 19.5"/>',
  club: '<path d="M12 3 4 6v5.5c0 4.8 3.4 8.6 8 9.5 4.6-.9 8-4.7 8-9.5V6z"/><path d="M12 8v8M8.5 11.5h7"/>',
  coppa: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9.5 21h5l-.6-4h-3.8z"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  euro: '<path d="M17.5 6.6A6.5 6.5 0 1 0 17.5 17.4"/><path d="M4 10h9M4 14h9"/>',
  grafico: '<path d="M4 4v16h16"/><path d="M7.5 15l4-4 3 3 5-6"/>',
  notizie: '<rect x="3" y="4" width="15" height="16" rx="2"/><path d="M18 8h2.5v10a2 2 0 0 1-2 2H5"/><path d="M6.5 8h8M6.5 12h8M6.5 16h5"/>',
  avviso: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  medico: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  cartellino: '<rect x="7.5" y="3.5" width="9.5" height="14" rx="1.5" transform="rotate(12 12 11)"/>',
  pallone: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6l3.1 2.2-1.2 3.7h-3.8l-1.2-3.7z"/><path d="M12 3.5v4.1M15.1 9.8l3.9-1.3M13.9 13.5l2.4 3.4M10.1 13.5l-2.4 3.4M8.9 9.8 5 8.5"/>',
  stadio: '<ellipse cx="12" cy="8" rx="9" ry="3.5"/><path d="M3 8v7c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V8"/><path d="M8 11.2v6.8M16 11.2v6.8"/>',
  allenamento: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  giovani: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 14c0-3.5 2.5-5.5 7-5.5 0 3.5-2.5 5.5-7 5.5z"/>',
  staff: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  tattica: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="8" cy="8" r="1.4"/><circle cx="16" cy="16" r="1.4"/><path d="M8 10.5c0 4 3 5.5 6.5 5.5"/><path d="M14 6l3 3M17 6l-3 3"/>',
  ingranaggio: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  salva: '<path d="M5 3.5h11l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5"/><path d="M8 3.5V9h7V3.5M8 20.5V14h8v6.5"/>',
  cartella: '<path d="M3.5 7v11a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9A1.5 1.5 0 0 0 19 7.5h-7L10 5H5a1.5 1.5 0 0 0-1.5 1.5z"/>',
  cerca: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  ordina: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>',
  su: '<path d="M6 15l6-6 6 6"/>', giu: '<path d="M6 9l6 6 6-6"/>', destra: '<path d="M9 6l6 6-6 6"/>', sinistra: '<path d="M15 6l-6 6 6 6"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>', pausa: '<path d="M8 5v14M16 5v14"/>', avanti: '<path d="M4 5.5v13l8-6.5zM12 5.5v13l8-6.5z"/>',
  cambio: '<path d="M8 20V5M4.5 8.5 8 5l3.5 3.5M16 4v15M12.5 15.5 16 19l3.5-3.5"/>',
  stella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', piu: '<path d="M12 5v14M5 12h14"/>', meno: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  utente: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  utenti: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.8c2 .7 3.3 2.4 4 5.2"/>',
  esci: '<path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4"/>',
  lucchetto: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/>',
  chiave: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16.5 6.5 19 9M14 9l2 2"/>',
  contratto: '<path d="M14 3.5H6.5A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5H12"/><path d="M14 3.5 19 8.5v3"/><path d="M8.5 9h5M8.5 13h4"/><path d="M14.5 20.5l.6-2.6 5-5 2 2-5 5z"/>',
  microfono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  megafono: '<path d="M3.5 10v4h3l8 4.5v-13l-8 4.5z"/><path d="M6.5 14 8 19.5h2.5l-1-5"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5"/>',
  cuore: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  banca: '<path d="M3 9.5 12 4l9 5.5M4.5 9.5h15M6 9.5v8M10 9.5v8M14 9.5v8M18 9.5v8M3.5 20.5h17"/>',
  biglietto: '<path d="M3.5 8a2 2 0 0 1 0 4v3.5A1.5 1.5 0 0 0 5 17h14a1.5 1.5 0 0 0 1.5-1.5V12a2 2 0 0 1 0-4V6.5A1.5 1.5 0 0 0 19 5H5a1.5 1.5 0 0 0-1.5 1.5z"/><path d="M14.5 5v12" stroke-dasharray="2 2"/>',
  luce: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  campo: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M3 9.5h3v5H3M21 9.5h-3v5h3"/>',
  negozio: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  parcheggio: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16.5v-9h3a2.5 2.5 0 0 1 0 5h-3"/>',
  schermo: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
  occhio: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  stetoscopio: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2a5 5 0 0 0 10 0V13"/><circle cx="20" cy="11" r="2"/>',
  battito: '<path d="M3 12h4l2.5-6.5 5 13L17 12h4"/>',
  valigetta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17"/>',
  cronometro: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6"/>',
  fuoco: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2C5.5 10 10 8.5 9.5 3c3.5 2 5 5 5 7.5 1-1 1.5-2.2 1.5-3.5 2 1.8 2.5 4.4 2.5 7.8C18.5 18.4 15.9 21 12 21z"/>',
  scudo: '<path d="M12 3 4 6v5.5c0 4.8 3.4 8.6 8 9.5 4.6-.9 8-4.7 8-9.5V6z"/>',
  bersaglio: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  bilancia: '<path d="M12 4v16M5 20.5h14M5.5 7.5h13M5.5 7.5 3 13a2.5 2.5 0 0 0 5 0zM18.5 7.5 16 13a2.5 2.5 0 0 0 5 0z"/>',
  regalo: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10.5 4.5 7 4.5 7 6.5S10 8 12 8zM12 8c1.5-3.5 5-3.5 5-1.5S14 8 12 8z"/>',
  fulmine: '<path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  nuvola: '<path d="M7 18.5h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/>',
  bandiera: '<path d="M5 21V4M5 4.5c4-2 7 2 11 0v8c-4 2-7-2-11 0"/>',
  corona: '<path d="M3.5 8l4 4L12 5l4.5 7 4-4-1.8 10.5H5.3z"/>',
  sacco: '<path d="M9 3.5h6l-1.5 3h-3z"/><path d="M10.5 6.5C6 8.5 4.5 12.5 4.5 15c0 3.5 3 5.5 7.5 5.5s7.5-2 7.5-5.5c0-2.5-1.5-6.5-6-8.5"/><path d="M14 11.5a2.2 2.2 0 0 0-2-1.2c-1.2 0-2 .7-2 1.5 0 2 4 1 4 3 0 .9-.9 1.6-2 1.6a2.3 2.3 0 0 1-2.1-1.3M12 9.5v1M12 16.5v1"/>',
  lista: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.5M4.5 12h.5M4.5 17.5h.5"/>',
  matita: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  cestino: '<path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13.5h9l1-13.5"/>',
  ricarica: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.6l1.7-2.1M20 20v-4.5h-4.5"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11.5h16M7.5 17v3M16.5 17v3"/>',
  telefono: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  suono: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  muto: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  aiuto: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.2-2.4 3.7M12 17v.2"/>',
  mondo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.5 5.3 3.5 8.5s-1 6.2-3.5 8.5c-2.5-2.3-3.5-5.3-3.5-8.5s1-6.2 3.5-8.5z"/>',
  bacchetta: '<path d="M4 20 15 9"/><path d="M15 3v2.5M15 12.5V15M19.5 7.5H22M8 7.5h2.5M18.2 4.3l-1.6 1.6M18.2 10.7l-1.6-1.6"/>',
  pennello: '<path d="M14.5 4.5l5 5-7.5 7.5-5-5z"/><path d="M7 12c-2.5 0-3.5 2-3.5 4.5 0 1.5-.5 2.5-1 3 3.5.5 7.5-.5 7.5-4.5"/>',
  scarica: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>', carica: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14"/>',
  copia: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5v-3A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  freccia_su: '<path d="M12 19V5M6 11l6-6 6 6"/>', freccia_giu: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  tenda: '<path d="M3 20.5 12 4l9 16.5zM12 4v16.5M8.5 20.5 12 14l3.5 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', piu: '<path d="M12 5v14M5 12h14"/>', meno: '<path d="M5 12h14"/>',
  filtro: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>', doccia: '<path d="M5 20V8a4 4 0 0 1 8 0"/><path d="M10 11h6M11 14l-.5 2M14 14v2.5M17 14l.5 2"/>',
  scuola: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c3 2.5 8 2.5 11 0v-5M21.5 9v5"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || IC.info}</svg>`;

// ---------- volto del giocatore ----------
// Disegnato dal gioco a partire dal giocatore: pelle, capelli, barba, occhi. Sempre uguale per lo stesso giocatore.
const CAPELLI_C = ['#1d140c', '#3b2416', '#5a3a22', '#8a5a33', '#b98a4e', '#d9b45a', '#141414', '#2a2a2a', '#6b4a2f', '#a05a2c'];
function avatarSVG(p, size = 44, colori){
  const h = hashStr((p.id || '') + p.n + p.c), N = NAZIONI[p.naz] || NAZIONI.IT;
  const pelli = N.pelle || [0, 1, 4], pelle = PELLI[pelli[h % pelli.length]];
  const scuro = ['#8d5524', '#5c3a21', '#a8693f'].includes(pelle);
  const capC = scuro ? CAPELLI_C[[0, 6, 7, 1][(h >> 3) % 4]] : CAPELLI_C[(h >> 3) % CAPELLI_C.length];
  const stile = (h >> 6) % 7, barba = (h >> 9) % 5 === 0 || (p.eta >= 29 && (h >> 9) % 3 === 0), c1 = (colori && colori[0]) || '#2a3340', c2 = (colori && colori[1]) || '#d6dde5';
  const capelli = [
    `<path d="M19.5 27c-.5-10 5.5-15.5 12.5-15.5S45 17 44.5 27c-2-5-6.5-8-12.5-8s-10.5 3-12.5 8z" fill="${capC}"/>`,
    `<path d="M20 25c0-8 5.5-12.5 12-12.5S44 17 44 25c-3-3.5-7-5-12-5s-9 1.5-12 5z" fill="${capC}" opacity=".85"/>`,
    `<g fill="${capC}"><circle cx="23" cy="20" r="5"/><circle cx="29" cy="16" r="5.5"/><circle cx="35.5" cy="16" r="5.5"/><circle cx="41" cy="20.5" r="5"/><circle cx="21" cy="25" r="3.5"/><circle cx="43" cy="25" r="3.5"/></g>`,
    `<path d="M19 33c-1.5-13 4.5-21.5 13-21.5S46.5 20 45 33c-1-6-3-9.5-5-11-4 2.5-12 2.5-16 0-2 1.5-4 5-5 11z" fill="${capC}"/><path d="M19 30c0 5 .5 9 2 12M45 30c0 5-.5 9-2 12" stroke="${capC}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    '',
    `<path d="M28.5 10.5c1-1.5 6-1.5 7 0l1 9h-9z" fill="${capC}"/><path d="M21 25c1-4 3-6 5-7M43 25c-1-4-3-6-5-7" stroke="${capC}" stroke-width="2" opacity=".5" fill="none"/>`,
    `<path d="M19.5 26c0-9 5-14 12.5-14 6 0 11 3.5 12.5 9-5-4-14-4.5-20 1l-3 4z" fill="${capC}"/>`
  ][stile];
  return `<svg class="avatar" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="av${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3440"/><stop offset="1" stop-color="#151a21"/></linearGradient></defs>
  <circle cx="32" cy="32" r="32" fill="url(#av${h})"/>
  <path d="M7 64c2-11 12-16.5 25-16.5S55 53 57 64z" fill="${c1}"/><path d="M25 48.5 32 56l7-7.5" fill="none" stroke="${c2}" stroke-width="2.6"/>
  <rect x="27.5" y="38" width="9" height="11" rx="3" fill="${pelle}"/><rect x="27.5" y="44" width="9" height="3" fill="#000" opacity=".12"/>
  <ellipse cx="19.8" cy="30" rx="2.4" ry="3.6" fill="${pelle}"/><ellipse cx="44.2" cy="30" rx="2.4" ry="3.6" fill="${pelle}"/>
  <ellipse cx="32" cy="28.5" rx="12" ry="14" fill="${pelle}"/>
  ${barba ? `<path d="M20.5 30c1 9 5.5 12.5 11.5 12.5S42.5 39 43.5 30c-2 4-4 5.5-6 5.5-2-1-8-1-11 0-2 0-4-1.5-6-5.5z" fill="${capC}" opacity=".78"/>` : ''}
  <path d="M24.5 25.2l4.5-.8M39.5 25.2l-4.5-.8" stroke="${capC}" stroke-width="1.7" stroke-linecap="round"/>
  <ellipse cx="27" cy="28.8" rx="1.6" ry="1.8" fill="#1a1a1a"/><ellipse cx="37" cy="28.8" rx="1.6" ry="1.8" fill="#1a1a1a"/>
  <path d="M32 30.5v4.5l-1.8.6" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M28.5 37.6c2.2 1.4 4.8 1.4 7 0" fill="none" stroke="#5b2a20" stroke-width="1.4" stroke-linecap="round"/>
  ${capelli}</svg>`;
}

// ---------- divise ----------
// disegni: 0 tinta unita, 1 strisce verticali, 2 righe orizzontali, 3 metà e metà, 4 fascia diagonale, 5 maniche colorate
const DISEGNI_MAGLIA = ['Tinta unita', 'Strisce', 'Righe', 'Metà e metà', 'Fascia', 'Maniche'];
let _kid = 0;
function magliaSVG(k, size = 40, num = ''){
  const id = 'mk' + (++_kid), c1 = k.c1, c2 = k.c2, t = k.t || 0;
  const forma = 'M20 6 9 11l-6 12 8 4 3-5v36h36V22l3 5 8-4-6-12-11-5c-1.5 4-6 6.5-12 6.5S21.5 10 20 6z';
  const pat = [
    '',
    `<g fill="${c2}">${[16, 26, 36, 46].map((x) => `<rect x="${x}" y="0" width="5" height="64"/>`).join('')}</g>`,
    `<g fill="${c2}">${[20, 32, 44].map((y) => `<rect x="0" y="${y}" width="64" height="5.5"/>`).join('')}</g>`,
    `<rect x="32" y="0" width="32" height="64" fill="${c2}"/>`,
    `<path d="M10 22 44 58h12L18 16z" fill="${c2}"/>`,
    `<path d="M0 0h14l3 22-14 9zM64 0H50l-3 22 14 9z" fill="${c2}"/>`
  ][t] || '';
  const ink = testoSu(t === 3 ? c1 : c1);
  return `<svg class="maglia-svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${forma}"/></clipPath></defs>
  <g clip-path="url(#${id})"><rect width="64" height="64" fill="${c1}"/>${pat}<rect width="64" height="64" fill="url(#mgl)" opacity="0"/></g>
  <path d="${forma}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><path d="M26 7.5c1.5 3 3.5 4.3 6 4.3s4.5-1.3 6-4.3" fill="none" stroke="${t === 0 ? c2 : '#fff'}" stroke-opacity=".9" stroke-width="2"/>
  ${num !== '' ? `<text x="32" y="44" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="19" fill="${ink}" stroke="${ink === '#ffffff' ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.4)'}" stroke-width=".8">${num}</text>` : ''}</svg>`;
}
const kitDi = (club, trasferta) => { const k = (club.kit && club.kit[trasferta ? 1 : 0]) || null; return k || (trasferta ? { t: 0, c1: club.c2, c2: club.c1 } : { t: 1, c1: club.c1, c2: club.c2 }); };

// grafico a linea semplice (per soldi e altro)
function graficoLinea(vals, W = 320, H = 90, col = '#22c55e', etichette){
  if (vals.length < 2) return '<p class="nota">I dati arrivano dopo qualche giornata.</p>';
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals), y = (v) => H - 8 - (v - min) / Math.max(1, max - min) * (H - 16);
  const pts = vals.map((v, i) => [i / (vals.length - 1) * W, y(v)]), p = pts.map((x) => x.map((v) => v.toFixed(1)).join(',')).join(' '), gid = 'gl' + (++_kid);
  return `<svg viewBox="0 0 ${W} ${H}" class="graf" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
  ${min < 0 ? `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` : ''}
  <polygon points="0,${H} ${p} ${W},${H}" fill="url(#${gid})"/><polyline points="${p}" fill="none" stroke="${col}" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
  ${etichette ? `<div class="graf-leg"><span>${etichette[0]}</span><span>${etichette[1]}</span></div>` : ''}`;
}
// grafico a barre (positivo verde, negativo rosso)
function graficoBarre(vals, H = 90){
  if (!vals.length) return '<p class="nota">I dati arrivano dopo la prima giornata.</p>';
  const mx = Math.max(1, ...vals.map(Math.abs));
  return `<div class="barre" style="height:${H}px">${vals.map((v) => `<i class="${v >= 0 ? 'p' : 'n'}" style="--h:${Math.max(2, Math.abs(v) / mx * 50)}%" title="${euroBreve(v)}"></i>`).join('')}</div>`;
}

// icone per staff e stadio
const IC_STAFF = { all: 'tattica', vice: 'lista', atl: 'battito', por: 'scudo', med: 'stetoscopio', fisio: 'cuore', oss: 'occhio', ds: 'valigetta' };
const IC_STADIO = { tribune: 'stadio', campo: 'campo', spogl: 'doccia', luci: 'luce', negozio: 'negozio', giov: 'giovani', centro: 'allenamento', maxi: 'schermo', park: 'parcheggio' };
