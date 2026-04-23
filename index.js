const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass'); // Pachetul pentru compilare SCSS
const app = express();
const sharp = require('sharp'); //  Pachetul pentru procesat imagini
const port = 8081;

// --- 1. (Afișare consolă cerință Node) ---
console.log("Calea fisierului (__filename):", __filename);
console.log("Directorul modulului (__dirname):", __dirname);
console.log("Directorul curent de lucru (process.cwd()):", process.cwd());

// --- 2. Crearea folderelor cerute ---
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let f of vect_foldere) {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale, { recursive: true });
    }
}

// --- 3. Obiect Global (Cerinta SCSS) ---
global.obGlobal = { 
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css')
};

// --- COMPILARE SCSS ---
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

// --- INITIALIZARE ERORI (Cu bonusuri) ---
function initErori() {
    let caleFisier = path.join(__dirname, 'erori.json');

    if (!fs.existsSync(caleFisier)) {
        console.error("Eroare CRITICA (Bonus A): Nu există fișierul erori.json!");
        process.exit();
    }

    let rawData = fs.readFileSync(caleFisier, 'utf-8');

    const blockRegex = /\{[^{}]+\}/g;
    let blocks = rawData.match(blockRegex);
    if (blocks) {
        for (let block of blocks) {
            let keys = [...block.matchAll(/"([^"]+)"\s*:/g)].map(m => m[1]);
            let duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
            if (duplicates.length > 0) {
                console.error(`Eroare JSON : Proprietatea [${duplicates[0]}] este specificată de mai multe ori într-un obiect!`);
            }
        }
    }

    try {
        let json = JSON.parse(rawData);
        
        if (!json.info_erori || !json.cale_baza || !json.eroare_default) {
            console.error("Eroare JSON (Bonus B): Lipsesc proprietăți esențiale!");
        }

        if (json.eroare_default && (!json.eroare_default.titlu || !json.eroare_default.text || !json.eroare_default.imagine)) {
            console.error("Eroare JSON (Bonus C): Eroarea default este incompletă!");
        }

        let caleBazaPath = path.join(__dirname, json.cale_baza || '');
        if (json.cale_baza && !fs.existsSync(caleBazaPath)) {
            console.error("Eroare (Bonus D): Folderul specificat în cale_baza nu există!");
        }

        let ids = [];
        if (json.info_erori) {
            for (let err of json.info_erori) {
                
                if (ids.includes(err.identificator)) {
                    let eroareFaraId = Object.assign({}, err); // Am corectat typo-ul aici
                    delete eroareFaraId.identificator; 
                    console.error(`Eroare JSON : ID duplicat găsit (${err.identificator}). Proprietăți:`, eroareFaraId);
                }
                ids.push(err.identificator);

                if (err.imagine && json.cale_baza) {
                    let imgPath = path.join(caleBazaPath, err.imagine);
                    if (!fs.existsSync(imgPath)) {
                        console.error(`Eroare : Imaginea [${err.imagine}] nu există pe disc!`);
                    }
                    err.imagine = "/" + json.cale_baza + "/" + err.imagine;
                }
            }
        }

        obGlobal.obErori = json;
    } catch (e) {
        console.error("Eroare la parsarea erori.json: " + e.message);
    }
}

initErori(); 

function afisareEroare(res, identificator, titlu, text, imagine) {
    let err = obGlobal.obErori ? obGlobal.obErori.info_erori.find(e => e.identificator === identificator) : null;
    let defaultErr = obGlobal.obErori ? obGlobal.obErori.eroare_default : { 
        titlu: "Eroare", 
        text: "Eroare generala", 
        imagine: "" 
    };

    let vTitlu = titlu || (err ? err.titlu : defaultErr.titlu);
    let vText = text || (err ? err.text : defaultErr.text);
    let vImagine = imagine || (err ? err.imagine : "/" + obGlobal.obErori.cale_baza + "/" + defaultErr.imagine);

    if (err && err.status) {
        res.status(identificator);
    }

    res.render('pagini/eroare', { 
        titlu: vTitlu, 
        text: vText, 
        imagine: vImagine 
    });
}

// --- SETĂRI EXPRESS ȘI EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// =======================================================================
// --- 6. LOGICA PENTRU GALERIE (OBLIGATORIU AICI, ÎNAINTE DE RUTE) ---
// =======================================================================
function getAnotimp() {
    let luna = new Date().getMonth() + 1; // getMonth() returnează 0-11
    if (luna >= 3 && luna <= 5) return 'primavara';
    if (luna >= 6 && luna <= 8) return 'vara';
    if (luna >= 9 && luna <= 11) return 'toamna';
    return 'iarna';
}

// Funcția middleware devine 'async' deoarece procesarea imaginilor durează milisecunde
app.use(async (req, res, next) => {
    let galeriePath = path.join(__dirname, 'galerie.json');
    if (fs.existsSync(galeriePath)) {
        try {
            let dateGalerie = JSON.parse(fs.readFileSync(galeriePath, 'utf-8'));
            let anotimpCurent = getAnotimp();
            
            // 1. Filtrare după anotimp
            let imaginiFiltrate = dateGalerie.imagini.filter(img => img.anotimp === anotimpCurent);
            
            // 2. Trunchiere la maxim 13 imagini
            if (imaginiFiltrate.length > 13) {
                imaginiFiltrate = imaginiFiltrate.slice(0, 13);
            }

            // 3. SHARP: Creăm imagini mici dacă nu există deja
            let folderImaginiAbsolut = path.join(__dirname, dateGalerie.cale_galerie);
            
            for (let img of imaginiFiltrate) {
                let numeFisier = img.cale_fisier;
                // Generăm un nume pentru poza mică (ex: poza1.jpg -> poza1-mic.jpg)
                let numeFisierMic = numeFisier.replace('.', '-mic.');
                
                let caleAbsolutaMare = path.join(folderImaginiAbsolut, numeFisier);
                let caleAbsolutaMica = path.join(folderImaginiAbsolut, numeFisierMic);
                
                // Salvăm numele mic în obiect ca să îl trimitem la EJS
                img.cale_fisier_mic = numeFisierMic;

                // Dacă există imaginea mare dar NU există aia mică, o tăiem!
                if (fs.existsSync(caleAbsolutaMare) && !fs.existsSync(caleAbsolutaMica)) {
                    try {
                        // Facem resize la lățimea de 300px
                        await sharp(caleAbsolutaMare).resize(300).toFile(caleAbsolutaMica);
                        console.log(`[SHARP] Am generat versiunea mică pentru: ${numeFisier}`);
                    } catch (errSharp) {
                        console.error("[SHARP EROARE]", errSharp.message);
                    }
                }
            }

            // 4. Trimitem datele către EJS
            res.locals.imaginiGalerie = imaginiFiltrate;
            res.locals.caleGalerie = dateGalerie.cale_galerie;
        } catch (err) {
            console.error("Eroare la parsarea galerie.json:", err);
            res.locals.imaginiGalerie = [];
            res.locals.caleGalerie = "";
        }
    } else {
        res.locals.imaginiGalerie = [];
        res.locals.caleGalerie = "";
    }
    next(); 
});


// --- RUTE ȘI PAGINI ---

app.get(/\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/imagini/favicon.ico'));
});

app.use('/resurse', (req, res, next) => {
    if (req.url === '/' || req.url === '') {
        return afisareEroare(res, 403);
    }
    next();
});
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
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