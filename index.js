const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');
const fs = require('fs');
const sass = require('sass'); 
const sharp = require('sharp'); 

const app = express();
const port = 8081;

// --- Etapa 6: Inițializarea și configurarea conexiunii cu baza de date PostgreSQL ---
const pool = new Pool({
    user: 'postgres',       
    host: 'localhost',
    database: 'postgres',  
    password: '123',       
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Eroare la conectarea la baza de date!', err.stack);
    }
    console.log('Conectat cu succes la baza de date PostgreSQL!');
    release();
});
// -------------------------------------------

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let f of vect_foldere) {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale, { recursive: true });
    }
}

global.obGlobal = { 
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css')
};

// --- Etapa 6, Bonus 13: Curățare periodică a folderului de backup ---
// Fișierele din folderul de backup mai vechi decât T_CURATARE_BACKUP vor fi șterse automat.
const T_CURATARE_BACKUP = 60 * 60 * 1000; // 60 minute
// *** La prezentare, poți scădea valoarea (ex: 60 * 1000 = 1 minut) ca să arăți efectul rapid. ***

function curataBackupuriVechi() {
    let folderBackup = path.join(__dirname, 'backup');
    if (!fs.existsSync(folderBackup)) return;

    function parcurgeRecursiv(cale) {
        let elemente = fs.readdirSync(cale, { withFileTypes: true });
        for (let el of elemente) {
            let caleCompleta = path.join(cale, el.name);
            if (el.isDirectory()) {
                parcurgeRecursiv(caleCompleta);
            } else {
                try {
                    let stats = fs.statSync(caleCompleta);
                    let varsta = new Date().getTime() - stats.mtimeMs;
                    if (varsta > T_CURATARE_BACKUP) {
                        fs.unlinkSync(caleCompleta);
                        console.log(`[BACKUP CURĂȚARE] Șters fișierul vechi: ${caleCompleta}`);
                    }
                } catch (e) {
                    console.error(`[BACKUP CURĂȚARE EROARE] ${caleCompleta}: ${e.message}`);
                }
            }
        }
    }

    try {
        parcurgeRecursiv(folderBackup);
    } catch (e) {
        console.error("[BACKUP CURĂȚARE EROARE]", e.message);
    }
}

curataBackupuriVechi(); // o verificare și la pornirea serverului
setInterval(curataBackupuriVechi, 5 * 60 * 1000); // apoi verificăm periodic, la fiecare 5 minute
// -------------------------------------------------------------------

function compileazaScss(caleScss, caleCss) {
    try {
        if (!caleCss) {
            let numeFisier = path.basename(caleScss, '.scss');
            caleCss = path.join(obGlobal.folderCss, numeFisier + '.css');
        }
        let caleBackup = path.join(__dirname, 'backup/resurse/css');
        if (!fs.existsSync(caleBackup)) {
            fs.mkdirSync(caleBackup, { recursive: true });
        }
        if (fs.existsSync(caleCss)) {
            let numeFisierCss = path.basename(caleCss);
            let timpCurent = new Date().getTime(); 
            fs.copyFileSync(caleCss, path.join(caleBackup, timpCurent + "_" + numeFisierCss));
        }
        let rezultat = sass.compile(caleScss);
        fs.writeFileSync(caleCss, rezultat.css);
        console.log(`[SCSS] Compilat cu succes: ${path.basename(caleScss)} -> ${path.basename(caleCss)}`);
    } catch (err) {
        console.error(`[SCSS EROARE] Eșec la compilare/backup pentru ${caleScss}: `, err.message);
    }
}

if (fs.existsSync(obGlobal.folderScss)) {
    let fisiere = fs.readdirSync(obGlobal.folderScss);
    for (let fisier of fisiere) {
        if (path.extname(fisier) === '.scss') {
            compileazaScss(path.join(obGlobal.folderScss, fisier));
        }
    }
}

if (fs.existsSync(obGlobal.folderScss)) {
    fs.watch(obGlobal.folderScss, (event, filename) => {
        if (filename && path.extname(filename) === '.scss') {
            console.log(`[WATCH] Fisier modificat: ${filename}. Incepem recompilarea...`);
            compileazaScss(path.join(obGlobal.folderScss, filename));
        }
    });
}

function initErori() {
    let caleFisier = path.join(__dirname, 'erori.json');
    if (!fs.existsSync(caleFisier)) {
        console.error("Eroare CRITICA: Nu există fișierul erori.json!");
        process.exit();
    }
    try {
        let json = JSON.parse(fs.readFileSync(caleFisier, 'utf-8'));
        obGlobal.obErori = json;
    } catch (e) {
        console.error("Eroare la parsarea erori.json: " + e.message);
    }
}
initErori(); 

