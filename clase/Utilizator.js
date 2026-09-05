/**
 * @file Utilizator.js
 * Clasa Utilizator — reprezintă un cont de utilizator din site (client, admin sau moderator) și
 * știe atât să se valideze pe sine, cât și să vorbească cu baza de date (prin AccesBD) și să
 * trimită email-uri (prin nodemailer).
 */

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const AccesBD = require('./AccesBD.js');
const { RolFactory } = require('./roluri.js');

class Utilizator {
    /**
     * Poate fi apelat FĂRĂ parametri (caz în care toate proprietățile primesc valori implicite) —
     * util, de exemplu, când construiești un utilizator nou, gol, pentru un formular de înregistrare.
     * Acceptă atât proprietăți camelCase (ex: `parolaHash`), cât și snake_case, exact ca în baza
     * de date (ex: `parola_hash`) — așa poate fi folosit direct și cu un rând citit din PostgreSQL.
     * @param {Object} [obiect={}] - datele inițiale ale utilizatorului
     * @param {number|null} [obiect.id] - id-ul din baza de date (null dacă utilizatorul nu a fost încă salvat)
     * @param {string} [obiect.nume] - numele complet al utilizatorului
     * @param {string} [obiect.username] - username-ul de logare
     * @param {string} [obiect.parolaHash] - hash-ul (bcrypt) al parolei — NICIODATĂ parola în clar
     * @param {string} [obiect.email] - adresa de email
     * @param {string} [obiect.rol] - codul rolului ("comun", "admin" sau "moderator")
     * @param {Date|string} [obiect.dataInregistrare] - data la care a fost creat contul
     * @param {Date|string|null} [obiect.dataUltimaCumparare] - data ultimei cumpărături (sau null)
     */
    constructor(obiect = {}) {
        /** @type {number|null} */
        this.id = obiect.id ?? null;
        /** @type {string} */
        this.nume = obiect.nume ?? '';
        /** @type {string} */
        this.username = obiect.username ?? '';
        /** @type {string} */
        this.parolaHash = obiect.parolaHash ?? obiect.parola_hash ?? '';
        /** @type {string} */
        this.email = obiect.email ?? '';
        /** @type {string} */
        this.rol = obiect.rol ?? 'comun';
        /** @type {Date|string} */
        this.dataInregistrare = obiect.dataInregistrare ?? obiect.data_inregistrare ?? new Date();
        /** @type {Date|string|null} */
        this.dataUltimaCumparare = obiect.dataUltimaCumparare ?? obiect.data_ultima_cumparare ?? null;
    }

    // ==========================================================================================
    // VALIDĂRI
    // ==========================================================================================
    // Notă: cerința spune că formatul numelui/username-ului "e menționat în altă cerință", pe care
    // nu am primit-o. Am ales un format rezonabil, uzual pentru astfel de proiecte — dacă cerința
    // voastră originală zice altceva, doar schimbați regex-urile de mai jos, restul clasei nu se
    // atinge.

    /**
     * Verifică dacă `this.nume` respectă formatul așteptat: minim 2 cuvinte, fiecare începând cu
     * literă mare, doar litere (inclusiv diacritice) — fără cifre sau simboluri.
     * @returns {boolean} true dacă numele e valid, false altfel
     */
    verificaNume() {
        const regex = /^[A-ZĂÂÎȘȚ][a-zA-ZăâîșțĂÂÎȘȚ]*(\s[A-ZĂÂÎȘȚ][a-zA-ZăâîșțĂÂÎȘȚ]*)+$/;
        return regex.test(this.nume);
    }

    /**
     * Verifică dacă `this.username` respectă formatul așteptat: 4-20 caractere, începe cu o
     * literă, conține doar litere, cifre și underscore.
     * @returns {boolean} true dacă username-ul e valid, false altfel
     */
    verificaUsername() {
        const regex = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/;
        return regex.test(this.username);
    }

    /**
     * Verifică dacă `this.email` are un format valid de adresă de email.
     * @returns {boolean} true dacă email-ul e valid, false altfel
     */
    verificaEmail() {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(this.email);
    }

