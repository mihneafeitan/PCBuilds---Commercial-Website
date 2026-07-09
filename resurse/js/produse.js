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
    if (panouFiltre && btnToggleFiltre) {
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
    }

    // BONUS 7: Eliminare Diacritice
    function eliminaDiacritice(text) {
        if(!text) return "";
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[șş]/g, "s")          
            .replace(/[țţ]/g, "t");         
    }

    function valideazaNume() {
        if (!inpNume) return true;
        if (regexCaractereInterzise.test(inpNume.value)) {
            inpNume.classList.add("is-invalid"); return false;
        } else {
            inpNume.classList.remove("is-invalid"); return true;
        }
    }

    function valideazaTextarea() {
        if (!txtDescriere) return true;
        if (regexCaractereInterzise.test(txtDescriere.value)) {
            txtDescriere.classList.add("is-invalid"); return false;
        } else {
            txtDescriere.classList.remove("is-invalid"); return true;
        }
    }

    if (rngPret && infoRange) {
        infoRange.textContent = `(0 - ${rngPret.value} RON)`;
        rngPret.addEventListener("input", function () {
            infoRange.textContent = `(0 - ${this.value} RON)`;
        });
    }

    // VERIFICARE PARAMETRU CATEGORIE URL PENTRU MENIU (REPARAT INTELIGENT PENTRU CORRESPONDENTA VALORI/ID)
    const params = new URLSearchParams(window.location.search);
    const paramCategorie = params.get("categorie");

    if (paramCategorie) {
        let radElement = document.querySelector(`input[name="gr_radio"][value="${paramCategorie}"]`) || 
                         document.querySelector(`input[name="gr_radio"][value="${paramCategorie.replace('_', ' ')}"]`) ||
                         document.getElementById(`rad-${paramCategorie}`);
        
        if (radElement) {
            radElement.checked = true;
            sessionStorage.setItem("filtru_categorie", radElement.value);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else if (sessionStorage.getItem("filtru_categorie")) {
        let catSalvata = sessionStorage.getItem("filtru_categorie");
        let radElement = document.querySelector(`input[name="gr_radio"][value="${catSalvata}"]`) || 
                         document.getElementById(`rad-${catSalvata}`);
        if (radElement) radElement.checked = true;
    }

    // RESTAURARE FILTRE DIN SESIUNE
    if (inpNume && sessionStorage.getItem("filtru_nume")) inpNume.value = sessionStorage.getItem("filtru_nume");
    if (txtDescriere && sessionStorage.getItem("filtru_descriere")) txtDescriere.value = sessionStorage.getItem("filtru_descriere");
    if (inpCuloare && sessionStorage.getItem("filtru_culoare")) inpCuloare.value = sessionStorage.getItem("filtru_culoare");
    if (inpGarantie && sessionStorage.getItem("filtru_garantie")) inpGarantie.value = sessionStorage.getItem("filtru_garantie");
    if (rngPret && sessionStorage.getItem("filtru_pret")) {
        rngPret.value = sessionStorage.getItem("filtru_pret");
        if(infoRange) infoRange.textContent = `(0 - ${rngPret.value} RON)`;
    }
    if (inpNou && sessionStorage.getItem("filtru_nou")) {
        inpNou.checked = sessionStorage.getItem("filtru_nou") === "true";
    }
    if (selectCompat && sessionStorage.getItem("filtru_compatibilitate")) {
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

        if ((!numeValid || !textareaValida) && labelStatistici) {
            labelStatistici.textContent = "Filtrare oprită: Caractere invalide detectate în casetele de text! (< > / \\ *)";
            return;
        }

        // Salvare in sesiune
        if(inpNume) sessionStorage.setItem("filtru_nume", inpNume.value);
        if(txtDescriere) sessionStorage.setItem("filtru_descriere", txtDescriere.value);
        if(inpCuloare) sessionStorage.setItem("filtru_culoare", inpCuloare.value);
        if(inpGarantie) sessionStorage.setItem("filtru_garantie", inpGarantie.value);
        if(rngPret) sessionStorage.setItem("filtru_pret", rngPret.value);
        if(inpNou) sessionStorage.setItem("filtru_nou", inpNou.checked);
        
        let radioChecked = document.querySelector('input[name="gr_radio"]:checked');
        let radCategorieSelected = radioChecked ? radioChecked.value : "toate";
        sessionStorage.setItem("filtru_categorie", radCategorieSelected);
        
        let optiuniSelectateCompat = selectCompat ? Array.from(selectCompat.selectedOptions).map(opt => opt.value) : [];
        sessionStorage.setItem("filtru_compatibilitate", JSON.stringify(optiuniSelectateCompat));

        let valNume = inpNume ? eliminaDiacritice(inpNume.value.toLowerCase()) : "";
        let valDescriere = txtDescriere ? eliminaDiacritice(txtDescriere.value.toLowerCase()) : "";
        let articole = document.getElementsByClassName("produs");
        let produseVizibile = 0;

        for (let art of articole) {
            art.style.display = "none"; 
            
            // 1. Nume
            let elementNume = art.querySelector(".val-nume") || art.querySelector(".nume");
            let textNume = elementNume ? elementNume.textContent.toLowerCase() : "";
            let numeArt = textNume ? eliminaDiacritice(textNume) : "";

            // 2. Preț
            let elementPret = art.querySelector(".val-pret") || art.querySelector(".pret");
            let pretArt = elementPret ? parseFloat(elementPret.textContent) : 0;

            // 3. Categorie
            let elementCategorie = art.querySelector(".val-categorie") || art.querySelector(".categorie");
            let categorieArt = elementCategorie ? elementCategorie.textContent.toLowerCase().trim() : "";

            // 4. Descriere
            let elementDescriere = art.querySelector(".val-descriere") || art.querySelector(".descriere");
            let textDescriere = elementDescriere ? elementDescriere.textContent.toLowerCase() : "";
            let descriereArt = textDescriere ? eliminaDiacritice(textDescriere) : "";

            // 5. Culoare
            let elementCuloare = art.querySelector(".val-culoare") || art.querySelector(".culoare");
            let culoareArt = elementCuloare ? elementCuloare.textContent.toLowerCase().trim() : "";

            // 6. Garanție
            let elementGarantie = art.querySelector(".val-garantie") || art.querySelector(".garantie");
            let garantieArt = elementGarantie ? parseInt(elementGarantie.textContent) : 0;

            // 7. Nou
            let elementNou = art.querySelector(".val-nou") || art.querySelector(".nou");
            let nouArt = elementNou ? elementNou.textContent.toLowerCase().trim() === "da" : false;

            // 8. Compatibilitate
            let elementCompat = art.querySelector(".val-compatibilitate") || art.querySelector(".compatibilitate");
            let compatArt = elementCompat ? elementCompat.textContent.toLowerCase() : "";

            // --- REPARARE FILTRARE DIRECTĂ CATEGORIE COMPATIBILĂ CU SPAȚIU/UNDERSCORE ---
            let condNume = numeArt.includes(valNume);
            let condDesc = descriereArt.includes(valDescriere);
            let condCuloare = (!inpCuloare || inpCuloare.value === "toate" || culoareArt === inpCuloare.value);
            let condGarantie = (!inpGarantie || garantieArt >= (parseInt(inpGarantie.value) || 0));
            let condPret = (!rngPret || pretArt <= parseFloat(rngPret.value));
            let condNou = (inpNou && inpNou.checked) ? (nouArt === true) : true;
            
            let condCateg = (radCategorieSelected === "toate" || 
                             categorieArt === radCategorieSelected || 
                             categorieArt === radCategorieSelected.replace('_', ' '));

            let condCompat = false;
            if (optiuniSelectateCompat.length === 0) { 
                condCompat = true; 
            } else {
                for (let opt of optiuniSelectateCompat) {
                    if (compatArt.includes(opt.toLowerCase())) { condCompat = true; break; }
                }
            }

            if (condNume && condDesc && condCuloare && condGarantie && condPret && condNou && condCateg && condCompat) {
                art.style.display = "block";
                produseVizibile++;
            }
        }

        if(labelStatistici) labelStatistici.textContent = `Afișăm ${produseVizibile} din ${articoleTotale} produse disponibile.`;

        let container = document.getElementById("container-produse") || document.querySelector(".grid-produse");
        if(container) {
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
        }
        
        marcheazaCelMaiIeftin();
    }

    if(inpNume) inpNume.addEventListener("input", filtreaza);
    if(txtDescriere) txtDescriere.addEventListener("input", filtreaza);
    if(rngPret) rngPret.addEventListener("input", filtreaza);
    if(inpCuloare) inpCuloare.addEventListener("change", filtreaza);
    if(inpGarantie) inpGarantie.addEventListener("input", filtreaza);
    if(inpNou) inpNou.addEventListener("change", filtreaza);
    if(selectCompat) selectCompat.addEventListener("change", filtreaza);
    
    let radioButtons = document.querySelectorAll('input[name="gr_radio"]');
    for(let radio of radioButtons) radio.addEventListener("change", filtreaza);
    
    let btnFiltrare = document.getElementById("btn-filtrare");
    if(btnFiltrare) btnFiltrare.onclick = filtreaza; 
    
    filtreaza();

    // =======================================================================
    // BONUS 8: SORTARE AVANSATĂ PE 2 CHEI + DIRECȚIE
    // =======================================================================
    function sortareAvansata(semn) {
        let sel1 = document.getElementById("sort-criteriu1");
        let sel2 = document.getElementById("sort-criteriu2");
        if(!sel1 || !sel2) return;

        let c1 = sel1.value;
        let c2 = sel2.value;
        
        let container = document.getElementById("container-produse") || document.querySelector(".grid-produse");
        if(!container) return;

        let articole = Array.from(document.getElementsByClassName("produs"));
        
        articole.sort((a, b) => {
            let elA1 = c1 === 'nume' ? a.querySelector('.val-nume') || a.querySelector('.nume') : a.querySelector(`.val-${c1}`);
            let elB1 = c1 === 'nume' ? b.querySelector('.val-nume') || b.querySelector('.nume') : b.querySelector(`.val-${c1}`);
            let valA1 = elA1 ? elA1.textContent : "";
            let valB1 = elB1 ? elB1.textContent : "";
            
            let elA2 = c2 === 'nume' ? a.querySelector('.val-nume') || a.querySelector('.nume') : a.querySelector(`.val-${c2}`);
            let elB2 = c2 === 'nume' ? b.querySelector('.val-nume') || b.querySelector('.nume') : b.querySelector(`.val-${c2}`);
            let valA2 = elA2 ? elA2.textContent : "";
            let valB2 = elB2 ? elB2.textContent : "";
            
            let rez1 = valA1.localeCompare(valB1, undefined, {numeric: true});
            if(rez1 !== 0) return semn * rez1;
            
            return semn * valA2.localeCompare(valB2, undefined, {numeric: true});
        });
        
        articole.forEach(art => container.appendChild(art));
        marcheazaCelMaiIeftin();
    }

    let btnSortAsc = document.getElementById("btn-sort-avansat-asc");
    if(btnSortAsc) btnSortAsc.onclick = () => sortareAvansata(1);
    
    let btnSortDesc = document.getElementById("btn-sort-avansat-desc");
    if(btnSortDesc) btnSortDesc.onclick = () => sortareAvansata(-1);

    
    // BONUS 14: CEL MAI IEFTIN PRODUS VIZIBIL DIN CATEGORIE 
    function marcheazaCelMaiIeftin() {
        document.querySelectorAll(".badge-ieftin").forEach(b => b.remove());
        let categorii = ["procesor", "placa_video", "placa_de_baza", "memorie", "sursa"];
        
        categorii.forEach(cat => {
            let produseCat = Array.from(document.getElementsByClassName("produs")).filter(p => {
                let catEl = p.querySelector(".val-categorie");
                return p.style.display !== "none" && catEl && catEl.textContent.toLowerCase() == cat.replace('_', ' ');
            });
            
            if(produseCat.length > 0) {
                let minProd = produseCat.reduce((prev, curr) => {
                    let pPret = prev.querySelector(".val-pret") ? parseFloat(prev.querySelector(".val-pret").textContent) : Infinity;
                    let cPret = curr.querySelector(".val-pret") ? parseFloat(curr.querySelector(".val-pret").textContent) : Infinity;
                    return (cPret < pPret) ? curr : prev;
                });
                
                let badge = document.createElement("span");
                badge.className = "badge bg-success badge-ieftin mt-2 d-block mx-auto";
                badge.style.width = "fit-content";
                badge.innerHTML = "<i class='fa-solid fa-star'></i> CEL MAI IEFTIN";
                
                let insertPoint = minProd.querySelector(".info-produs") || minProd;
                insertPoint.insertBefore(badge, insertPoint.firstChild);
            }
        });
    }

    let btnCalcul = document.getElementById("btn-calcul");
    if(btnCalcul) {
        btnCalcul.onclick = function () {
            if (!valideazaNume() || !valideazaTextarea()) { alert("Eroare de caractere."); return; }
            let articole = document.getElementsByClassName("produs");
            let suma = 0;
            for (let art of articole) {
                if (art.style.display !== "none") {
                    let pretEl = art.querySelector(".val-pret") || art.querySelector(".pret");
                    if(pretEl) suma += parseFloat(pretEl.textContent);
                }
            }
            let divInfo = document.createElement("div");
            divInfo.innerHTML = `<strong>Suma produselor afișate:</strong> <br> ${suma.toFixed(2)} RON`;
            divInfo.style.position = "fixed"; divInfo.style.bottom = "20px"; divInfo.style.right = "20px";
            divInfo.style.backgroundColor = "var(--primary-color, #007bff)"; divInfo.style.color = "white";
            divInfo.style.padding = "15px"; divInfo.style.borderRadius = "8px"; divInfo.style.zIndex = "1000";
            document.body.appendChild(divInfo);
            setTimeout(function () { divInfo.remove(); }, 2000);
        };
    }

    let btnReset = document.getElementById("btn-reset");
    if(btnReset) {
        btnReset.onclick = function () {
            if (confirm("Ești sigur că vrei să resetezi toate filtrele?")) {
                if(inpNume) inpNume.value = ""; 
                if(txtDescriere) txtDescriere.value = ""; 
                if(inpCuloare) inpCuloare.value = "toate"; 
                if(inpGarantie) inpGarantie.value = "";
                
                if(rngPret) {
                    let maxRange = rngPret.getAttribute("max");
                    rngPret.value = maxRange; 
                    if(infoRange) infoRange.textContent = `(0 - ${maxRange} RON)`;
                }
                
                if(inpNou) inpNou.checked = false; 
                let radToate = document.getElementById("rad-toate");
                if(radToate) radToate.checked = true;
                
                if(selectCompat) {
                    for (let opt of selectCompat.options) opt.selected = false;
                }
                sessionStorage.clear();
                filtreaza();
            }
        };
    }

    // =======================================================================
    // BONUS 20: COMPARARE (Stocare Locală)
    // =======================================================================
    const btnComparareList = document.querySelectorAll(".btn-comparare");
    const containerComparare = document.getElementById("container-comparare");
    const listaComparare = document.getElementById("produse-comparare-lista");
    const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");

    if(containerComparare && listaComparare && btnAfiseaza) {
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
                div.style.border = "1px solid var(--secondary-color, #ccc)"; div.style.borderRadius = "5px";
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
    }
});