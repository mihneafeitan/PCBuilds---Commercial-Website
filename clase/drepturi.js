/**
 * @file drepturi.js
 * Definește toate drepturile (permisiunile) posibile din aplicație, sub forma unui obiect cu
 * proprietăți de tip Symbol. Un Symbol e folosit special ca fiecare drept să fie o valoare unică,
 * garantat nefalsificabilă (nu poate fi "ghicit" sau reprodus accidental scriind un string identic
 * din greșeală, cum s-ar putea întâmpla dacă am fi folosit text simplu).
 */

/**
 * Obiect cu toate drepturile posibile din aplicație, grupate pe cele 2 zone principale:
 * gestionarea produselor și gestionarea utilizatorilor, plus dreptul de a cumpăra.
 * @type {Object<string, symbol>}
 */
const Drepturi = {
    // --- Drepturi legate de PRODUSE ---
    VIZUALIZARE_PRODUSE: Symbol('vizualizare_produse'),
    ADAUGARE_PRODUSE: Symbol('adaugare_produse'),
    MODIFICARE_PRODUSE: Symbol('modificare_produse'),
    STERGERE_PRODUSE: Symbol('stergere_produse'),

    // --- Drepturi legate de UTILIZATORI ---
    VIZUALIZARE_UTILIZATORI: Symbol('vizualizare_utilizatori'),
    ADAUGARE_UTILIZATORI: Symbol('adaugare_utilizatori'),
    MODIFICARE_UTILIZATORI: Symbol('modificare_utilizatori'),
    STERGERE_UTILIZATORI: Symbol('stergere_utilizatori'),

    // --- Drept legat de cumpărare ---
    CUMPARARE_PRODUSE: Symbol('cumparare_produse'),
};

module.exports = Drepturi;