function afisareEroare(res, identificator, titlu, text, imagine) {
    let err = obGlobal.obErori ? obGlobal.obErori.info_erori.find(e => e.identificator === identificator) : null;
    let defaultErr = obGlobal.obErori ? obGlobal.obErori.eroare_default : { titlu: "Eroare", text: "Eroare generala", imagine: "" };
    let vTitlu = titlu || (err ? err.titlu : defaultErr.titlu);
    let vText = text || (err ? err.text : defaultErr.text);
    let vImagine = imagine || (err ? err.imagine : "/" + obGlobal.obErori.cale_baza + "/" + defaultErr.imagine);

    if (err && err.status) res.status(identificator);
    res.render('pagini/eroare', { titlu: vTitlu, text: vText, imagine: vImagine });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Etapa 6, Bonus 18: interval de timp in care un produs e considerat "nou pe site" ---
const T_PRODUS_NOU_MS = 14 * 24 * 60 * 60 * 1000; // 14 zile
// *** La prezentare, poți scădea valoarea (ex: 5 * 60 * 1000 = 5 minute) ca să arăți efectul rapid. ***
app.use((req, res, next) => {
    res.locals.T_PRODUS_NOU_MS = T_PRODUS_NOU_MS;
    next();
});

// --- Etapa 6, Bonus 12: Motor generare si gestionare oferte automate în JSON ---
const ofertePath = path.join(__dirname, 'oferte.json');

let categoriiOfertare = [];
pool.query("SELECT unnest(enum_range(NULL::categorie_produs))::text AS categorie").then(res => {
    categoriiOfertare = res.rows.map(r => r.categorie);
}).catch(err => console.error(err));

const T_OFERTA = 60 * 1000;      
const T_CURATARE = 5 * 60 * 1000; 
//generarea ofertelor BONUS 12
setInterval(() => {
    if (categoriiOfertare.length === 0) return;
    
    try {
        let rawData = fs.readFileSync(ofertePath, 'utf-8');
        let data = JSON.parse(rawData);
        let oferte = data.oferte || [];
        
        let ultimaCategorie = oferte.length > 0 ? oferte[0].categorie : null;
        let catNoua;
        do {
            catNoua = categoriiOfertare[Math.floor(Math.random() * categoriiOfertare.length)];
        } while (catNoua === ultimaCategorie && categoriiOfertare.length > 1);
        
        let reduceri = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
        let reducereNoua = reduceri[Math.floor(Math.random() * reduceri.length)];
        
        let dataIncepere = new Date();
        let dataFinalizare = new Date(dataIncepere.getTime() + T_OFERTA);
        
        let ofertaNoua = {
            categorie: catNoua,
            reducere: reducereNoua,
            "data-incepere": dataIncepere.toISOString(),
            "data-finalizare": dataFinalizare.toISOString()
        };
        
        oferte.unshift(ofertaNoua);
        
        let acum = new Date().getTime();
        ofere = oferte.filter(o => {
            let timpFinalizare = new Date(o["data-finalizare"]).getTime();
            return (acum - timpFinalizare) < T_CURATARE;
        });
        
        fs.writeFileSync(ofertePath, JSON.stringify({ oferte: oferte }, null, 4));
        console.log(`[OFERTĂ] S-a generat o reducere de ${reducereNoua}% la ${catNoua}!`);
    } catch(e) { 
        console.error("Eroare la scrierea ofertelor:", e.message); 
    }
}, T_OFERTA);

app.use((req, res, next) => {
    try {
        let rawData = fs.readFileSync(ofertePath, 'utf-8');
        let data = JSON.parse(rawData);
        let oferte = data.oferte || [];
        let acum = new Date().getTime();
        let ofertaActiva = oferte.find(o => new Date(o["data-finalizare"]).getTime() > acum);
        res.locals.oferta = ofertaActiva || null;
    } catch(e) { 
        res.locals.oferta = null; 
    }
    next();
});

app.use(async (req, res, next) => {
    try {
        const query = "SELECT unnest(enum_range(NULL::categorie_produs))::text AS categorie";
        const resultado = await pool.query(query);
        let categorii = resultado.rows.map(rand => rand.categorie);
        res.locals.categoriiMeniu = categorii;
    } catch (err) {
        console.error("Eroare la extragerea categoriilor pentru meniu:", err);
        res.locals.categoriiMeniu = []; 
    }
    next();
});

function getAnotimp() {
    let luna = new Date().getMonth() + 1; 
    if (luna >= 3 && luna <= 5) return 'primavara';
    if (luna >= 6 && luna <= 8) return 'vara';
    if (luna >= 9 && luna <= 11) return 'toamna';
    return 'iarna';
}

app.use(async (req, res, next) => {
    let galeriePath = path.join(__dirname, 'galerie.json');
    if (fs.existsSync(galeriePath)) {
        try {
            let dateGalerie = JSON.parse(fs.readFileSync(galeriePath, 'utf-8'));
            let anotimpCurent = getAnotimp();
            let imaginiFiltrate = dateGalerie.imagini.filter(img => img.anotimp === anotimpCurent);
            if (imaginiFiltrate.length > 13) imaginiFiltrate = imaginiFiltrate.slice(0, 13);

            let folderImaginiAbsolut = path.join(__dirname, dateGalerie.cale_galerie);
            for (let img of imaginiFiltrate) {
                let numeFisier = img.cale_fisier;
                let numeFisierMic = numeFisier.replace('.', '-mic.');
                let caleAbsolutaMare = path.join(folderImaginiAbsolut, numeFisier);
                let caleAbsolutaMica = path.join(folderImaginiAbsolut, numeFisierMic);
                img.cale_fisier_mic = numeFisierMic;

                if (fs.existsSync(caleAbsolutaMare) && !fs.existsSync(caleAbsolutaMica)) {
                    try {
                        await sharp(caleAbsolutaMare).resize(300).toFile(caleAbsolutaMica);
                    } catch (errSharp) {
                        console.error("[SHARP EROARE]", errSharp.message);
                    }
                }
            }
            res.locals.imaginiGalerie = imaginiFiltrate;
            res.locals.caleGalerie = dateGalerie.cale_galerie;
        } catch (err) {
            res.locals.imaginiGalerie = [];
        }
    } else {
        res.locals.imaginiGalerie = [];
    }
    next(); 
});

app.get(/\.ejs$/, (req, res) => afisareEroare(res, 400));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'resurse/imagini/favicon.ico')));
app.use('/resurse', (req, res, next) => {
    if (req.url === '/' || req.url === '') return afisareEroare(res, 403);
    next();
});
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

