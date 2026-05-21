document.addEventListener("DOMContentLoaded", function () {
    
    // Conectare elemente HTML
    const panouFiltre = document.getElementById("filtre-produse");
    const btnToggleFiltre = document.getElementById("btn-toggle-filtre");

    const inpNume = document.getElementById("inp-nume");
    const txtDescriere = document.getElementById("inp-descriere");
    const rngPret = document.getElementById("inp-pret");
    const infoRange = document.getElementById("infoRange");
    const inpCuloare = document.getElementById("inp-culoare");
    const inpGarantie = document.getElementById("inp-garantie");
    const inpNou = document.getElementById("inp-nou");
    const selectCompat = document.getElementById("inp-compatibilitate");
    
    const labelStatistici = document.getElementById("statistici-produse");
    const articoleTotale = document.getElementsByClassName("produs").length;

    const regexCaractereInterzise = /[<>\/\\*]/g;

    // Gestiune Vizibilitate Panou Filtre (LocalStorage)
    let starePanou = localStorage.getItem("panou-filtre-vizibil");
    if (starePanou === "ascuns") {
        panouFiltre.style.display = "none";
        btnToggleFiltre.innerHTML = '<i class="fa-solid fa-eye"></i> Arată Panoul de Filtre';
    }

    btnToggleFiltre.onclick = function() {
        if (panouFiltre.style.display === "none") {
            panouFiltre.style.display = "block";
            this.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ascunde Panoul de Filtre';
            localStorage.setItem("panou-filtre-vizibil", "deschis");
        } else {
            panouFiltre.style.display = "none";
            this.innerHTML = '<i class="fa-solid fa-eye"></i> Arată Panoul de Filtre';
            localStorage.setItem("panou-filtre-vizibil", "ascuns");
        }
    };

    // =======================================================================
    // BONUS 7: Eliminare Diacritice
    // =======================================================================
    function eliminaDiacritice(text) {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[șş]/g, "s")          
            .replace(/[țţ]/g, "t");         
    }

    function valideazaNume() {
        if (regexCaractereInterzise.test(inpNume.value)) {
            inpNume.classList.add("is-invalid"); return false;
        } else {
            inpNume.classList.remove("is-invalid"); return true;
        }
    }

    function valideazaTextarea() {
        if (regexCaractereInterzise.test(txtDescriere.value)) {
            txtDescriere.classList.add("is-invalid"); return false;
        } else {
            txtDescriere.classList.remove("is-invalid"); return true;
        }
    }

    infoRange.textContent = `(0 - ${rngPret.value} RON)`;
    rngPret.addEventListener("input", function () {
        infoRange.textContent = `(0 - ${this.value} RON)`;
    });

    // VERIFICARE PARAMETRU CATEGORIE URL PENTRU MENIU
    const params = new URLSearchParams(window.location.search);
    const paramCategorie = params.get("categorie");

    if (paramCategorie) {
        let radElement = document.getElementById(`rad-${paramCategorie}`);
        if (radElement) {
            radElement.checked = true;
            sessionStorage.setItem("filtru_categorie", paramCategorie);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else if (sessionStorage.getItem("filtru_categorie")) {
        let catSalvata = sessionStorage.getItem("filtru_categorie");
        let radElement = document.getElementById(`rad-${catSalvata}`);
        if (radElement) radElement.checked = true;
    }

    // RESTAURARE FILTRE DIN SESIUNE
    if (sessionStorage.getItem("filtru_nume")) inpNume.value = sessionStorage.getItem("filtru_nume");
    if (sessionStorage.getItem("filtru_descriere")) txtDescriere.value = sessionStorage.getItem("filtru_descriere");
    if (sessionStorage.getItem("filtru_culoare")) inpCuloare.value = sessionStorage.getItem("filtru_culoare");
    if (sessionStorage.getItem("filtru_garantie")) inpGarantie.value = sessionStorage.getItem("filtru_garantie");
    if (sessionStorage.getItem("filtru_pret")) {
        rngPret.value = sessionStorage.getItem("filtru_pret");
        infoRange.textContent = `(0 - ${rngPret.value} RON)`;
    }
    if (sessionStorage.getItem("filtru_nou")) {
        inpNou.checked = sessionStorage.getItem("filtru_nou") === "true";
    }
    if (sessionStorage.getItem("filtru_compatibilitate")) {
        let vectorCompat = JSON.parse(sessionStorage.getItem("filtru_compatibilitate"));
        for (let opt of selectCompat.options) {
            if (vectorCompat.includes(opt.value)) opt.selected = true;
        }
    }

    // =======================================================================
    // FUNCȚIA PRINCIPALĂ DE FILTRARE
    // =======================================================================
    function filtreaza() {
        let numeValid = valideazaNume();
        let textareaValida = valideazaTextarea();

        if (!numeValid || !textareaValida) {
            labelStatistici.textContent = "Filtrare oprită: Caractere invalide detectate în casetele de text! (< > / \\ *)";
            return;
        }

        // Salvare in sesiune
        sessionStorage.setItem("filtru_nume", inpNume.value);
        sessionStorage.setItem("filtru_descriere", txtDescriere.value);
        sessionStorage.setItem("filtru_culoare", inpCuloare.value);
        sessionStorage.setItem("filtru_garantie", inpGarantie.value);
        sessionStorage.setItem("filtru_pret", rngPret.value);
        sessionStorage.setItem("filtru_nou", inpNou.checked);
        let radCategorieSelected = document.querySelector('input[name="gr_radio"]:checked').value;
        sessionStorage.setItem("filtru_categorie", radCategorieSelected);
        let optiuniSelectateCompat = Array.from(selectCompat.selectedOptions).map(opt => opt.value);
        sessionStorage.setItem("filtru_compatibilitate", JSON.stringify(optiuniSelectateCompat));

        let valNume = eliminaDiacritice(inpNume.value.toLowerCase());
        let valDescriere = eliminaDiacritice(txtDescriere.value.toLowerCase());
        let articole = document.getElementsByClassName("produs");
        let produseVizibile = 0;

        for (let art of articole) {
            art.style.display = "none"; 
            let numeArt = eliminaDiacritice(art.querySelector(".nume").textContent.toLowerCase());
            let descriereArt = eliminaDiacritice(art.querySelector(".descriere").textContent.toLowerCase());
            let categorieArt = art.querySelector(".val-categorie").textContent.toLowerCase();
            let pretArt = parseFloat(art.querySelector(".val-pret").textContent);
            let garantieArt = parseInt(art.querySelector(".val-garantie").textContent);
            let culoareArt = art.querySelector(".val-culoare").textContent;
            let compatArt = art.querySelector(".val-compatibilitate").textContent; 
            let nouArt = art.querySelector(".val-nou").textContent === "Produs Nou"; 

            let condNume = numeArt.includes(valNume);
            let condDesc = descriereArt.includes(valDescriere);
            let condCuloare = (inpCuloare.value === "toate" || culoareArt === inpCuloare.value);
            let condGarantie = (garantieArt >= (parseInt(inpGarantie.value) || 0));
            let condPret = (pretArt <= parseFloat(rngPret.value));
            let condNou = inpNou.checked ? (nouArt === true) : true;
            let condCateg = (radCategorieSelected === "toate" || categorieArt === radCategorieSelected.replace('_', ' '));

            let condCompat = false;
            if (optiuniSelectateCompat.length === 0) { condCompat = true; } 
            else {
                for (let opt of optiuniSelectateCompat) {
                    if (compatArt.includes(opt)) { condCompat = true; break; }
                }
            }

            if (condNume && condDesc && condCuloare && condGarantie && condPret && condNou && condCateg && condCompat) {
                art.style.display = "block";
                produseVizibile++;
            }
        }

        labelStatistici.textContent = `Afișăm ${produseVizibile} din ${articoleTotale} produse disponibile.`;

        // =======================================================================
        // BONUS 3: Mesaj dacă nu există produse la filtrare
        // =======================================================================
        let container = document.getElementById("container-produse");
        let mesaj = document.getElementById("mesaj-lipsa");
        if (produseVizibile === 0) {
            if (!mesaj) {
                mesaj = document.createElement("p");
                mesaj.id = "mesaj-lipsa";
                mesaj.textContent = "Nu există produse conform filtrării curente.";
                mesaj.style.color = "var(--accent-color)"; mesaj.style.fontSize = "1.2rem";
                mesaj.style.fontWeight = "bold"; mesaj.style.gridColumn = "1 / -1";
                mesaj.style.textAlign = "center";
                container.appendChild(mesaj);
            }
        } else if (mesaj) { mesaj.remove(); }
        
        // Reapelam marcarea celui mai ieftin
        marcheazaCelMaiIeftin();
    }

    // =======================================================================
    // BONUS 4: Filtrare Automată la Eventimente (onchange/oninput)
    // =======================================================================
    inpNume.addEventListener("input", filtreaza);
    txtDescriere.addEventListener("input", filtreaza);
    rngPret.addEventListener("input", filtreaza);
    inpCuloare.addEventListener("change", filtreaza);
    inpGarantie.addEventListener("input", filtreaza);
    inpNou.addEventListener("change", filtreaza);
    selectCompat.addEventListener("change", filtreaza);
    let radioButtons = document.querySelectorAll('input[name="gr_radio"]');
    for(let radio of radioButtons) radio.addEventListener("change", filtreaza);
    
    document.getElementById("btn-filtrare").onclick = filtreaza; // Pastram butonul de back-up
    
    // Executam filtrarea la încărcarea paginii
    filtreaza();

    // =======================================================================
    // BONUS 8: SORTARE AVANSATĂ PE 2 CHEI + DIRECȚIE (Crescător / Descrescător)
    // =======================================================================
    function sortareAvansata(semn) {
        let c1 = document.getElementById("sort-criteriu1").value;
        let c2 = document.getElementById("sort-criteriu2").value;
        
        let container = document.getElementById("container-produse");
        let articole = Array.from(document.getElementsByClassName("produs"));
        
        articole.sort((a, b) => {
            let valA1 = c1 === 'nume' ? a.querySelector('.nume').textContent : a.querySelector(`.val-${c1}`).textContent;
            let valB1 = c1 === 'nume' ? b.querySelector('.nume').textContent : b.querySelector(`.val-${c1}`).textContent;
            
            let valA2 = c2 === 'nume' ? a.querySelector('.nume').textContent : a.querySelector(`.val-${c2}`).textContent;
            let valB2 = c2 === 'nume' ? b.querySelector('.nume').textContent : b.querySelector(`.val-${c2}`).textContent;
            
            // Comparație pe cheia 1 (ținând cont de direcția 'semn')
            let rez1 = valA1.localeCompare(valB1, undefined, {numeric: true});
            if(rez1 !== 0) return semn * rez1;
            
            // Dacă sunt egale, comparație pe cheia 2
            return semn * valA2.localeCompare(valB2, undefined, {numeric: true});
        });
        
        // Reatașăm elementele în DOM
        articole.forEach(art => container.appendChild(art));
        marcheazaCelMaiIeftin();
    }

    // Atașare Evenimente pe Butoanele Crescător / Descrescător
    document.getElementById("btn-sort-avansat-asc").onclick = () => sortareAvansata(1);
    document.getElementById("btn-sort-avansat-desc").onclick = () => sortareAvansata(-1);

    // =======================================================================
    // BONUS 14: CEL MAI IEFTIN PRODUS VIZIBIL DIN CATEGORIE
    // =======================================================================
    function marcheazaCelMaiIeftin() {
        document.querySelectorAll(".badge-ieftin").forEach(b => b.remove());
        let categorii = ["procesor", "placa_video", "placa_de_baza", "memorie", "sursa"];
        
        categorii.forEach(cat => {
            let produseCat = Array.from(document.getElementsByClassName("produs")).filter(p => 
                p.style.display !== "none" && p.querySelector(".val-categorie").textContent.toLowerCase() == cat.replace('_', ' ')
            );
            
            if(produseCat.length > 0) {
                let minProd = produseCat.reduce((prev, curr) => 
                    parseFloat(curr.querySelector(".val-pret").textContent) < parseFloat(prev.querySelector(".val-pret").textContent) ? curr : prev
                );
                
                let badge = document.createElement("span");
                badge.className = "badge bg-success badge-ieftin mt-2 d-block mx-auto";
                badge.style.width = "fit-content";
                badge.innerHTML = "<i class='fa-solid fa-star'></i> CEL MAI IEFTIN";
                minProd.querySelector(".info-produs").insertBefore(badge, minProd.querySelector("ul"));
            }
        });
    }

    // Calcul Suma
    document.getElementById("btn-calcul").onclick = function () {
        if (!valideazaNume() || !valideazaTextarea()) { alert("Eroare de caractere."); return; }
        let articole = document.getElementsByClassName("produs");
        let suma = 0;
        for (let art of articole) {
            if (art.style.display !== "none") suma += parseFloat(art.querySelector(".val-pret").textContent);
        }
        let divInfo = document.createElement("div");
        divInfo.innerHTML = `<strong>Suma produselor afișate:</strong> <br> ${suma.toFixed(2)} RON`;
        divInfo.style.position = "fixed"; divInfo.style.bottom = "20px"; divInfo.style.right = "20px";
        divInfo.style.backgroundColor = "var(--primary-color)"; divInfo.style.color = "white";
        divInfo.style.padding = "15px"; divInfo.style.borderRadius = "8px"; divInfo.style.zIndex = "1000";
        document.body.appendChild(divInfo);
        setTimeout(function () { divInfo.remove(); }, 2000);
    };

    // Resetare Filtre
    document.getElementById("btn-reset").onclick = function () {
        if (confirm("Ești sigur că vrei să resetezi toate filtrele?")) {
            inpNume.value = ""; txtDescriere.value = ""; inpCuloare.value = "toate"; inpGarantie.value = "";
            let maxRange = rngPret.getAttribute("max");
            rngPret.value = maxRange; infoRange.textContent = `(0 - ${maxRange} RON)`;
            inpNou.checked = true; document.getElementById("rad-toate").checked = true;
            for (let opt of selectCompat.options) opt.selected = false;
            sessionStorage.clear();
            filtreaza();
        }
    };

    // =======================================================================
    // BONUS 20: COMPARARE (Stocare Locală)
    // =======================================================================
    const btnComparareList = document.querySelectorAll(".btn-comparare");
    const containerComparare = document.getElementById("container-comparare");
    const listaComparare = document.getElementById("produse-comparare-lista");
    const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");

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
            div.style.border = "1px solid var(--secondary-color)"; div.style.borderRadius = "5px";
            div.innerHTML = `<span style="font-size: 0.9em; font-weight: bold; color: var(--text-color);">${prod.nume}</span>
                <button class="btn btn-sm btn-danger btn-sterge-comp" data-index="${index}" title="Șterge produsul"><i class="fa-solid fa-trash"></i></button>`;
            listaComparare.appendChild(div);
        });

        document.querySelectorAll(".btn-sterge-comp").forEach(btn => {
            btn.onclick = function() {
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

    btnComparareList.forEach(btn => {
        btn.onclick = function() {
            if (comparare.length < 2) {
                comparare.push({ id: this.getAttribute("data-id"), nume: this.getAttribute("data-nume") });
                salveazaComparare();
            }
        };
    });

    btnAfiseaza.onclick = function() {
        if (comparare.length === 2) window.open('/compara/' + comparare[0].id + '/' + comparare[1].id, '_blank');
    };

    randeazaComparare();
});