    /**
     * Verifică dacă o parolă (în clar, ex: cea introdusă într-un formular, ÎNAINTE de hash-uire)
     * respectă un nivel minim de complexitate: minim 8 caractere, cel puțin o literă și o cifră.
     * @param {string} parolaInClar - parola introdusă de utilizator, netransformată încă în hash
     * @returns {boolean} true dacă parola respectă cerințele minime, false altfel
     */
    static verificaParola(parolaInClar) {
        const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        return regex.test(parolaInClar);
    }

    // ==========================================================================================
    // METODE DE INTERACȚIUNE CU BAZA DE DATE (INSTANȚĂ)
    // ==========================================================================================

    /**
     * Modifică, în baza de date, înregistrarea corespunzătoare acestui utilizator, cu noile date
     * date ca parametru. Actualizează și obiectul curent din memorie, dacă modificarea reușește.
     * @param {Object} obiectNoi - un obiect cu proprietățile de schimbat (camelCase, ex: {email: "nou@mail.com"})
     * @returns {Promise<Object>} rezultatul brut întors de driverul PostgreSQL
     * @throws {Error} dacă utilizatorul curent (după username) nu există în baza de date
     */
    async modifica(obiectNoi) {
        let existent = await Utilizator.getUtilizDupaUsernameAsync(this.username);
        if (!existent) {
            throw new Error(`Utilizatorul cu username-ul '${this.username}' nu există în baza de date.`);
        }

        let campuriJS = Object.keys(obiectNoi);
        let campuriDB = campuriJS.map(c => Utilizator._laSnakeCase(c));
        let valori = campuriJS.map(c => obiectNoi[c]);

        return new Promise((resolve, reject) => {
            AccesBD.getInstanta().update({
                tabel: 'utilizatori',
                campuri: campuriDB,
                valori: valori,
                conditii: [`id = ${this.id}`]
            }, (err, rezultat) => {
                if (err) { reject(err); return; }
                Object.assign(this, obiectNoi); // sincronizam si obiectul curent din memorie
                resolve(rezultat);
            });
        });
    }

    /**
     * Salvează (inserează) acest utilizator ca înregistrare NOUĂ în baza de date. La succes,
     * completează `this.id` și `this.dataInregistrare` cu valorile generate de baza de date.
     * @returns {Promise<Object>} rândul nou inserat, așa cum a fost întors de baza de date
     * @throws {Error} dacă username-ul e deja folosit de alt utilizator
     */
    async salvareUtilizator() {
        let existent = await Utilizator.getUtilizDupaUsernameAsync(this.username);
        if (existent) {
            throw new Error(`Username-ul '${this.username}' este deja folosit de alt utilizator.`);
        }

        return new Promise((resolve, reject) => {
            AccesBD.getInstanta().insert({
                tabel: 'utilizatori',
                campuri: ['nume', 'username', 'parola_hash', 'email', 'rol'],
                valori: [this.nume, this.username, this.parolaHash, this.email, this.rol]
            }, (err, rand) => {
                if (err) { reject(err); return; }
                this.id = rand.id;
                this.dataInregistrare = rand.data_inregistrare;
                resolve(rand);
            });
        });
    }

    /**
     * Șterge din baza de date înregistrarea corespunzătoare acestui utilizator.
     * @returns {Promise<Object>} rezultatul brut întors de driverul PostgreSQL
     * @throws {Error} dacă utilizatorul (după id) nu există în baza de date
     */
    async sterge() {
        if (!this.id) {
            throw new Error("Nu se poate șterge un utilizator care nu are id (nu a fost salvat încă în baza de date).");
        }
        let gasiti = await Utilizator.cautaAsync({ id: this.id });
        if (gasiti.length === 0) {
            throw new Error(`Utilizatorul cu id-ul ${this.id} nu există în baza de date.`);
        }

        return new Promise((resolve, reject) => {
            AccesBD.getInstanta().delete({
                tabel: 'utilizatori',
                conditii: [`id = ${this.id}`]
            }, (err, rezultat) => {
                if (err) { reject(err); return; }
                resolve(rezultat);
            });
        });
    }

    // ==========================================================================================
    // CĂUTARE (STATICE)
    // ==========================================================================================

