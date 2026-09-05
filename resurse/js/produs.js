/**
 * @file produs.js
 * Etapa 7:
 * - (bootstrap_js) memorează în localStorage ce panouri din accordion-ul de pe pagina unui
 *   produs au fost deschise/închise de utilizator, și le reface exact așa la reîncărcare.
 * - (animatie-banner) setează cookie-ul "ultimul produs accesat" la fiecare intrare pe o
 *   pagină de produs, și cookie-ul demo "data ultimei cumpărături" la click pe butonul demo.
 */

document.addEventListener("DOMContentLoaded", function () {
    const CHEIE_STORAGE = "accordion-produs-stare";

    // ETAPA 7: cookie "ultimul produs accesat" - se seteaza automat de fiecare data cand
    // utilizatorul intra pe pagina unui produs oarecare.
    if (typeof setCookie === "function") {
        let numeProdus = document.querySelector("h2")?.textContent?.trim() || "";
        if (numeProdus) {
            setCookie("ultimul_produs_accesat", numeProdus, 30 * 24 * 60 * 60); // 30 de zile
        }
    }

    // ETAPA 7: cookie "data ultimei cumparaturi" - proiectul nu are inca un sistem real de
    // comanda/checkout, deci acest buton e un DEMO care doar seteaza cookie-ul, ca sa arate
    // ca functionalitatea de cookie exista si e corecta; il poti inlocui usor cu apelul real
    // catre backend cand vei implementa un cos de cumparaturi.
    let btnSimuleaza = document.getElementById("btn-simuleaza-cumparare");
    if (btnSimuleaza && typeof setCookie === "function") {
        btnSimuleaza.addEventListener("click", function () {
            let acum = new Intl.DateTimeFormat('ro-RO', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }).format(new Date());
            setCookie("data_ultimei_cumparaturi", acum, 90 * 24 * 60 * 60); // 90 de zile
            btnSimuleaza.innerHTML = '<i class="fa-solid fa-check"></i> Cumpărătură (demo) înregistrată!';
            btnSimuleaza.disabled = true;
            btnSimuleaza.classList.replace("btn-outline-success", "btn-success");
        });
    }

    let stareSalvata = JSON.parse(localStorage.getItem(CHEIE_STORAGE) || "{}");

    let panouri = document.querySelectorAll("#accordionProdus .accordion-collapse");

    panouri.forEach(function (panou) {
        let id = panou.id;

        // 1. La incarcarea paginii: daca utilizatorul a lasat acest panou DESCHIS data trecuta,
        //    il deschidem direct (fara animatie), inainte ca Bootstrap sa preia controlul complet.
        if (stareSalvata[id] === true) {
            panou.classList.add("show");
            let buton = document.querySelector(`[data-bs-target="#${id}"]`);
            if (buton) {
                buton.classList.remove("collapsed");
                buton.setAttribute("aria-expanded", "true");
            }
        }

        // 2. Din acest punct incolo, ascultam evenimentele Bootstrap care spun exact cand un
        //    panou tocmai s-a deschis / s-a inchis, si salvam noua stare in localStorage.
        panou.addEventListener("shown.bs.collapse", function () {
            stareSalvata[id] = true;
            localStorage.setItem(CHEIE_STORAGE, JSON.stringify(stareSalvata));
        });

        panou.addEventListener("hidden.bs.collapse", function () {
            stareSalvata[id] = false;
            localStorage.setItem(CHEIE_STORAGE, JSON.stringify(stareSalvata));
        });
    });
});
