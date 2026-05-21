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


// =======================================================================
// --- Etapa 6, Bonus 12: Motor generare și gestionare oferte automate în JSON ---
// =======================================================================
const ofertePath = path.join(__dirname, 'oferte.json');

let categoriiOfertare = [];
pool.query("SELECT unnest(enum_range(NULL::categorie_produs))::text AS categorie").then(res => {
    categoriiOfertare = res.rows.map(r => r.categorie);
}).catch(err => console.error(err));

const T_OFERTA = 60 * 1000;      
const T_CURATARE = 5 * 60 * 1000; 

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
        oferte = oferte.filter(o => {
            let timpFinalizare = new Date(o["data-finalizare"]).getTime();
            return (acum - timpFinalizare) < T_CURATARE;
        });
        
        fs.writeFileSync(ofertePath, JSON.stringify({ oferte: oferte }, null, 4));
        console.log(`[OFERTĂ] S-a generat o reducere de ${reducereNoua}% la ${catNoua}!`);
    } catch(e) { 
        console.error("Eroare la scrierea ofertelor:", e.message); 
    }
}, T_OFERTA);

// --- Etapa 6, Bonus 12: Middleware atașare ofertă activă în obiectul local local res.locals ---
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
// =======================================================================


// --- Etapa 6: Middleware pentru interogarea bazei de date și popularea meniului de categorii dinamic ---
app.use(async (req, res, next) => {
    try {
        const query = "SELECT unnest(enum_range(NULL::categorie_produs))::text AS categorie";
        const rezultat = await pool.query(query);
        let categorii = rezultat.rows.map(rand => rand.categorie);
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

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});


// --- Etapa 6: Generarea dinamică a paginii de listare produse din PostgreSQL ---
app.get('/produse', async (req, res) => {
    try {
        const rezultat = await pool.query('SELECT * FROM produse');
        
        // --- Etapa 6, Bonus 1: Citirea dinamică a celui mai scump produs pentru setare automată atribute slider ---
        let preturi = rezultat.rows.map(p => parseFloat(p.pret));
        let pretMaximDB = preturi.length > 0 ? Math.max(...preturi) : 10000;
        
        pretMaximDB = Math.ceil(pretMaximDB / 100) * 100;

        res.render('pagini/produse', { 
            produse: resultado = rezultat.rows, 
            pretMaximDB: pretMaximDB, 
            ip: req.ip 
        });
    } catch (err) {
        console.error("Eroare la extragerea produselor:", err);
        afisareEroare(res, 500, "Eroare Bază de Date", "Nu am putut aduce produsele.");
    }
});


// --- Etapa 6, Bonus 20: Ruta backend ce servește pagina de comparare paralelă a două produse selectate ---
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