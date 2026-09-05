/**
 * @file cookies.js
 * Etapa 7 (animatie-banner): funcții generice de lucru cu cookie-uri + logica bannerului de
 * consimțământ + cookie-urile suplimentare cerute (ultima pagină accesată) + afișarea unei
 * scurte informări despre cookie-urile setate, undeva pe site (în footer).
 * Fișierul e încărcat pe ORICE pagină (prin head.ejs), ca funcțiile de mai jos să fie
 * disponibile global și în celelalte fișiere JS (produs.js, produse.js).
 */

// ================================================================================
// FUNCȚII GENERICE DE LUCRU CU COOKIE-URI (globale — nu sunt închise într-un IIFE,
// ca să poată fi apelate și din produs.js / produse.js)
// ================================================================================

/**
 * Setează un cookie.
 * @param {string} nume - numele cookie-ului
 * @param {string} valoare - valoarea de salvat (va fi codificată cu encodeURIComponent)
 * @param {number} secundeValabilitate - peste câte secunde expiră cookie-ul
 * @returns {void}
 */
function setCookie(nume, valoare, secundeValabilitate) {
    let data = new Date();
    data.setTime(data.getTime() + secundeValabilitate * 1000);
    document.cookie = `${nume}=${encodeURIComponent(valoare)}; expires=${data.toUTCString()}; path=/`;
}

/**
 * Citește valoarea unui cookie, după nume.
 * @param {string} nume - numele cookie-ului căutat
 * @returns {string|null} valoarea cookie-ului (decodificată), sau null dacă nu există
 */
function getCookie(nume) {
    let toateCookieurile = document.cookie.split('; ');
    for (let bucata of toateCookieurile) {
        let separator = bucata.indexOf('=');
        if (separator === -1) continue;
        let cheie = bucata.substring(0, separator);
        let valoare = bucata.substring(separator + 1);
        if (cheie === nume) return decodeURIComponent(valoare);
    }
    return null;
}

/**
 * Șterge un cookie, după nume — se face setându-i o dată de expirare în trecut.
 * @param {string} nume - numele cookie-ului de șters
 * @returns {void}
 */
function deleteCookie(nume) {
    document.cookie = `${nume}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

/**
 * Șterge TOATE cookie-urile setate de acest site (utilă pentru testare/demo).
 * @returns {void}
 */
function deleteAllCookies() {
    let toateCookieurile = document.cookie.split('; ');
    for (let bucata of toateCookieurile) {
        let nume = bucata.split('=')[0];
        if (nume) deleteCookie(nume);
    }
}

// ================================================================================
// BANNER-UL DE CONSIMȚĂMÂNT COOKIES
// ================================================================================

/** @type {string} numele cookie-ului care ține minte dacă utilizatorul a acceptat deja bannerul */
const COOKIE_CONSIMTAMANT = 'accept_cookies';

/**
 * Cât timp ține minte browserul că ai acceptat cookie-urile, înainte să reapară bannerul.
 * Enunțul cere 1 săptămână în varianta reală, dar recomandă o valoare scurtă (5-6 secunde)
 * pentru prezentare, ca profesorul să poată vedea reapariția bannerului fără să aștepte o săptămână.
 * *** Schimbă valoarea de mai jos înainte de prezentare. ***
 */
const DURATA_CONSIMTAMANT_SECUNDE = 7 * 24 * 60 * 60; // 1 săptămână (varianta reală)
// const DURATA_CONSIMTAMANT_SECUNDE = 6; // <-- varianta pentru prezentare (6 secunde)

document.addEventListener('DOMContentLoaded', function () {
    let banner = document.getElementById('banner');
    let btnOk = document.getElementById('ok_cookies');

    if (banner && getCookie(COOKIE_CONSIMTAMANT) === 'da') {
        // Consimțământul e deja acceptat și încă valabil -> nu mai arătăm bannerul deloc,
        // nici măcar animația (îl marcăm ascuns înainte ca CSS-ul de animație să apuce să ruleze).
        banner.classList.add('ascuns');
    }

    if (btnOk && banner) {
        btnOk.addEventListener('click', function (e) {
            e.stopPropagation(); // nu lasam click-ul sa "treaca" mai departe prin banner
            setCookie(COOKIE_CONSIMTAMANT, 'da', DURATA_CONSIMTAMANT_SECUNDE);
            banner.classList.add('ascuns');
        });
    }

    // ============================================================================
    // COOKIE SUPLIMENTAR: ultima pagină accesată
    // ============================================================================
    // Citim VALOAREA VECHE (pagina pe care era utilizatorul înainte să ajungă aici) ÎNAINTE
    // s-o suprascriem cu pagina curentă, ca să avem ce afișa mai jos.
    let paginaAnterioara = getCookie('ultima_pagina_accesata');
    setCookie('ultima_pagina_accesata', window.location.pathname, 30 * 24 * 60 * 60);

    afiseazaInfoCookies(paginaAnterioara);
});

/**
 * Caută pe pagină un element cu id="info-cookies" (pus în footer, deci prezent pe orice pagină)
 * și îl completează cu informații extrase din cookie-urile curente — cerința "Afișați ceva
 * referitor la acest cookie undeva pe site".
 * @param {string|null} paginaAnterioara - pagina pe care era utilizatorul înainte de aceasta
 *                                          (citită din cookie ÎNAINTE de a fi suprascrisă)
 * @returns {void}
 */
function afiseazaInfoCookies(paginaAnterioara) {
    let elem = document.getElementById('info-cookies');
    if (!elem) return;

    let ultimulProdus = getCookie('ultimul_produs_accesat');
    let ultimaCumparare = getCookie('data_ultimei_cumparaturi');

    let bucati = [];
    if (paginaAnterioara) bucati.push(`pagina anterioară: <strong>${paginaAnterioara}</strong>`);
    if (ultimulProdus) bucati.push(`ultimul produs vizitat: <strong>${ultimulProdus}</strong>`);
    if (ultimaCumparare) bucati.push(`ultima cumpărătură (demo): <strong>${ultimaCumparare}</strong>`);

    elem.innerHTML = bucati.length > 0
        ? `<i class="fa-solid fa-cookie-bite"></i> Din cookie-uri: ${bucati.join(' &nbsp;|&nbsp; ')}`
        : `<i class="fa-solid fa-cookie-bite"></i> Încă nu există date salvate în cookie-uri pentru această vizită.`;
}
