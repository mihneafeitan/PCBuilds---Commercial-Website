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

    // =======================================================================
    // BONUS 6 (Etapa 6): stare pentru cele 3 butoane per produs
    // - produsePastrate: id-uri "pinned", raman vizibile mereu, indiferent de filtrare
    // - produseAscunseSesiune: id-uri ascunse definitiv pt tab-ul curent (sessionStorage)
    // (ascunderea temporara - buton 2 - nu are nevoie de stare: se aplica direct pe DOM
    //  si dispare de la sine la urmatoarea filtrare/sortare/resetare)
    // =======================================================================
    let produsePastrate = new Set();
    let produseAscunseSesiune = new Set(JSON.parse(sessionStorage.getItem("produse-ascunse-sesiune") || "[]"));

    // BONUS 5 (Etapa 6): Paginare - K produse fixe pe pagina
    const K_PRODUSE_PAGINA = 9;
    let paginaCurenta = 1;

    function salveazaAscunseSesiune() {
        sessionStorage.setItem("produse-ascunse-sesiune", JSON.stringify(Array.from(produseAscunseSesiune)));
    }

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

    // RESTAURARE FILTRE DIN SESIUNE (sessionStorage), cu fallback pe COOKIE-ul de la Etapa 7
    // ("ultimele filtre setate") daca sessionStorage e gol (ex: tab nou, browser repornit)
    let filtreDinCookie = {};
    if (typeof getCookie === "function") {
        try { filtreDinCookie = JSON.parse(getCookie("ultimele_filtre_setate") || "null") || {}; }
        catch (e) { filtreDinCookie = {}; }
    }

    if (inpNume) inpNume.value = sessionStorage.getItem("filtru_nume") ?? filtreDinCookie.nume ?? inpNume.value;
    if (txtDescriere) txtDescriere.value = sessionStorage.getItem("filtru_descriere") ?? filtreDinCookie.descriere ?? txtDescriere.value;
    if (inpCuloare) inpCuloare.value = sessionStorage.getItem("filtru_culoare") ?? filtreDinCookie.culoare ?? inpCuloare.value;
    if (inpGarantie) inpGarantie.value = sessionStorage.getItem("filtru_garantie") ?? filtreDinCookie.garantie ?? inpGarantie.value;
    if (rngPret) {
        rngPret.value = sessionStorage.getItem("filtru_pret") ?? filtreDinCookie.pretMax ?? rngPret.value;
        if(infoRange) infoRange.textContent = `(0 - ${rngPret.value} RON)`;
    }
    if (inpNou) {
        let valNou = sessionStorage.getItem("filtru_nou") ?? (filtreDinCookie.nou !== undefined ? String(filtreDinCookie.nou) : null);
        if (valNou !== null) inpNou.checked = valNou === "true";
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
        paginaCurenta = 1; // BONUS 5: la orice filtrare noua, revenim la prima pagina
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

        // ETAPA 7: salvam si intr-un COOKIE ultimele filtre setate (spre deosebire de
        // sessionStorage, cookie-ul supravietuieste si dupa ce inchizi tot browserul)
        if (typeof setCookie === "function") {
            setCookie("ultimele_filtre_setate", JSON.stringify({
                nume: inpNume ? inpNume.value : "",
                descriere: txtDescriere ? txtDescriere.value : "",
                culoare: inpCuloare ? inpCuloare.value : "",
                garantie: inpGarantie ? inpGarantie.value : "",
                pretMax: rngPret ? rngPret.value : "",
                nou: inpNou ? inpNou.checked : false,
                categorie: radCategorieSelected
            }), 30 * 24 * 60 * 60); // 30 de zile
        }

        let valNume = inpNume ? eliminaDiacritice(inpNume.value.toLowerCase()) : "";
        let valDescriere = txtDescriere ? eliminaDiacritice(txtDescriere.value.toLowerCase()) : "";
        let articole = document.getElementsByClassName("produs");
        let produseVizibile = 0;

        for (let art of articole) {
            art.style.display = "none"; 
            art.classList.remove("filtru-ok"); // BONUS 5: resetam marcajul de "trece de filtru" inainte de reevaluare

            // BONUS 6, buton 3: produsele ascunse pe sesiune nu se mai afiseaza niciodata
            // (pana la inchiderea tab-ului), indiferent de filtrare
            let idArt = art.getAttribute("data-id");
            if (produseAscunseSesiune.has(idArt)) {
                continue;
            }
            
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

            // BONUS 6, buton 1: produsele "pastrate" raman vizibile chiar daca nu s-ar potrivi filtrarii
            let estePastrat = produsePastrate.has(idArt);

            // BONUS 5: aici doar marcam ca produsul "trece" de filtrare; afisarea efectiva
            // (display block/none) e decisa de aplicaPaginare(), in functie de pagina curenta
            if (estePastrat || (condNume && condDesc && condCuloare && condGarantie && condPret && condNou && condCateg && condCompat)) {
                art.classList.add("filtru-ok");
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
        
        aplicaPaginare(); // BONUS 5: aplica taierea pe pagini peste rezultatul filtrarii
        marcheazaCelMaiIeftin();
    }

    // =======================================================================
    // BONUS 5 (Etapa 6): PAGINARE
    // =======================================================================
    function aplicaPaginare() {
        let containerPaginare = document.getElementById("paginare-produse");
        let produseFiltrate = Array.from(document.querySelectorAll(".produs.filtru-ok"));
        let N = produseFiltrate.length;
        let NRL = Math.max(1, Math.ceil(N / K_PRODUSE_PAGINA));

        if (paginaCurenta > NRL) paginaCurenta = NRL;
        if (paginaCurenta < 1) paginaCurenta = 1;

        // Afisam doar produsele din intervalul [(P-1)*K, P*K - 1]
        produseFiltrate.forEach(function (art, index) {
            let inPaginaCurenta = index >= (paginaCurenta - 1) * K_PRODUSE_PAGINA && index < paginaCurenta * K_PRODUSE_PAGINA;
            art.style.display = inPaginaCurenta ? "block" : "none";
        });

        if (!containerPaginare) return;
        containerPaginare.innerHTML = "";

        if (NRL <= 1) return; // nu afisam paginarea daca incape totul pe o singura pagina

        for (let p = 1; p <= NRL; p++) {
            let li = document.createElement("li");
            li.className = "page-item" + (p === paginaCurenta ? " active" : "");
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "page-link";
            btn.textContent = p;
            btn.onclick = function () {
                paginaCurenta = p;
                aplicaPaginare();
                marcheazaCelMaiIeftin();
                document.getElementById("filtre-produse")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            };
            li.appendChild(btn);
            containerPaginare.appendChild(li);
        }
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

        // BONUS 6, buton 2: la o noua sortare, produsele ascunse temporar reapar
        // (recalculam vizibilitatea completa pe baza filtrelor curente, apoi sortam)
        filtreaza();

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
                // BONUS 5: folosim "filtru-ok" (tot ce a trecut de filtrare), nu doar pagina curenta afisata
                return p.classList.contains("filtru-ok") && catEl && catEl.textContent.toLowerCase() == cat.replace('_', ' ');
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

    // =======================================================================
    // BONUS 6 (Etapa 6): handler-ele pentru cele 3 butoane per produs
    // Functie reutilizabila: se aplica si pe cardurile initiale (SSR), si pe cele
    // generate dinamic de Bonus 10 (filtrare server-side + fetch), primind un scope.
    // =======================================================================
    function initButoaneBonus6(scopeEl) {
        (scopeEl || document).querySelectorAll(".butoane-bonus6").forEach(function (grup) {
            let idProd = grup.getAttribute("data-id");
            let art = document.getElementById("artc-" + idProd);
            let btnPastreaza = grup.querySelector(".btn-pastreaza");
            let btnAscundeTemp = grup.querySelector(".btn-ascunde-temp");
            let btnAscundeSesiune = grup.querySelector(".btn-ascunde-sesiune");

            // Buton 1: pastreaza produsul mereu vizibil (toggle)
            if (btnPastreaza) {
                btnPastreaza.onclick = function () {
                    if (produsePastrate.has(idProd)) {
                        produsePastrate.delete(idProd);
                        btnPastreaza.classList.remove("btn-warning");
                        btnPastreaza.classList.add("btn-outline-warning");
                        if (art) art.style.outline = "";
                    } else {
                        produsePastrate.add(idProd);
                        btnPastreaza.classList.remove("btn-outline-warning");
                        btnPastreaza.classList.add("btn-warning");
                        if (art) art.style.outline = "3px solid var(--accent-color)";
                    }
                    filtreaza();
                };
            }

            // Buton 2: ascunde produsul din afisarea curenta (reapare la noua filtrare/sortare/resetare)
            if (btnAscundeTemp) {
                btnAscundeTemp.onclick = function () {
                    if (art) art.style.display = "none";
                };
            }

            // Buton 3: ascunde produsul definitiv pt sesiunea curenta (sessionStorage, per tab)
            if (btnAscundeSesiune) {
                btnAscundeSesiune.onclick = function () {
                    produseAscunseSesiune.add(idProd);
                    salveazaAscunseSesiune();
                    if (art) art.style.display = "none";
                };
            }

            // Reflecta in UI starea "pastrat" daca a fost setata anterior in aceasta sesiune de vizionare
            if (produsePastrate.has(idProd) && btnPastreaza) {
                btnPastreaza.classList.remove("btn-outline-warning");
                btnPastreaza.classList.add("btn-warning");
            }
        });
    }
    initButoaneBonus6(document);

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
                // Resetam doar filtrele din sesiune; produsele ascunse pe sesiune (Bonus 6, buton 3)
                // trebuie sa ramana ascunse pana la inchiderea tab-ului, nu la resetarea filtrelor.
                let ascunseSalvate = sessionStorage.getItem("produse-ascunse-sesiune");
                sessionStorage.clear();
                if (ascunseSalvate) sessionStorage.setItem("produse-ascunse-sesiune", ascunseSalvate);
                filtreaza();
            }
        };
    }

    // =======================================================================
    // BONUS 11 (Etapa 6): Modal box la click pe containerul produsului
    // Functie reutilizabila, aplicata si pe cardurile generate de Bonus 10.
    // =======================================================================
    const modalProdusEl = document.getElementById("modalProdus");
    const instantaModal = (modalProdusEl && window.bootstrap) ? new bootstrap.Modal(modalProdusEl) : null;

    function initModalProduse(scopeEl) {
        if (!instantaModal) return;
        (scopeEl || document).querySelectorAll(".produs").forEach(function (art) {
            art.style.cursor = "pointer";
            art.addEventListener("click", function (e) {
                // Nu deschidem modalul daca s-a dat click pe un buton sau link din interiorul cardului
                if (e.target.closest("button, a")) return;

                let idProd = art.getAttribute("data-id");
                let getTxt = (sel) => art.querySelector(sel) ? art.querySelector(sel).textContent.trim() : "";
                let img = art.querySelector("img");

                document.getElementById("modalProdusLabel").textContent = getTxt(".nume");
                document.getElementById("modal-img").src = img ? img.src : "";
                document.getElementById("modal-img").alt = getTxt(".nume");
                document.getElementById("modal-descriere").textContent = getTxt(".descriere");
                document.getElementById("modal-categorie").textContent = getTxt(".val-categorie");
                document.getElementById("modal-pret").textContent = getTxt(".val-pret");
                document.getElementById("modal-garantie").textContent = getTxt(".val-garantie");
                document.getElementById("modal-culoare").textContent = getTxt(".val-culoare");
                document.getElementById("modal-compatibilitate").textContent = getTxt(".val-compatibilitate");
                document.getElementById("modal-nou").textContent = getTxt(".val-nou");
                document.getElementById("modal-link-produs").href = "/produs/" + idProd;

                instantaModal.show();
            });
        });
    }
    initModalProduse(document);

    // =======================================================================
    // BONUS 20: COMPARARE — mutată în resurse/js/comparare.js (fișier global, încărcat pe
    // orice pagină din head.ejs), pentru că butonul "Compară" trebuie să existe și pe pagina
    // fiecărui produs individual, nu doar în tabelul de produse.
    // Aici doar expunem un "reinitCarduri" pentru cardurile noi generate de Bonus 10, care
    // cheamă mai departe initButoaneBonus6 + initModalProduse (locale acestui fisier) și
    // window.__pcbuilds.initBtnComparare (functia globala din comparare.js).
    // =======================================================================
    window.__pcbuilds = window.__pcbuilds || {};
    window.__pcbuilds.reinitCarduri = function (scopeEl) {
        initButoaneBonus6(scopeEl);
        initModalProduse(scopeEl);
        if (window.__pcbuilds.initBtnComparare) window.__pcbuilds.initBtnComparare(scopeEl);
    };

    // =======================================================================
    // BONUS 10a + 10b (Etapa 6): Filtrare si sortare pe server, prin fetch()
    // Refoloseste aceleasi campuri de filtrare din formular; construieste cardurile
    // din raspunsul JSON si reataseaza comportamentele Bonus 6 / 11 / 20.
    // =======================================================================
    function construiesteCardProdus(p) {
        let dataFormatata = new Intl.DateTimeFormat('ro-RO', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).format(new Date(p.data_adaugare));
        let categorieAfisata = (p.categorie || "").replace('_', ' ');

        return `
        <article class="produs" id="artc-${p.id}" data-id="${p.id}" style="background-color: var(--bg-color-alt); border: 1px solid var(--secondary-color); border-radius: 8px; padding: 15px; position: relative;">
            <h3 class="nume" style="text-align: center; margin-bottom: 15px;">
                <a href="/produs/${p.id}" style="color: var(--primary-color); text-decoration: none;">${p.nume}</a>
            </h3>
            <div class="info-produs">
                <picture style="display: block; width: 100%; text-align: center; margin-bottom: 15px;">
                    <img src="/resurse/imagini/${p.imagine}" alt="${p.nume}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                </picture>
                <p class="descriere" style="font-size: 0.9em; margin-bottom: 15px; text-align: justify;">${p.descriere}</p>
                <ul style="list-style-type: none; padding-left: 0; font-size: 0.9em; display: flex; flex-direction: column; gap: 8px;">
                    <li><span style="color: var(--accent-color); font-weight: bold;">Categorie:</span> <span class="val-categorie">${categorieAfisata}</span></li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Preț:</span> <span class="val-pret">${p.pret}</span> RON</li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Garanție:</span> <span class="val-garantie">${p.garantie_luni}</span> luni</li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Culoare:</span> <span class="val-culoare">${p.culoare}</span></li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Compatibilitate:</span> <span class="val-compatibilitate">${p.compatibilitate}</span></li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Stare:</span> <span class="val-nou">${p.nou ? 'Produs Nou' : 'Resigilat'}</span></li>
                    <li><span style="color: var(--accent-color); font-weight: bold;">Adăugat la:</span> <time class="val-data" datetime="${p.data_adaugare}">${dataFormatata}</time></li>
                </ul>
                <div class="mt-3 text-center">
                    <button class="btn btn-sm btn-outline-info btn-comparare w-100" data-id="${p.id}" data-nume="${p.nume}">
                        <i class="fa-solid fa-scale-balanced"></i> Compară
                    </button>
                </div>
                <div class="mt-2 d-flex justify-content-center gap-2 butoane-bonus6" data-id="${p.id}">
                    <button type="button" class="btn btn-sm btn-outline-warning btn-pastreaza" title="Păstrează acest produs mereu vizibil"><i class="fa-solid fa-thumbtack"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary btn-ascunde-temp" title="Ascunde temporar produsul"><i class="fa-solid fa-eye-slash"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-ascunde-sesiune" title="Ascunde produsul pe durata sesiunii curente"><i class="fa-solid fa-ban"></i></button>
                </div>
            </div>
        </article>`;
    }

    function filtreazaPeServer(directie) {
        let statusServer = document.getElementById("status-server");
        let container = document.getElementById("container-produse");
        if (!container) return;
        if (!valideazaNume() || !valideazaTextarea()) {
            if (statusServer) statusServer.textContent = "Caractere invalide detectate în casetele de text.";
            return;
        }

        let radioChecked = document.querySelector('input[name="gr_radio"]:checked');
        let optiuniSelectateCompat = selectCompat ? Array.from(selectCompat.selectedOptions).map(o => o.value) : [];
        let sel1 = document.getElementById("sort-criteriu1");
        let sel2 = document.getElementById("sort-criteriu2");

        let parametri = new URLSearchParams({
            nume: inpNume ? inpNume.value : '',
            descriere: txtDescriere ? txtDescriere.value : '',
            culoare: inpCuloare ? inpCuloare.value : 'toate',
            garantie: inpGarantie ? inpGarantie.value : '',
            pretMax: rngPret ? rngPret.value : '',
            nou: (inpNou && inpNou.checked) ? 'true' : 'false',
            categorie: radioChecked ? radioChecked.value : 'toate',
            compatibilitate: optiuniSelectateCompat.join(','),
            sort1: sel1 ? sel1.value : '',
            sort2: sel2 ? sel2.value : '',
            directie: directie
        });

        if (statusServer) statusServer.textContent = "Se încarcă de pe server...";

        fetch('/api/produse/filtreaza?' + parametri.toString())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.eroare) { throw new Error(data.eroare); }

                container.innerHTML = data.produse.map(construiesteCardProdus).join('');
                container.querySelectorAll(".produs").forEach(function (art) { art.classList.add("filtru-ok"); });

                if (labelStatistici) {
                    labelStatistici.textContent = `[Server] Afișăm ${data.total} produse filtrate și sortate de baza de date.`;
                }

                let mesaj = document.getElementById("mesaj-lipsa");
                if (mesaj) mesaj.remove();
                if (data.total === 0) {
                    let m = document.createElement("p");
                    m.id = "mesaj-lipsa";
                    m.textContent = "Nu există produse conform filtrării curente.";
                    m.style.gridColumn = "1 / -1"; m.style.textAlign = "center";
                    m.style.color = "var(--accent-color)"; m.style.fontWeight = "bold";
                    container.appendChild(m);
                }

                paginaCurenta = 1;
                aplicaPaginare();
                marcheazaCelMaiIeftin();

                if (window.__pcbuilds && window.__pcbuilds.reinitCarduri) {
                    window.__pcbuilds.reinitCarduri(container);
                }

                if (statusServer) statusServer.textContent = `Rezultat primit de la server: ${data.total} produse.`;
            })
            .catch(function (err) {
                console.error("Eroare la filtrarea pe server:", err);
                if (statusServer) statusServer.textContent = "Eroare la comunicarea cu serverul.";
            });
    }

    let btnServerAsc = document.getElementById("btn-filtrare-server-asc");
    if (btnServerAsc) btnServerAsc.onclick = () => filtreazaPeServer("asc");

    let btnServerDesc = document.getElementById("btn-filtrare-server-desc");
    if (btnServerDesc) btnServerDesc.onclick = () => filtreazaPeServer("desc");
});