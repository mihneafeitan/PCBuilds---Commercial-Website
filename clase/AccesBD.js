/**
 * @file AccesBD.js
 * Clasa AccesBD — un "portar" unic pentru toate cererile către baza de date. Urmează design
 * pattern-ul Singleton: indiferent din câte locuri din cod ceri "dă-mi accesul la baza de date",
 * primești mereu ACEEAȘI instanță (aceeași conexiune), nu una nouă de fiecare dată.
 */

const { Pool } = require('pg');

class AccesBD {
    /**
     * Constructorul e "protejat" manual împotriva creării unei a doua instanțe direct cu `new`.
     * Codul din afara clasei NU ar trebui să scrie niciodată `new AccesBD()` — ar trebui să
     * folosească mereu `AccesBD.getInstanta(...)`.
     * @throws {Error} dacă se încearcă a doua instanțiere a clasei
     */
    constructor() {
        if (AccesBD.instanta !== null) {
            throw new Error("Clasa AccesBD a fost deja instanțiată! Folosiți AccesBD.getInstanta() în loc de 'new AccesBD()'.");
        }
        /** @type {import('pg').Pool|null} conexiunea reală către PostgreSQL, setată abia la inițializare */
        this._client = null;
    }

    /**
     * Getter pentru obiectul de conexiune curent către baza de date.
     * @returns {import('pg').Pool|null} conexiunea (pool-ul) PostgreSQL activă, sau null dacă
     *                                    inițializarea încă nu a fost făcută
     */
    get client() {
        return this._client;
    }

    /**
     * Inițializează efectiv conexiunea către baza de date, cu datele de autentificare date.
     * Poate fi apelată direct, dar în mod normal e apelată automat din getInstanta().
     * @param {string} utilizator - user-ul de conectare la PostgreSQL
     * @param {string} parola - parola asociată user-ului
     * @param {string} bazaDeDate - numele bazei de date la care ne conectăm
     * @param {number} port - portul pe care ascultă serverul PostgreSQL (implicit 5432)
     * @param {string} [host='localhost'] - adresa serverului de baze de date
     * @returns {void}
     */
    initializeazaBD(utilizator, parola, bazaDeDate, port, host = 'localhost') {
        this._client = new Pool({
            user: utilizator,
            password: parola,
            database: bazaDeDate,
            port: port,
            host: host
        });
    }

    /**
     * Punctul central de acces la Singleton: creează instanța (o singură dată, la prima
     * apelare) și îi inițializează conexiunea la baza de date; la orice apelare ulterioară,
     * întoarce direct instanța deja existentă, IGNORÂND parametrii dați a doua oară (conexiunea
     * nu se reface — rămâne cea din prima inițializare).
     * @param {string} [utilizator] - user PostgreSQL (necesar doar la prima apelare)
     * @param {string} [parola] - parola PostgreSQL (necesar doar la prima apelare)
     * @param {string} [bazaDeDate] - numele bazei de date (necesar doar la prima apelare)
     * @param {number} [port] - portul PostgreSQL (necesar doar la prima apelare)
     * @param {string} [host] - adresa serverului (necesar doar la prima apelare)
     * @returns {AccesBD} unica instanță a clasei AccesBD din toată aplicația
     */
    static getInstanta(utilizator, parola, bazaDeDate, port, host) {
        if (AccesBD.instanta === null) {
            AccesBD.instanta = new AccesBD();
            AccesBD.instanta.initializeazaBD(utilizator, parola, bazaDeDate, port, host);
        }
        return AccesBD.instanta;
    }

    /**
     * Construiește partea de "unde" (WHERE) a unei interogări, dintr-o listă de condiții deja
     * gata scrise (nu sunt parametrizate — vin ca text SQL brut, exact cum cere enunțul, ex:
     * ["pret>50", "nume like 'a%'"]).
     * @param {string[]|undefined} conditii - lista de condiții SQL brute
     * @returns {string} textul " WHERE cond1 AND cond2 ..." sau text gol dacă nu sunt condiții
     * @private
     */
    _construiesteWhere(conditii) {
        if (conditii && conditii.length > 0) {
            return ' WHERE ' + conditii.join(' AND ');
        }
        return '';
    }

    /**
     * Selectează date dintr-un tabel (stil callback, ca în enunț).
     * @param {Object} obiect - parametrii interogării
     * @param {string} obiect.tabel - numele tabelului din care selectăm
     * @param {string[]} [obiect.campuri] - câmpurile de selectat (dacă lipsește, se selectează toate, `*`)
     * @param {string[]} [obiect.conditii] - condiții SQL brute, unite cu AND (ex: ["pret>50"])
     * @param {function(Error|null, Array|null): void} callback - apelată cu (err, rezultate) la final
     * @returns {void}
     */
    select(obiect, callback) {
        let { tabel, campuri, conditii } = obiect;
        let campuriText = (campuri && campuri.length > 0) ? campuri.join(', ') : '*';
        let sql = `SELECT ${campuriText} FROM ${tabel}` + this._construiesteWhere(conditii);

        this.client.query(sql, (err, rezultat) => {
            if (err) { callback(err, null); return; }
            callback(null, rezultat.rows);
        });
    }

