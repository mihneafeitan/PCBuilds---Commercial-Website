/**
 * @file roluri.js
 * Definește ierarhia de roluri din aplicație (Rol -> RolClient / RolAdmin / RolModerator) și o
 * fabrică (RolFactory) care construiește obiectul de Rol potrivit, pornind doar de la un cod text.
 */

const Drepturi = require('./drepturi.js');

/**
 * Clasa de bază pentru orice rol din aplicație. Nu se instanțiază direct în mod normal (nu are
 * niciun drept propriu) — servește ca "șablon" comun pentru toate rolurile concrete de mai jos.
 */
class Rol {
    /**
     * @param {string} cod - codul textual al rolului, exact cum apare în coloana "rol" din tabel
     *                        (ex: "admin", "comun", "moderator").
     */
    constructor(cod) {
        /** @type {string} codul rolului, așa cum e salvat în baza de date */
        this.cod = cod;
    }

    /**
     * Getter care întoarce lista de drepturi (Symbol-uri din drepturi.js) pe care le are acest rol.
     * În clasa de bază e mereu goală — fiecare subclasă concretă o suprascrie cu drepturile ei reale.
     * @returns {symbol[]} lista de drepturi ale rolului (goală pentru clasa de bază)
     */
    get drepturi() {
        return [];
    }

    /**
     * Verifică dacă acest rol are un anumit drept.
     * @param {symbol} drept - unul dintre Symbol-urile din obiectul Drepturi (drepturi.js)
     * @returns {boolean} true dacă rolul curent conține acel drept, false altfel
     */
    areDreptul(drept) {
        return this.drepturi.includes(drept);
    }
}

/**
 * Rolul unui client obișnuit, logat pe site. Poate vedea produsele și poate cumpăra, dar nu are
 * niciun drept legat de gestionarea utilizatorilor sau de administrarea produselor.
 * @extends Rol
 */
class RolClient extends Rol {
    constructor() {
        super("comun");
    }

    /** @returns {symbol[]} drepturile unui client obișnuit */
    get drepturi() {
        return [
            Drepturi.VIZUALIZARE_PRODUSE,
            Drepturi.CUMPARARE_PRODUSE,
        ];
    }
}

/**
 * Rolul administratorului site-ului — are absolut toate drepturile posibile din aplicație.
 * @extends Rol
 */
class RolAdmin extends Rol {
    constructor() {
        super("admin");
    }

    /** @returns {symbol[]} toate drepturile definite în drepturi.js, fără excepție */
    get drepturi() {
        return Object.values(Drepturi);
    }
}

/**
 * Rolul moderatorului — are toate drepturile legate de gestionarea utilizatorilor (vizualizare,
 * adăugare, modificare, ștergere), dar NU poate cumpăra produse și nici nu poate vizualiza, adăuga,
 * modifica sau șterge produse (exact cum cere enunțul).
 * @extends Rol
 */
class RolModerator extends Rol {
    constructor() {
        super("moderator");
    }

    /** @returns {symbol[]} drepturile unui moderator (doar cele legate de utilizatori) */
    get drepturi() {
        return [
            Drepturi.VIZUALIZARE_UTILIZATORI,
            Drepturi.ADAUGARE_UTILIZATORI,
            Drepturi.MODIFICARE_UTILIZATORI,
            Drepturi.STERGERE_UTILIZATORI,
        ];
    }
}

/**
 * Fabrică (design pattern Factory) pentru crearea obiectelor de Rol, pornind doar de la codul lor
 * text — restul codului aplicației nu trebuie să știe niciodată direct de clasele RolAdmin,
 * RolClient, RolModerator; doar cere fabricii "dă-mi rolul cu codul X".
 */
class RolFactory {
    /**
     * Creează și întoarce obiectul de Rol corespunzător codului dat.
     * @param {string} tip - codul rolului dorit ("admin", "moderator", sau "comun")
     * @returns {Rol} instanța rolului corespunzător; dacă tipul nu e recunoscut, se întoarce
     *                implicit un RolClient (cel mai restrictiv rol, ca măsură de siguranță)
     */
    static creeazaRol(tip) {
        switch (tip) {
            case "admin":
                return new RolAdmin();
            case "moderator":
                return new RolModerator();
            case "comun":
                return new RolClient();
            default:
                return new RolClient(); // implicit, cel mai sigur (cele mai puține drepturi)
        }
    }
}

module.exports = { Rol, RolClient, RolAdmin, RolModerator, RolFactory };
