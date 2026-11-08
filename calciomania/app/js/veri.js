// ---------- giocatori veri di Serie A e Serie B ----------
// Formato: "Nome Cognome,Ruolo,anno di nascita (2 cifre),bravura" separati da ";". Rose dell'ultima stagione conosciuta:
// qualche trasferimento recente può mancare. Dalla Serie C in giù i nomi restano inventati.
const ROSE_VERE = {
  9: {
    'Inter': 'Yann Sommer,P,88,82;Josep Martínez,P,98,76;Alessandro Bastoni,D,99,87;Francesco Acerbi,D,88,79;Stefan de Vrij,D,92,78;Yann Bisseck,D,00,79;Manuel Akanji,D,95,82;Denzel Dumfries,D,96,83;Federico Dimarco,D,97,85;Carlos Augusto,D,99,77;Matteo Darmian,D,89,74;Luis Henrique,C,01,77;Nicolò Barella,C,97,87;Hakan Çalhanoğlu,C,94,85;Henrikh Mkhitaryan,C,89,81;Davide Frattesi,C,99,80;Petar Sučić,C,03,77;Piotr Zieliński,C,94,80;Andy Diouf,C,03,75;Lautaro Martínez,A,97,89;Marcus Thuram,A,97,85;Ange-Yoan Bonny,A,03,77;Pio Esposito,A,05,76',
    'Milan': 'Mike Maignan,P,95,87;Pietro Terracciano,P,90,71;Fikayo Tomori,D,97,80;Strahinja Pavlović,D,01,79;Matteo Gabbia,D,99,78;Koni De Winter,D,02,77;Pervis Estupiñán,D,98,78;Davide Bartesaghi,D,05,74;Zachary Athekame,D,04,74;Luka Modrić,C,85,83;Youssouf Fofana,C,99,81;Adrien Rabiot,C,95,83;Ruben Loftus-Cheek,C,96,79;Samuele Ricci,C,01,79;Ardon Jashari,C,02,78;Alexis Saelemaekers,C,99,79;Christian Pulisic,A,98,84;Rafael Leão,A,99,85;Santiago Giménez,A,01,80;Christopher Nkunku,A,97,81',
    'Juventus': 'Michele Di Gregorio,P,97,82;Mattia Perin,P,92,76;Gleison Bremer,D,97,85;Federico Gatti,D,98,79;Pierre Kalulu,D,00,80;Lloyd Kelly,D,98,77;Andrea Cambiaso,D,00,82;Juan Cabal,D,01,75;João Mário,D,00,76;Manuel Locatelli,C,98,82;Khéphren Thuram,C,01,82;Teun Koopmeiners,C,98,81;Weston McKennie,C,98,79;Filip Kostić,C,92,74;Kenan Yıldız,A,05,83;Francisco Conceição,A,02,81;Dušan Vlahović,A,00,83;Jonathan David,A,00,82;Loïs Openda,A,00,80;Edon Zhegrova,A,99,80;Arkadiusz Milik,A,94,73',
    'Napoli': 'Alex Meret,P,97,81;Vanja Milinković-Savić,P,97,79;Giovanni Di Lorenzo,D,93,83;Amir Rrahmani,D,94,81;Alessandro Buongiorno,D,99,83;Sam Beukema,D,98,80;Juan Jesus,D,91,73;Mathías Olivera,D,97,78;Leonardo Spinazzola,D,93,76;Miguel Gutiérrez,D,01,78;Stanislav Lobotka,C,94,84;André-Frank Zambo Anguissa,C,95,83;Scott McTominay,C,96,86;Kevin De Bruyne,C,91,86;Billy Gilmour,C,01,79;Matteo Politano,A,93,79;David Neres,A,97,79;Noa Lang,A,99,79;Romelu Lukaku,A,93,82;Rasmus Højlund,A,03,81;Lorenzo Lucca,A,00,77',
    'Atalanta': 'Marco Carnesecchi,P,00,82;Marco Sportiello,P,92,72;Isak Hien,D,99,79;Berat Djimsiti,D,93,77;Sead Kolašinac,D,93,76;Giorgio Scalvini,D,03,79;Odilon Kossounou,D,01,78;Raoul Bellanova,D,00,77;Davide Zappacosta,D,92,75;Nicola Zalewski,D,02,77;Marten de Roon,C,91,78;Ederson,C,99,82;Mario Pašalić,C,95,78;Yunus Musah,C,02,77;Lazar Samardžić,C,02,77;Charles De Ketelaere,A,01,82;Ademola Lookman,A,97,84;Gianluca Scamacca,A,99,80;Nikola Krstović,A,00,79;Kamaldeen Sulemana,A,02,75',
    'Roma': 'Mile Svilar,P,99,83;Gianluca Mancini,D,96,80;Evan Ndicka,D,99,80;Mario Hermoso,D,95,77;Zeki Çelik,D,97,76;Angeliño,D,97,78;Kostas Tsimikas,D,96,76;Wesley França,D,03,77;Bryan Cristante,C,95,78;Manu Koné,C,01,81;Lorenzo Pellegrini,C,96,78;Niccolò Pisilli,C,04,75;Neil El Aynaoui,C,01,77;Tommaso Baldanzi,C,03,75;Matías Soulé,A,03,80;Paulo Dybala,A,93,81;Artem Dovbyk,A,97,80;Evan Ferguson,A,04,77;Stephan El Shaarawy,A,92,74;Leon Bailey,A,97,78',
    'Lazio': 'Ivan Provedel,P,94,79;Alessio Romagnoli,D,95,79;Mario Gila,D,00,79;Adam Marušić,D,92,77;Nuno Tavares,D,00,78;Manuel Lazzari,D,93,74;Luca Pellegrini,D,99,74;Nicolò Rovella,C,01,79;Matteo Guendouzi,C,99,79;Toma Bašić,C,96,75;Fisayo Dele-Bashiru,C,01,75;Reda Belahyane,C,04,73;Mattia Zaccagni,A,95,80;Gustav Isaksen,A,01,78;Pedro,A,87,74;Valentín Castellanos,A,99,79;Boulaye Dia,A,96,77;Tijjani Noslin,A,99,75',
    'Fiorentina': 'David de Gea,P,90,82;Luca Ranieri,D,99,77;Pietro Comuzzo,D,05,76;Marin Pongračić,D,97,76;Dodô,D,98,79;Robin Gosens,D,94,78;Fabiano Parisi,D,00,75;Rolando Mandragora,C,97,77;Nicolò Fagioli,C,01,78;Simon Sohm,C,01,76;Hans Nicolussi Caviglia,C,00,76;Cher Ndour,C,04,74;Albert Gudmundsson,A,97,80;Moise Kean,A,00,83;Edin Džeko,A,86,76;Roberto Piccoli,A,01,77',
    'Bologna': 'Łukasz Skorupski,P,91,79;Federico Ravaglia,P,99,72;Jhon Lucumí,D,98,79;Nicolò Casale,D,98,75;Torbjørn Heggem,D,99,75;Emil Holm,D,00,77;Juan Miranda,D,00,76;Charalampos Lykogiannis,D,93,72;Nadir Zortea,D,99,75;Remo Freuler,C,92,78;Lewis Ferguson,C,99,79;Tommaso Pobega,C,99,76;Jens Odgaard,C,99,76;Nikola Moro,C,98,75;Riccardo Orsolini,A,97,80;Santiago Castro,A,04,77;Thijs Dallinga,A,00,77;Jonathan Rowe,A,03,76;Federico Bernardeschi,A,94,75;Ciro Immobile,A,90,74;Benjamín Domínguez,A,03,74',
    'Como': 'Jean Butez,P,95,77;Marc-Oliver Kempf,D,95,75;Jacobo Ramón,D,05,75;Diego Carlos,D,93,76;Alberto Moreno,D,92,73;Ivan Smolčić,D,00,74;Álex Valle,D,04,74;Máximo Perrone,C,03,78;Lucas Da Cunha,C,01,77;Sergi Roberto,C,92,73;Nico Paz,C,04,81;Martin Baturina,C,03,77;Jesús Rodríguez,A,05,76;Assane Diao,A,05,76;Jayden Addai,A,05,72;Álvaro Morata,A,92,77;Anastasios Douvikas,A,99,75',
    'Torino': 'Franco Israel,P,00,74;Alberto Paleari,P,92,71;Saúl Coco,D,98,75;Guillermo Maripán,D,94,75;Ardian Ismajli,D,96,74;Marcus Pedersen,D,00,74;Valentino Lazaro,D,96,73;Cristiano Biraghi,D,92,72;Gvidas Gineitis,C,04,74;Kristjan Asllani,C,02,75;Ivan Ilić,C,01,75;Adrien Tameze,C,94,73;Nikola Vlašić,C,97,76;Che Adams,A,96,76;Duván Zapata,A,91,75;Giovanni Simeone,A,95,75;Cyril Ngonge,A,00,75',
    'Udinese': 'Maduka Okoye,P,99,76;Razvan Sava,P,02,72;Thomas Kristensen,D,02,75;Christian Kabasele,D,91,72;Oumar Solet,D,00,77;Nicolò Bertola,D,03,72;Hassane Kamara,D,94,74;Kingsley Ehizibue,D,95,73;Jesper Karlström,C,95,75;Jakub Piotrowski,C,97,74;Sandi Lovrić,C,98,75;Arthur Atta,C,03,75;Jurgen Ekkelenkamp,C,00,75;Lennon Miller,C,06,72;Keinan Davis,A,98,76;Nicolò Zaniolo,A,99,76;Iker Bravo,A,05,72;Adam Buksa,A,96,74',
    'Genoa': 'Nicola Leali,P,93,73;Johan Vásquez,D,98,78;Leo Østigård,D,99,75;Alessandro Marcandalli,D,02,72;Aarón Martín,D,97,75;Brooke Norton-Cuffy,D,04,74;Mattia Bani,D,93,73;Morten Frendrup,C,01,77;Patrizio Masini,C,01,72;Ruslan Malinovskyi,C,93,75;Morten Thorsby,C,96,74;Valentín Carboni,C,05,74;Junior Messias,A,91,73;Lorenzo Colombo,A,02,74;Vitinha,A,00,74;Caleb Ekuban,A,94,72;Jeff Ekhator,A,06,72',
    'Hellas Verona': 'Lorenzo Montipò,P,96,76;Nicolás Valentini,D,01,73;Victor Nelsson,D,98,74;Domagoj Bradarić,D,99,73;Rafik Belghali,D,02,72;Martin Frese,D,98,72;Suat Serdar,C,97,74;Abdou Harroui,C,98,72;Roberto Gagliardini,C,94,72;Antoine Bernede,C,99,72;Tomáš Suslov,C,02,73;Giovane,A,03,73;Amin Sarr,A,01,74;Daniel Mosquera,A,99,72',
    'Parma': 'Zion Suzuki,P,02,78;Edoardo Corvi,P,01,70;Alessandro Circati,D,03,75;Mariano Troilo,D,03,72;Enrico Delprato,D,99,74;Emanuele Valeri,D,98,73;Lautaro Valenti,D,99,72;Mathias Løvik,D,03,74;Adrián Bernabé,C,01,77;Mandela Keita,C,02,75;Nahuel Estévez,C,95,73;Hernani,C,94,72;Christian Ordóñez,C,04,71;Mateo Pellegrino,A,01,75;Gabriel Strefezza,A,97,73;Patrick Cutrone,A,98,74;Adrian Benedyczak,A,00,72;Jacob Ondrejka,A,02,73;Pontus Almqvist,A,99,73',
    'Lecce': 'Wladimiro Falcone,P,95,78;Kialonda Gaspar,D,97,74;Tiago Gabriel,D,04,73;Antonino Gallo,D,00,74;Danilo Veiga,D,02,72;Jamil Siebert,D,02,72;Ylber Ramadani,C,96,74;Lassana Coulibaly,C,96,74;Medon Berisha,C,03,72;Mohamed Kaba,C,01,72;Santiago Pierotti,A,01,73;Lameck Banda,A,01,74;Riccardo Sottil,A,99,73;Nikola Štulić,A,01,73;Francesco Camarda,A,08,72;Konan N’Dri,A,00,72',
    'Cagliari': 'Elia Caprile,P,01,77;Yerry Mina,D,94,75;Sebastiano Luperto,D,96,74;Gabriele Zappa,D,99,74;Adam Obert,D,02,72;Marco Palestra,D,05,75;Alessandro Deiola,C,95,72;Michel Adopo,C,00,73;Matteo Prati,C,03,73;Gianluca Gaetano,C,00,75;Michael Folorunsho,C,98,74;Luca Mazzitelli,C,95,72;Sebastiano Esposito,A,02,75;Andrea Belotti,A,93,73;Leonardo Pavoletti,A,88,70;Mattia Felici,A,01,72;Semih Kılıçsoy,A,05,74;Zito Luvumbo,A,02,73',
    'Sassuolo': 'Arijanet Muric,P,98,75;Stefano Turati,P,01,72;Jay Idzes,D,00,76;Tarik Muharemović,D,03,74;Josh Doig,D,02,73;Sebastian Walukiewicz,D,00,73;Filippo Romagna,D,97,72;Kristian Thorstvedt,C,99,75;Nemanja Matić,C,88,74;Daniel Boloca,C,98,72;Aster Vranckx,C,02,73;Cristian Volpato,C,03,73;Domenico Berardi,A,94,79;Armand Laurienté,A,98,78;Andrea Pinamonti,A,99,76;Walid Cheddira,A,98,73',
    'Cremonese': 'Emil Audero,P,97,75;Marco Silvestri,P,91,71;Federico Baschirotto,D,96,74;Matteo Bianchetti,D,93,71;Federico Ceccherini,D,92,70;Giuseppe Pezzella,D,97,72;Tommaso Barbieri,D,02,72;Filippo Terracciano,D,03,72;Warren Bondo,C,03,73;Michele Collocolo,C,99,71;Alberto Grassi,C,95,71;Jari Vandeputte,C,96,74;Franco Vázquez,C,89,72;Jamie Vardy,A,87,75;Federico Bonazzoli,A,97,74;Antonio Sanabria,A,96,74;Dennis Johnsen,A,98,72',
    'Pisa': 'Adrian Šemper,P,98,73;Simone Scuffet,P,96,73;Antonio Caracciolo,D,90,71;Arturo Calabresi,D,96,71;Simone Canestrelli,D,00,72;Raúl Albiol,D,85,72;Daniel Denoon,D,01,70;Samuele Angori,D,03,71;Idrissa Touré,D,98,72;Marius Marin,C,98,72;Michel Aebischer,C,97,74;Ebenezer Akinsanmiro,C,04,71;Matteo Tramoni,C,00,72;Mehdi Léris,C,98,71;M’Bala Nzola,A,96,73;Stefano Moreo,A,93,71;Henrik Meister,A,03,72;Juan Cuadrado,A,88,72'
  },
  8: {
    'Palermo': 'Jesse Joronen,P,93,70;Pietro Ceccaroni,D,95,68;Niccolò Pierozzi,D,01,67;Tommaso Augello,D,95,68;Jacopo Segre,C,97,68;Claudio Gomes,C,00,68;Filippo Ranocchia,C,01,69;Joel Pohjanpalo,A,94,71;Matteo Brunori,A,94,69;Federico Di Francesco,A,94,67',
    'Monza': 'Andrea Carboni,D,01,68;Luca Caldirola,D,91,66;Samuele Birindelli,D,99,68;Matteo Pessina,C,97,70;Mattia Valoti,C,93,67;Patrick Ciurria,C,95,67;Keita Baldé,A,95,67;Dany Mota,A,98,68;Gianluca Caprari,A,93,68',
    'Venezia': 'Filip Stanković,P,02,69;Antonio Candela,D,00,67;Michael Svoboda,D,98,68;Gianluca Busio,C,02,69;Issa Doumbia,C,03,67;John Yeboah,A,00,68;Andrea Adorante,A,00,67',
    'Sampdoria': 'Fabio Depaoli,D,97,66;Matteo Ricci,C,94,66;Massimo Coda,A,88,69;Gennaro Tutino,A,96,69',
    'Frosinone': 'Michele Cerofolini,P,99,66;Riccardo Marchizza,D,98,66;Ilario Monterisi,D,01,66;Luca Garritano,C,94,65;Farès Ghedjemis,A,02,67;Giorgi Kvernadze,A,03,67',
    'Modena': 'Andrea Seculin,P,90,64;Fabio Gerli,C,96,66;Antonio Palumbo,C,96,67;Giuseppe Caso,A,98,67;Ettore Gliozzi,A,95,66',
    'Bari': 'Mattia Maita,C,94,65;Giuseppe Sibilli,A,96,66;Kevin Lasagna,A,92,67',
    'Spezia': 'Petko Hristov,D,99,66;Giuseppe Aurelio,D,99,65;Luca Vignali,D,96,64;Salvatore Esposito,C,00,69',
    'Cesena': 'Andrea Ciofi,D,99,65;Tommaso Berti,C,00,66;Cristian Shpendi,A,03,68',
    'Südtirol': 'Giacomo Poluzzi,P,88,64;Daniele Casiraghi,C,93,66;Raphael Odogwu,A,91,65',
    'Catanzaro': 'Mirko Pigliacelli,P,93,66;Jacopo Petriccione,C,95,66;Pietro Iemmello,A,92,68',
    'Mantova': 'Davide Mondonico,D,89,63;Francesco Galuppini,A,93,66',
    'Padova': 'Mattia Bortolussi,A,96,65',
    'Reggiana': 'Manolo Portanova,C,00,66;Cedric Gondo,A,96,65',
    'Pescara': 'Davide Merola,A,00,66',
    'Carrarese': 'Marco Bleve,P,95,64;Simone Zanon,D,01,64;Julián Illanes,D,97,64'
  }
};
// nazionalità dei nomi più comuni (per la bandiera); gli altri senza bandiera sono italiani
const NAZ_VERI = { 'Sommer':'CH','Martínez':'AR','Bisseck':'DE','Akanji':'CH','Dumfries':'NL','de Vrij':'NL','Augusto':'BR','Henrique':'BR','Çalhanoğlu':'TR','Mkhitaryan':'AM','Sučić':'HR','Zieliński':'PL','Diouf':'FR','Thuram':'FR','Bonny':'FR',
  'Maignan':'FR','Tomori':'EN','Pavlović':'RS','De Winter':'BE','Estupiñán':'EC','Athekame':'CH','Modrić':'HR','Fofana':'FR','Rabiot':'FR','Loftus-Cheek':'EN','Jashari':'CH','Saelemaekers':'BE','Pulisic':'US','Leão':'PT','Giménez':'MX','Nkunku':'FR',
  'Bremer':'BR','Kalulu':'FR','Kelly':'EN','Cabal':'CO','Mário':'PT','Koopmeiners':'NL','McKennie':'US','Kostić':'RS','Yıldız':'TR','Conceição':'PT','Vlahović':'RS','David':'CA','Openda':'BE','Zhegrova':'XK','Milik':'PL',
  'Milinković-Savić':'RS','Rrahmani':'XK','Beukema':'NL','Jesus':'BR','Olivera':'UY','Gutiérrez':'ES','Lobotka':'SK','Zambo Anguissa':'CM','McTominay':'SC','De Bruyne':'BE','Gilmour':'SC','Neres':'BR','Lang':'NL','Lukaku':'BE','Højlund':'DK',
  'Hien':'SE','Djimsiti':'AL','Kolašinac':'BA','Kossounou':'CI','Zalewski':'PL','de Roon':'NL','Ederson':'BR','Pašalić':'HR','Musah':'US','Samardžić':'RS','De Ketelaere':'BE','Lookman':'NG','Krstović':'ME','Sulemana':'GH',
  'Svilar':'RS','Ndicka':'CI','Hermoso':'ES','Çelik':'TR','Angeliño':'ES','Tsimikas':'GR','França':'BR','Koné':'FR','El Aynaoui':'MA','Soulé':'AR','Dybala':'AR','Dovbyk':'UA','Ferguson':'IE','Bailey':'JM',
  'Provedel':'IT','Gila':'ES','Marušić':'ME','Tavares':'PT','Guendouzi':'FR','Bašić':'HR','Dele-Bashiru':'NG','Belahyane':'MA','Isaksen':'DK','Pedro':'ES','Castellanos':'AR','Dia':'SN','Noslin':'NL',
  'de Gea':'ES','Pongračić':'HR','Dodô':'BR','Gosens':'DE','Sohm':'CH','Ndour':'IT','Gudmundsson':'IS','Džeko':'BA',
  'Skorupski':'PL','Lucumí':'CO','Heggem':'NO','Holm':'SE','Miranda':'ES','Lykogiannis':'GR','Freuler':'CH','Odgaard':'DK','Moro':'HR','Castro':'AR','Dallinga':'NL','Rowe':'EN','Domínguez':'AR',
  'Butez':'FR','Kempf':'DE','Ramón':'ES','Carlos':'BR','Moreno':'ES','Smolčić':'HR','Valle':'ES','Perrone':'AR','Da Cunha':'FR','Roberto':'ES','Paz':'AR','Baturina':'HR','Rodríguez':'ES','Diao':'SN','Addai':'NL','Morata':'ES','Douvikas':'GR',
  'Israel':'UY','Coco':'GQ','Maripán':'CL','Ismajli':'AL','Pedersen':'NO','Lazaro':'AT','Gineitis':'LT','Asllani':'AL','Ilić':'RS','Tameze':'FR','Vlašić':'HR','Adams':'SC','Zapata':'CO','Simeone':'AR','Ngonge':'BE',
  'Okoye':'NG','Sava':'RO','Kristensen':'DK','Kabasele':'BE','Solet':'FR','Kamara':'CI','Ehizibue':'NL','Karlström':'SE','Piotrowski':'PL','Lovrić':'SI','Atta':'FR','Ekkelenkamp':'NL','Miller':'SC','Davis':'EN','Bravo':'ES','Buksa':'PL',
  'Vásquez':'MX','Østigård':'NO','Martín':'ES','Norton-Cuffy':'EN','Frendrup':'DK','Malinovskyi':'UA','Thorsby':'NO','Carboni':'AR','Messias':'BR','Vitinha':'PT','Ekuban':'GH','Ekhator':'IT',
  'Valentini':'AR','Nelsson':'DK','Bradarić':'HR','Belghali':'BE','Frese':'DK','Serdar':'DE','Harroui':'NL','Bernede':'FR','Suslov':'SK','Giovane':'BR','Sarr':'SN','Mosquera':'CO',
  'Suzuki':'JP','Troilo':'AR','Valenti':'AR','Løvik':'NO','Bernabé':'ES','Keita':'BE','Estévez':'AR','Hernani':'BR','Ordóñez':'AR','Pellegrino':'AR','Strefezza':'BR','Benedyczak':'PL','Ondrejka':'SE','Almqvist':'SE',
  'Gaspar':'AO','Gabriel':'PT','Veiga':'PT','Siebert':'DE','Ramadani':'AL','Coulibaly':'ML','Berisha':'XK','Kaba':'FR','Pierotti':'AR','Banda':'ZM','Štulić':'RS','N’Dri':'CI',
  'Mina':'CO','Obert':'SK','Adopo':'FR','Kılıçsoy':'TR','Luvumbo':'AO','Muric':'XK','Idzes':'ID','Muharemović':'BA','Doig':'SC','Walukiewicz':'PL','Thorstvedt':'NO','Matić':'RS','Boloca':'RO','Vranckx':'BE','Laurienté':'FR','Cheddira':'MA',
  'Audero':'IT','Bondo':'FR','Vandeputte':'BE','Vázquez':'AR','Vardy':'EN','Sanabria':'PY','Johnsen':'NO','Šemper':'HR','Albiol':'ES','Denoon':'CH','Touré':'DE','Marin':'RO','Aebischer':'CH','Akinsanmiro':'NG','Tramoni':'FR','Léris':'DZ','Nzola':'AO','Meister':'DE','Cuadrado':'CO',
  'Joronen':'FI','Gomes':'FR','Pohjanpalo':'FI','Baldé':'SN','Mota':'PT','Stanković':'RS','Svoboda':'AT','Busio':'US','Doumbia':'CI','Yeboah':'DE','Ghedjemis':'FR','Kvernadze':'GE','Hristov':'BG','Odogwu':'AT','Gondo':'CI','Illanes':'AR' };
