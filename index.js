const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

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
        fs.mkdirSync(cale);
    }
}

// --- 3. Obiect Global și Funcția cu TOATE BONUSURILE DE ERORI ---
global.obGlobal = { obErori: null };

function initErori() {
    let caleFisier = path.join(__dirname, 'erori.json');

    
    // Bonus A: Nu există fisierul erori.json -> aplicația se închide
    
    if (!fs.existsSync(caleFisier)) {
        console.error("Eroare CRITICA (Bonus A): Nu există fișierul erori.json!");
        process.exit();
    }

    let rawData = fs.readFileSync(caleFisier, 'utf-8');

    
    // Bonus F: Proprietate specificată de mai multe ori (verificare pe string)
    
    const blockRegex = /\{[^{}]+\}/g;
    let blocks = rawData.match(blockRegex);
    if (blocks) {
        for (let block of blocks) {
            let keys = [...block.matchAll(/"([^"]+)"\s*:/g)].map(m => m[1]);
            let duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
            if (duplicates.length > 0) {
                console.error(`Eroare JSON (Bonus F): Proprietatea [${duplicates[0]}] este specificată de mai multe ori într-un obiect!`);
            }
        }
    }

    try {
        let json = JSON.parse(rawData);
        
        
        // Bonus B: Nu există proprietățile: info_erori, cale_baza, eroare_default
         
        if (!json.info_erori || !json.cale_baza || !json.eroare_default) {
            console.error("Eroare JSON (Bonus B): Lipsesc proprietăți esențiale (info_erori, cale_baza, eroare_default)!");
        }

        
        // Bonus C: Pentru eroarea default lipseste titlu, text sau imagine
        
        if (json.eroare_default && (!json.eroare_default.titlu || !json.eroare_default.text || !json.eroare_default.imagine)) {
            console.error("Eroare JSON (Bonus C): Eroarea default este incompletă (lipsește titlu, text sau imagine)!");
        }

        
        // Bonus D: Folderul specificat în "cale_baza" nu există în sistem
        
        let caleBazaPath = path.join(__dirname, json.cale_baza || '');
        if (json.cale_baza && !fs.existsSync(caleBazaPath)) {
            console.error("Eroare (Bonus D): Folderul specificat în cale_baza nu există în sistemul de fișiere!");
        }

        let ids = [];
        if (json.info_erori) {
            for (let err of json.info_erori) {
                
                
                // Bonus G: Există mai multe erori cu același identificator

                if (ids.includes(err.identificator)) {
                    let eroareFaraId = Object.assign({}, err);
                    delete eroareFaraId.identificator; // Se șterge ID-ul pentru afișare
                    console.error(`Eroare JSON (Bonus G): ID duplicat găsit (${err.identificator}). Proprietăți:`, eroareFaraId);
                }
                ids.push(err.identificator);


                // Bonus E: Nu există vreunul dintre fișierele imagine pe disc

                if (err.imagine && json.cale_baza) {
                    let imgPath = path.join(caleBazaPath, err.imagine);
                    if (!fs.existsSync(imgPath)) {
                        console.error(`Eroare (Bonus E): Imaginea [${err.imagine}] asociată erorii ${err.identificator} nu există pe disc!`);
                    }
                    // Setăm calea absolută web pentru EJS
                    err.imagine = "/" + json.cale_baza + "/" + err.imagine;
                }
            }
        }

        obGlobal.obErori = json;
    } catch (e) {
        console.error("Eroare la parsarea erori.json: " + e.message);
    }
}

initErori(); // Rulăm la pornirea serverului

// Funcție afișare erori pe ecran
function afisareEroare(res, identificator, titlu, text, imagine) {
    let err = obGlobal.obErori ? obGlobal.obErori.info_erori.find(e => e.identificator === identificator) : null;
    let defaultErr = obGlobal.obErori ? obGlobal.obErori.eroare_default : { titlu: "Eroare", text: "Eroare generala", imagine: "" };

    let vTitlu = titlu || (err ? err.titlu : defaultErr.titlu);
    let vText = text || (err ? err.text : defaultErr.text);
    let vImagine = imagine || (err ? err.imagine : "/" + obGlobal.obErori.cale_baza + "/" + defaultErr.imagine);

    if (err && err.status) {
        res.status(identificator);
    }

    res.render('pagini/eroare', { titlu: vTitlu, text: vText, imagine: vImagine });
}

// --- 4. Setări Express și EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Respingere fisiere .ejs (folosim Regex, fără ghilimele)
app.get(/\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

// Favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/imagini/favicon.ico'));
});

// Interceptare folder resurse gol (Eroare 403)
app.use('/resurse', (req, res, next) => {
    if (req.url === '/' || req.url === '') {
        return afisareEroare(res, 403);
    }
    next();
});
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// --- 5. Rute / Pagini ---
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});


// Ruta Generala - prinde tot restul (folosim Regex, fără ghilimele)
app.get(/.*/, (req, res) => {
    let pagina = req.path.substring(1); 
    
    // Dacă e calea goală, trimitem la index
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

