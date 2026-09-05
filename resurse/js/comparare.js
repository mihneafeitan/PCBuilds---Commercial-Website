/**
 * @file comparare.js
 * Bonus 20: logica de comparare a produselor, mutată într-un fișier separat, încărcat pe
 * ORICE pagină (din head.ejs) — nu doar pe /produse — pentru că enunțul cere butonul "Compară"
 * atât în tabelul de produse, CÂT ȘI pe pagina fiecărui produs individual.
 * Widget-ul HTML corespunzător (#container-comparare) e acum în views/fragmente/footer.ejs,
 * deci prezent pe orice pagină, la fel ca acest script.
 */

document.addEventListener("DOMContentLoaded", function () {
    const containerComparare = document.getElementById("container-comparare");
    const listaComparare = document.getElementById("produse-comparare-lista");
    const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");

    if (!containerComparare || !listaComparare || !btnAfiseaza) return;

    let lastAction = localStorage.getItem("comparare-timestamp");
    if (lastAction && (new Date().getTime() - parseInt(lastAction) > 24 * 60 * 60 * 1000)) {
        localStorage.removeItem("produse-comparare");
        localStorage.removeItem("comparare-timestamp");
    }

    let comparare = JSON.parse(localStorage.getItem("produse-comparare")) || [];

    function salveazaComparare() {
        localStorage.setItem("produse-comparare", JSON.stringify(comparare));
        localStorage.setItem("comparare-timestamp", new Date().getTime().toString());
        randeazaComparare();
    }

    function randeazaComparare() {
        let btnComparareList = document.querySelectorAll(".btn-comparare"); // interogare live
        listaComparare.innerHTML = "";

        if (comparare.length === 0) {
            containerComparare.style.display = "none";
            btnComparareList.forEach(btn => {
                btn.disabled = false; btn.title = ""; btn.innerHTML = '<i class="fa-solid fa-scale-balanced"></i> Compară';
            });
            return;
        }

        containerComparare.style.display = "block";

        comparare.forEach((prod, index) => {
            let div = document.createElement("div");
            div.className = "d-flex justify-content-between align-items-center mb-2 p-2";
            div.style.border = "1px solid var(--secondary-color, #ccc)"; div.style.borderRadius = "5px";
            div.innerHTML = `<span style="font-size: 0.9em; font-weight: bold; color: var(--text-color);">${prod.nume}</span>
                <button class="btn btn-sm btn-danger btn-sterge-comp" data-index="${index}" title="Șterge produsul"><i class="fa-solid fa-trash"></i></button>`;
            listaComparare.appendChild(div);
        });

        document.querySelectorAll(".btn-sterge-comp").forEach(btn => {
            btn.onclick = function () {
                comparare.splice(parseInt(this.getAttribute("data-index")), 1);
                salveazaComparare();
            };
        });

        if (comparare.length === 2) {
            btnAfiseaza.style.display = "block";
            btnComparareList.forEach(btn => { btn.disabled = true; btn.title = "ștergeți un produs din lista de comparare"; });
        } else {
            btnAfiseaza.style.display = "none";
            btnComparareList.forEach(btn => {
                if (comparare.find(p => p.id === btn.getAttribute("data-id"))) {
                    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-check"></i> Selectat'; btn.title = "Acest produs este deja în lista de comparare.";
                } else {
                    btn.disabled = false; btn.title = ""; btn.innerHTML = '<i class="fa-solid fa-scale-balanced"></i> Compară';
                }
            });
        }
    }

    /**
     * Atașează click-ul de "adaugă la comparare" pe butoanele .btn-comparare găsite în scopeEl.
     * Expusă global (window.__pcbuilds.initBtnComparare) ca produse.js s-o poată re-apela pentru
     * cardurile generate dinamic de Bonus 10 (filtrare pe server + fetch).
     * @param {Element|Document} [scopeEl] - elementul în care căutăm butoanele; implicit tot documentul
     * @returns {void}
     */
    function initBtnComparare(scopeEl) {
        (scopeEl || document).querySelectorAll(".btn-comparare").forEach(btn => {
            btn.onclick = function () {
                if (comparare.length < 2) {
                    comparare.push({ id: this.getAttribute("data-id"), nume: this.getAttribute("data-nume") });
                    salveazaComparare();
                }
            };
        });
        randeazaComparare(); // sincronizeaza starea disabled/selectat pt butoanele noi
    }

    btnAfiseaza.onclick = function () {
        if (comparare.length === 2) window.open('/compara/' + comparare[0].id + '/' + comparare[1].id, '_blank');
    };

    initBtnComparare(document);

    window.__pcbuilds = window.__pcbuilds || {};
    window.__pcbuilds.initBtnComparare = initBtnComparare;
});