let _veri = null;
function giocatoriVeri(tier){
  if (!_veri){
    _veri = {};
    Object.entries(ROSE_VERE).forEach(([t, club]) => {
      _veri[t] = [];
      Object.entries(club).forEach(([nomeClub, txt]) => txt.split(';').forEach((riga) => {
        const [nome, r, yy, v] = riga.split(','), sp = nome.indexOf(' ');
        const n = sp < 0 ? '' : nome.slice(0, sp), c = sp < 0 ? nome : nome.slice(sp + 1);
        _veri[t].push({ n, c, r, anno: (+yy > 50 ? 1900 : 2000) + +yy, val: +v, club: nomeClub });
      }));
    });
  }
  return _veri[tier] || [];
}
// il giocatore vero com'è in questa stagione (invecchia con gli anni del gioco)
function veroDa(v, tier){
  const eta = 2026 - v.anno + (S.stagione - 1);
  const val = clamp(v.val - Math.max(0, eta - 31) * 2 + (eta <= 22 ? Math.min(4, S.stagione - 1) : 0), 40, 94);
  const pot = eta <= 23 ? Math.min(95, val + (24 - eta) * 2) : val;
  const p = { id: 'v' + hashStr(v.n + v.c + v.anno), n: v.n || v.c, c: v.n ? v.c : '', r: v.r, eta, val, pot, naz: NAZ_VERI[v.c] || 'IT', forma: ri(88, 100), mor: ri(65, 85), fm: 6.2, voti: [], inf: 0, squal: 0, gol: 0, ass: 0, pres: 0, amm: 0, esp: 0, num: 0, contr: ri(2, 4), vero: true };
  if (!p.c){ p.c = p.n; p.n = ''; }
  p.prezzo = valoreDi(p); p.stip = stipDi(p);
  p.club = v.club; p.chiede = tondo(p.prezzo * (1 + RND() * 0.35));
  return p;
}
// nomi già in squadra (così non compri due volte la stessa persona)
function nomiInRosa(){ return new Set(S.rosa.concat(S.giovanili || []).map((p) => (p.n + ' ' + p.c).trim())); }
function mercatoVero(tier, quanti){
  const presi = nomiInRosa();
  const lista = giocatoriVeri(tier).filter((v) => !presi.has((v.n + ' ' + v.c).trim()) && 2026 - v.anno + (S.stagione - 1) <= 37);
  for (let i = lista.length - 1; i > 0; i--){ const j = Math.floor(RND() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  return lista.slice(0, quanti).map((v) => veroDa(v, tier));
}