app.get(['/', '/index', '/home'], async (req, res) => {
    // --- Etapa 6, Bonus 18: cele mai noi produse, in ordine invers cronologica ---
    let produseNoi = [];
    try {
        const rezultatNoi = await pool.query('SELECT * FROM produse ORDER BY data_adaugare DESC LIMIT 6');
        produseNoi = rezultatNoi.rows;
    } catch (err) {
        console.error("Eroare la extragerea celor mai noi produse:", err);
    }

    res.render('pagini/index', { ip: req.ip, produseNoi: produseNoi });
});

// --- FUNCȚIE HELPER PENTRU BONUS 17 (Calcul pret set) ---
function calculeazaPretSet(produseSet) {
    let suma = produseSet.reduce((acc, p) => acc + parseFloat(p.pret), 0);
    let n = produseSet.length;
    // reducere de min(5,n)*5%
    let procentReducere = Math.min(5, n) * 5; 
    let pretRedus = suma * (1 - procentReducere / 100);
    
    return {
        pretIntreg: suma.toFixed(2),
        pretRedus: pretRedus.toFixed(2),
        procentReducere: procentReducere
    };
}

// --- RUTA BONUS 17: Pagina principală cu toate seturile ---
app.get('/seturi', async (req, res) => {
    try {
        const query = `
            SELECT s.id, s.nume_set, s.descriere_set,
                   json_agg(p.*) as produse_set
            FROM seturi s
            JOIN asociere_set asoc ON s.id = asoc.id_set
            JOIN produse p ON asoc.id_produs = p.id
            GROUP BY s.id;
        `;
        const rezultat = await pool.query(query);
        
        // Aplicăm calculul de reducere pentru fiecare set
        let seturi = rezultat.rows.map(set => {
            set.infoPret = calculeazaPretSet(set.produse_set);
            return set;
        });

        res.render('pagini/seturi', { seturi: seturi, ip: req.ip });
    } catch (err) {
        console.error("Eroare la extragerea seturilor:", err);
        afisareEroare(res, 500, "Eroare Seturi", "Nu s-au putut încărca pachetele promotionale.");
    }
});

// --- Etapa 6, Bonus 10a+10b: Filtrare si sortare la nivel de server, prin fetch() ---
// Primeste toate cele 8 filtre + 2 chei de sortare (cu directie) ca query params si
// intoarce JSON cu produsele filtrate si sortate. Punctat doar impreuna cu filtrarea/
// sortarea client existenta (Bonus 4, 7, 8), care raman neschimbate.
const COLOANE_SORTARE_PERMISE = { nume: 'nume', pret: 'pret', garantie: 'garantie_luni' };