    /**
     * Aceeași selecție ca `select()`, dar în variantă asincronă (async/await), fără callback.
     * @param {Object} obiect - parametrii interogării
     * @param {string} obiect.tabel - numele tabelului din care selectăm
     * @param {string[]} [obiect.campuri] - câmpurile de selectat (dacă lipsește, se selectează toate, `*`)
     * @param {string[]} [obiect.conditii] - condiții SQL brute, unite cu AND
     * @returns {Promise<Array>} o promisiune care se rezolvă cu lista de rânduri găsite
     */
    async selectAsync(obiect) {
        let { tabel, campuri, conditii } = obiect;
        let campuriText = (campuri && campuri.length > 0) ? campuri.join(', ') : '*';
        let sql = `SELECT ${campuriText} FROM ${tabel}` + this._construiesteWhere(conditii);

        let rezultat = await this.client.query(sql);
        return rezultat.rows;
    }

    /**
     * Actualizează una sau mai multe înregistrări dintr-un tabel.
     * @param {Object} obiect - parametrii actualizării
     * @param {string} obiect.tabel - numele tabelului
     * @param {string[]} obiect.campuri - numele câmpurilor de modificat
     * @param {Array} obiect.valori - noile valori, în ACEEAȘI ORDINE cu `campuri` (aceeași lungime)
     * @param {string[]} [obiect.conditii] - condiții SQL brute care selectează rândurile de modificat
     * @param {function(Error|null, Object|null): void} callback - apelată cu (err, rezultatPg) la final
     * @returns {void}
     */
    update(obiect, callback) {
        let { tabel, campuri, valori, conditii } = obiect;
        // Construim "camp1 = $1, camp2 = $2, ..." -- valorile sunt parametrizate (sigure), spre
        // deosebire de conditii, care vin deja ca text SQL brut, conform cerinței din enunț.
        let setari = campuri.map((c, i) => `${c} = $${i + 1}`).join(', ');
        let sql = `UPDATE ${tabel} SET ${setari}` + this._construiesteWhere(conditii);

        this.client.query(sql, valori, (err, rezultat) => {
            callback(err, err ? null : rezultat);
        });
    }

    /**
     * Inserează o înregistrare nouă într-un tabel. Acceptă 2 forme pentru `obiect`:
     * (1) `{ tabel, campuri: [...], valori: [...] }` — liste separate, în aceeași ordine, sau
     * (2) `{ tabel, camp1: valoare1, camp2: valoare2, ... }` — un singur obiect "plat", unde
     *     fiecare proprietate (în afară de `tabel`) e chiar numele unui câmp.
     * @param {Object} obiect - datele de inserat, într-una din cele 2 forme de mai sus
     * @param {string} obiect.tabel - numele tabelului în care inserăm
     * @param {function(Error|null, Object|null): void} callback - apelată cu (err, rândul inserat)
     * @returns {void}
     */
    insert(obiect, callback) {
        let campuri, valori;
        if (Array.isArray(obiect.campuri) && Array.isArray(obiect.valori)) {
            campuri = obiect.campuri;
            valori = obiect.valori;
        } else {
            // Forma alternativă: orice proprietate, în afară de "tabel", e un câmp de inserat.
            campuri = Object.keys(obiect).filter(cheie => cheie !== 'tabel');
            valori = campuri.map(camp => obiect[camp]);
        }

        let placeholderi = campuri.map((_, i) => `$${i + 1}`).join(', ');
        let sql = `INSERT INTO ${obiect.tabel} (${campuri.join(', ')}) VALUES (${placeholderi}) RETURNING *`;

        this.client.query(sql, valori, (err, rezultat) => {
            if (err) { callback(err, null); return; }
            callback(null, rezultat.rows[0]);
        });
    }

    /**
     * Șterge una sau mai multe înregistrări dintr-un tabel.
     * @param {Object} obiect - parametrii ștergerii
     * @param {string} obiect.tabel - numele tabelului
     * @param {string[]} [obiect.conditii] - condiții SQL brute care selectează rândurile de șters
     * @param {function(Error|null, Object|null): void} callback - apelată cu (err, rezultatPg) la final
     * @returns {void}
     */
    delete(obiect, callback) {
        let { tabel, conditii } = obiect;
        let sql = `DELETE FROM ${tabel}` + this._construiesteWhere(conditii);

        this.client.query(sql, (err, rezultat) => {
            callback(err, err ? null : rezultat);
        });
    }
}

/**
 * Proprietatea statică ce ține unica instanță a clasei (Singleton). Începe null, iar
 * getInstanta() o completează prima dată când e nevoie.
 * @type {AccesBD|null}
 */
AccesBD.instanta = null;

module.exports = AccesBD;