    /**
     * Caută un utilizator după username (variantă cu callback — vezi și `getUtilizDupaUsernameAsync`
     * pentru varianta cu Promise). Gândită special pentru cazul de LOGIN: `obiect` poate conține
     * parola introdusă de utilizator, iar `callback`-ul o compară cu hash-ul găsit în baza de date.
     *
     * Exemplu de folosire (verificare login):
     * ```js
     * Utilizator.getUtilizDupaUsername('ionel', { parolaIntrodusa: 'parola123' }, (err, utiliz, obiect) => {
     *     if (err || !utiliz) { console.log('Utilizator inexistent'); return; }
     *     let parolaOk = bcrypt.compareSync(obiect.parolaIntrodusa, utiliz.parolaHash);
     *     console.log(parolaOk ? 'Login reușit' : 'Parolă greșită');
     * });
     * ```
     * @param {string} username - username-ul căutat
     * @param {Object} obiect - date suplimentare, disponibile apoi în callback (ex: parola introdusă la login)
     * @param {function(Error|null, Utilizator|null, Object): void} callback - primește (err, utilizatorGăsit, obiect)
     * @returns {void}
     */
    static getUtilizDupaUsername(username, obiect, callback) {
        AccesBD.getInstanta().select({
            tabel: 'utilizatori',
            conditii: [`username = '${Utilizator._escapeSql(username)}'`]
        }, (err, randuri) => {
            if (err) { callback(err, null, obiect); return; }
            let utiliz = randuri.length > 0 ? Utilizator._dinRandDB(randuri[0]) : null;
            callback(null, utiliz, obiect);
        });
    }

    /**
     * Caută un utilizator după username, în variantă asincronă (Promise).
     * @param {string} username - username-ul căutat
     * @returns {Promise<Utilizator|null>} utilizatorul găsit, sau `null` dacă nu există niciunul cu acel username
     */
    static async getUtilizDupaUsernameAsync(username) {
        let randuri = await AccesBD.getInstanta().selectAsync({
            tabel: 'utilizatori',
            conditii: [`username = '${Utilizator._escapeSql(username)}'`]
        });
        return randuri.length > 0 ? Utilizator._dinRandDB(randuri[0]) : null;
    }

    /**
     * Caută toți utilizatorii care respectă un set de caracteristici (variantă cu callback).
     * Orice proprietate LIPSĂ din `obParam` e ignorată — se caută doar după cele prezente.
     * Ex: `Utilizator.cauta({ rol: 'admin' }, cb)` caută toți utilizatorii cu rolul admin.
     * @param {Object} obParam - obiect cu aceleași proprietăți ca instanțele clasei Utilizator
     *                            (unele pot lipsi — acelea nu intră în filtrare)
     * @param {function(Error|null, Utilizator[]): void} callback - primește (err, listaUtilizatori)
     * @returns {void}
     */
    static cauta(obParam, callback) {
        let conditii = Utilizator._construiesteConditiiDinParam(obParam);
        AccesBD.getInstanta().select({
            tabel: 'utilizatori',
            conditii: conditii
        }, (err, randuri) => {
            if (err) { callback(err, []); return; }
            callback(null, randuri.map(r => Utilizator._dinRandDB(r)));
        });
    }

    /**
     * Aceeași căutare ca `cauta()`, dar în variantă asincronă (Promise).
     * @param {Object} obParam - obiect cu aceleași proprietăți ca instanțele clasei Utilizator (unele pot lipsi)
     * @returns {Promise<Utilizator[]>} lista utilizatorilor găsiți (poate fi și un array gol)
     */
    static async cautaAsync(obParam) {
        let conditii = Utilizator._construiesteConditiiDinParam(obParam);
        let randuri = await AccesBD.getInstanta().selectAsync({
            tabel: 'utilizatori',
            conditii: conditii
        });
        return randuri.map(r => Utilizator._dinRandDB(r));
    }

    // ==========================================================================================
    // DREPTURI ȘI EMAIL
    // ==========================================================================================

    /**
     * Verifică dacă utilizatorul curent are un anumit drept, pe baza rolului lui (`this.rol`).
     * Folosește RolFactory pentru a obține obiectul de Rol corespunzător.
     * @param {symbol} drept - un Symbol din obiectul Drepturi (drepturi.js)
     * @returns {boolean} true dacă rolul acestui utilizator conține dreptul dat, false altfel
     */
    areDreptul(drept) {
        let rolObiect = RolFactory.creeazaRol(this.rol);
        return rolObiect.areDreptul(drept);
    }