app.get('/api/produse/filtreaza', async (req, res) => {
    try {
        const {
            nume = '', descriere = '', culoare = 'toate', garantie = '', pretMax = '',
            nou = 'false', categorie = 'toate', compatibilitate = '',
            sort1 = '', sort2 = '', directie = 'asc'
        } = req.query;

        let conditii = [];
        let valori = [];
        let idx = 1;

        if (nume.trim() !== '') { conditii.push(`nume ILIKE $${idx++}`); valori.push(`%${nume.trim()}%`); }
        if (descriere.trim() !== '') { conditii.push(`descriere ILIKE $${idx++}`); valori.push(`%${descriere.trim()}%`); }
        if (culoare && culoare !== 'toate') { conditii.push(`culoare = $${idx++}`); valori.push(culoare); }
        if (garantie.trim() !== '' && !isNaN(parseInt(garantie))) { conditii.push(`garantie_luni >= $${idx++}`); valori.push(parseInt(garantie)); }
        if (pretMax.trim() !== '' && !isNaN(parseFloat(pretMax))) { conditii.push(`pret <= $${idx++}`); valori.push(parseFloat(pretMax)); }
        if (nou === 'true') { conditii.push(`nou = TRUE`); }
        if (categorie && categorie !== 'toate') { conditii.push(`categorie::text = $${idx++}`); valori.push(categorie); }

        // compatibilitate: produsul trebuie sa contina CEL PUTIN unul din tag-urile selectate (OR)
        let tagsCompat = compatibilitate.split(',').map(t => t.trim()).filter(t => t !== '');
        if (tagsCompat.length > 0) {
            let bucatiOr = tagsCompat.map(tag => { valori.push(`%${tag}%`); return `compatibilitate ILIKE $${idx++}`; });
            conditii.push('(' + bucatiOr.join(' OR ') + ')');
        }

        let whereSQL = conditii.length > 0 ? 'WHERE ' + conditii.join(' AND ') : '';

        // sortare pe 2 chei - whitelist obligatoriu pe numele coloanelor (nu vin niciodata direct din input in query)
        let ordSQL = '';
        let c1 = COLOANE_SORTARE_PERMISE[sort1];
        let c2 = COLOANE_SORTARE_PERMISE[sort2];
        let dirSQL = (directie === 'desc') ? 'DESC' : 'ASC';
        if (c1 && c2) ordSQL = `ORDER BY ${c1} ${dirSQL}, ${c2} ${dirSQL}`;
        else if (c1) ordSQL = `ORDER BY ${c1} ${dirSQL}`;

        const querySQL = `SELECT * FROM produse ${whereSQL} ${ordSQL}`;
        const rezultat = await pool.query(querySQL, valori);
        res.json({ produse: rezultat.rows, total: rezultat.rows.length });
    } catch (err) {
        console.error("Eroare la filtrarea server-side a produselor:", err);
        res.status(500).json({ eroare: "Nu s-au putut filtra produsele pe server." });
    }
});

// --- Pagina de produse si BONUSUL 14  ---
app.get('/produse', async (req, res) => {
    try {
        const querySQL = `
            SELECT *, 
                   CASE 
                       WHEN pret = MIN(pret) OVER(PARTITION BY categorie) THEN TRUE 
                       ELSE FALSE 
                   END AS cel_mai_ieftin 
            FROM produse;
        `;
        const rezultat = await pool.query(querySQL);
        
        let preturi = rezultat.rows.map(p => parseFloat(p.pret));
        let pretMaximDB = preturi.length > 0 ? Math.max(...preturi) : 10000;
        pretMaximDB = Math.ceil(pretMaximDB / 100) * 100;

        res.render('pagini/produse', { 
            produse: rezultat.rows, 
            pretMaximDB: pretMaximDB, 
            ip: req.ip 
        });
    } catch (err) {
        console.error("Eroare la extragerea produselor:", err);
        afisareEroare(res, 500, "Eroare Bază de Date", "Nu am putut aduce produsele.");
    }
});

// --- RUTA COMPLEMENTARĂ PENTRU PAGINA FIECĂRUI PRODUS (LIPSEA COMPLET!) ---
// --- RUTA PENTRU PAGINA FIECĂRUI PRODUS (ACTUALIZATĂ PENTRU BONUS 17) ---
app.get('/produs/:id', async (req, res) => {
    try {
        const idProdus = req.params.id;
        
        // 1. Aducem produsul curent
        const rezultatProdus = await pool.query('SELECT * FROM produse WHERE id = $1', [idProdus]);
        if (rezultatProdus.rows.length === 0) {
            return afisareEroare(res, 404, "Produsul nu există", "Piesa solicitată nu a putut fi găsită.");
        }
        let produsGasit = rezultatProdus.rows[0];

        // --- Etapa 6, Bonus 9: Imagini multiple per produs ---
        // In baza de date, coloana "folder_imagini" (optionala) contine numele unui subfolder
        // din resurse/imagini/produse/ cu toate imaginile acelui produs (1.jpg, 2.jpg, ...).
        // Daca nu exista coloana/folderul, cadem inapoi pe imaginea unica "prod.imagine".
        let imaginiProdus = [];
        if (produsGasit.folder_imagini) {
            try {
                let caleFolder = path.join(__dirname, 'resurse/imagini/produse', produsGasit.folder_imagini);
                if (fs.existsSync(caleFolder)) {
                    let fisiere = fs.readdirSync(caleFolder)
                        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
                        .sort();
                    imaginiProdus = fisiere.map(f => '/resurse/imagini/produse/' + produsGasit.folder_imagini + '/' + f);
                }
            } catch (errGalerie) {
                console.error("Eroare la citirea galeriei de imagini:", errGalerie.message);
            }
        }
        if (imaginiProdus.length === 0) {
            imaginiProdus = ['/resurse/imagini/' + produsGasit.imagine]; // fallback: imaginea unica existenta
        }

        // 2. Aducem toate seturile în care se află acest produs, cu tot cu restul componentelor din set
        const querySeturi = `
            SELECT s.id, s.nume_set, s.descriere_set,
                   json_agg(p.*) as produse_set
            FROM seturi s
            JOIN asociere_set asoc1 ON s.id = asoc1.id_set
            JOIN asociere_set asoc2 ON s.id = asoc2.id_set
            JOIN produse p ON asoc2.id_produs = p.id
            WHERE asoc1.id_produs = $1
            GROUP BY s.id;
        `;
        const rezultatSeturi = await pool.query(querySeturi, [idProdus]);
        
        // Calculăm prețurile seturilor
        let seturiAsociate = rezultatSeturi.rows.map(set => {
            set.infoPret = calculeazaPretSet(set.produse_set);
            return set;
        });

        // --- Etapa 6, Bonus 16: Produse similare (aceeași categorie, excludem produsul curent) ---
        let produseSimilare = [];
        try {
            const rezultatSimilare = await pool.query(
                'SELECT * FROM produse WHERE categorie = $1 AND id != $2 ORDER BY RANDOM() LIMIT 4',
                [produsGasit.categorie, idProdus]
            );
            produseSimilare = rezultatSimilare.rows;
        } catch (errSimilare) {
            console.error("Eroare la extragerea produselor similare:", errSimilare);
        }

        res.render('pagini/produs', { 
            prod: produsGasit, 
            seturi: seturiAsociate, // Trimitem seturile către EJS
            produseSimilare: produseSimilare, // Bonus 16
            imaginiProdus: imaginiProdus, // Bonus 9
            ip: req.ip 
        });
    } catch (err) {
        console.error("Eroare la randarea paginii produsului:", err);
        afisareEroare(res, 500, "Eroare Server", "Nu s-a putut genera pagina produsului.");
    }
});

//  Comparare produse ---
app.get('/compara/:id1/:id2', async (req, res) => {
    try {
        const id1 = req.params.id1;
        const id2 = req.params.id2;
        
        const rezultat = await pool.query('SELECT * FROM produse WHERE id IN ($1, $2)', [id1, id2]);
        
        if (rezultat.rows.length !== 2) {
            return afisareEroare(res, 404, "Produse lipsă", "Nu am putut găsi produsele pentru comparare.");
        }

        let p1 = rezultat.rows.find(p => p.id == id1);
        let p2 = rezultat.rows.find(p => p.id == id2);

        res.render('pagini/comparare', { p1: p1, p2: p2 });
    } catch (err) {
        console.error("Eroare la comparare:", err);
        afisareEroare(res, 500, "Eroare DB", "A apărut o eroare la comparare.");
    }
});

app.get(/.*/, (req, res) => {
    let pagina = req.path.substring(1); 
    if (pagina === "") pagina = "index"; 

    res.render('pagini/' + pagina, { ip: req.ip }, function(err, html) {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                return afisareEroare(res, 404);
            } else {
                return afisareEroare(res);
            }
        }
        res.send(html);
    });
});

app.listen(port, () => {
    console.log(`Serverul a pornit pe portul http://localhost:${port}`);
});