    /**
     * Trimite un email către adresa acestui utilizator (`this.email`), folosind nodemailer.
     *
     * ⚠️ IMPORTANT: pentru ca metoda asta să funcționeze REAL, trebuie completate datele unui
     * cont SMTP adevărat (host, user, parolă) — fie direct mai jos, fie (recomandat) prin variabile
     * de mediu: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Fără ele, metoda va încerca să
     * trimită mail-ul și va arunca o eroare de autentificare.
     *
     * @param {string} subiect - subiectul email-ului
     * @param {string} mesajText - conținutul email-ului, ca text simplu
     * @param {string} mesajHtml - conținutul email-ului, ca HTML
     * @param {Array} [atasamente=[]] - listă de atașamente, în formatul acceptat de nodemailer
     *                                  (ex: [{ filename: 'factura.pdf', path: './factura.pdf' }])
     * @returns {Promise<Object>} informații despre email-ul trimis (întors de nodemailer)
     */
    async trimiteMail(subiect, mesajText, mesajHtml, atasamente = []) {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'completeaza-aici@example.com',
                pass: process.env.SMTP_PASS || 'completeaza-parola-aici'
            }
        });

        return transporter.sendMail({
            from: process.env.SMTP_USER || 'completeaza-aici@example.com',
            to: this.email,
            subject: subiect,
            text: mesajText,
            html: mesajHtml,
            attachments: atasamente
        });
    }

    // ==========================================================================================
    // FUNCȚII AJUTĂTOARE INTERNE (PRIVATE)
    // ==========================================================================================

    /**
     * Transformă un rând brut din baza de date (proprietăți snake_case) într-o instanță reală
     * a clasei Utilizator (proprietăți camelCase).
     * @param {Object} rand - un rând așa cum vine direct din PostgreSQL (`pg`)
     * @returns {Utilizator} instanța corespunzătoare
     * @private
     */
    static _dinRandDB(rand) {
        return new Utilizator({
            id: rand.id,
            nume: rand.nume,
            username: rand.username,
            parolaHash: rand.parola_hash,
            email: rand.email,
            rol: rand.rol,
            dataInregistrare: rand.data_inregistrare,
            dataUltimaCumparare: rand.data_ultima_cumparare
        });
    }

    /**
     * Transformă un nume de proprietate camelCase (ex: "parolaHash") în numele echivalent de
     * coloană snake_case din baza de date (ex: "parola_hash").
     * @param {string} text - textul camelCase de transformat
     * @returns {string} textul transformat, în format snake_case
     * @private
     */
    static _laSnakeCase(text) {
        return text.replace(/([A-Z])/g, litera => '_' + litera.toLowerCase());
    }

    /**
     * Scapă (escape) ghilimelele simple dintr-un text, ca să poată fi folosit în siguranță
     * într-o condiție SQL brută de tip `coloana = '...'`. Notă: pentru interogări cu date venite
     * direct de la utilizator într-un context real de producție, ar fi de preferat parametrizarea
     * completă (ca la `update`/`insert` din AccesBD) în loc de concatenare de text, chiar și
     * scăpată — aici respectăm formatul de condiții brute cerut explicit în enunț.
     * @param {string} text - textul de scăpat
     * @returns {string} textul cu ghilimelele simple dublate (`'` devine `''`)
     * @private
     */
    static _escapeSql(text) {
        return String(text).replace(/'/g, "''");
    }

    /**
     * Construiește o listă de condiții SQL brute dintr-un obiect de parametri, ignorând
     * proprietățile `undefined`/`null` (căutare parțială — vezi `cauta`/`cautaAsync`).
     * @param {Object} obParam - obiectul cu proprietăți de căutat (unele pot lipsi)
     * @returns {string[]} lista de condiții SQL brute, gata de dat la AccesBD
     * @private
     */
    static _construiesteConditiiDinParam(obParam) {
        let conditii = [];
        for (let cheie in obParam) {
            let valoare = obParam[cheie];
            if (valoare === undefined || valoare === null) continue;

            let coloana = Utilizator._laSnakeCase(cheie);
            if (typeof valoare === 'string') {
                conditii.push(`${coloana} = '${Utilizator._escapeSql(valoare)}'`);
            } else {
                conditii.push(`${coloana} = ${valoare}`);
            }
        }
        return conditii;
    }
}

module.exports = Utilizator;
