document.addEventListener("DOMContentLoaded", function () {
    
    // --- Etapa 6: Conectarea și maparea elementelor din interfața DOM a paginii ---
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

    // --- Etapa 6: Setul Regex pentru caracterele speciale interzise din motive de securitate ---
    const regexCaractereInterzise = /[<>\/\\*]/g;

    // --- Etapa 6: Gestiune panou filtre (Ascundere/Afișare) salvată persistent prin localStorage ---
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


    // --- Etapa 6, Bonus 7: Funcție helper utilizată pentru neutralizarea și eliminarea diacriticelor românești ---
    function eliminaDiacritice(text) {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[șş]/g, "s")          
            .replace(/[țţ]/g, "t");         
    }

    // --- Etapa 6: Validare în timp real a textului introdus în casete ---
    function valideazaNume() {
        if (regexCaractereInterzise.test(inpNume.value)) {
            inpNume.classList.add("is-invalid");
            return false;
        } else {
            inpNume.classList.remove("is-invalid");
            return true;
        }
    }

    function valideazaTextarea() {
        if (regexCaractereInterzise.test(txtDescriere.value)) {
            txtDescriere.classList.add("is-invalid");
            return false;
        } else {
            txtDescriere.classList.remove("is-invalid");
            return true;
        }
    }

    inpNume.addEventListener("input", valideazaNume);
    txtDescriere.addEventListener("input", valideazaTextarea);


    // --- Etapa 6: Actualizarea textului de sub slider-ul de preț (Range) ---
    infoRange.textContent = `(0 - ${rngPret.value} RON)`;
    rngPret.addEventListener("input", function () {
        infoRange.textContent = `(0 - ${this.value} RON)`;
    });


    // --- Etapa 6: Restaurarea automată a stării filtrelor din memoria sessionStorage la reîncărcare/navigare back ---
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
    if (sessionStorage.getItem("filtru_categorie")) {
        let catSalvata = sessionStorage.getItem("filtru_categorie");
        let radElement = document.getElementById(`rad-${catSalvata}`);
        if (radElement) radElement.checked = true;
    }
    if (sessionStorage.getItem("filtru_compatibilitate")) {
        let vectorCompat = JSON.parse(sessionStorage.getItem("filtru_compatibilitate"));
        for (let opt of selectCompat.options) {
            if (vectorCompat.includes(opt.value)) opt.selected = true;
        }
    }


    // --- Etapa 6: Funcția principală nativă responsabilă pentru Filtrarea elementelor DOM ---
    function filtreaza() {
        let numeValid = valideazaNume();
        let textareaValida = valideazaTextarea();

        if (!numeValid || !textareaValida) {
            labelStatistici.textContent = "Filtrare oprită: Caractere invalide detectate în casetele de text! (< > / \\ *)";
            return;
        }

        // --- Etapa 6: Salvare persistentă pe tab a noilor criterii selectate prin sessionStorage ---
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
            if (optiuniSelectateCompat.length === 0) {
                condCompat = true; 
            } else {
                for (let opt of optiuniSelectateCompat) {
                    if (compatArt.includes(opt)) {
                        condCompat = true;
                        break;
                    }
                }
            }

            if (condNume && condDesc && condCuloare && condGarantie && condPret && condNou && condCateg && condCompat) {
                art.style.display = "block";
                produseVizibile++;
            }
        }

        // --- Etapa 6, Bonus 15: Actualizarea textului ce contorizează numărul curent de produse vizibile ---
        labelStatistici.textContent = `Afișăm ${produseVizibile} din ${articoleTotale} produse disponibile.`;

        // --- Etapa 6, Bonus 3: Generarea dinamică a mesajului de notificare când nu există rezultate pe ecran ---
        let container = document.getElementById("container-produse");
        let mesaj = document.getElementById("mesaj-lipsa");
        if (produseVizibile === 0) {
            if (!mesaj) {
                mesaj = document.createElement("p");
                mesaj.id = "mesaj-lipsa";
                mesaj.textContent = "Nu există produse conform filtrării curente.";
                mesaj.style.color = "var(--accent-color)";
                mesaj.style.fontSize = "1.2rem";
                mesaj.style.fontWeight = "bold";
                mesaj.style.gridColumn = "1 / -1";
                mesaj.style.textAlign = "center";
                container.appendChild(mesaj);
            }
        } else if (mesaj) {
            mesaj.remove();
        }
    }

    // --- Etapa 6, Bonus 4: Atașarea evenimentelor input/change pe filtre pentru declanșarea filtrării automate ---
    inpNume.addEventListener("input", filtreaza);
    txtDescriere.addEventListener("input", filtreaza);
    rngPret.addEventListener("input", filtreaza);
    inpCuloare.addEventListener("change", filtreaza);
    inpGarantie.addEventListener("input", filtreaza);
    inpNou.addEventListener("change", filtreaza);
    selectCompat.addEventListener("change", filtreaza);
    
    let radioButtons = document.querySelectorAll('input[name="gr_radio"]');
    for(let radio of radioButtons) {
        radio.addEventListener("change", filtreaza);
    }

    document.getElementById("btn-filtrare").onclick = filtreaza;
    
    filtreaza();


    // --- Etapa 6: Sortarea elementelor de pe client în funcție de două chei simultan (Nume + Preț) ---
    function sorteaza(semn) {
        if (!valideazaNume() || !valideazaTextarea()) {
            alert("Nu puteți sorta produsele! Câmpurile conțin caractere invalide.");
            return;
        }

        let container = document.getElementById("container-produse");
        let articole = Array.from(document.getElementsByClassName("produs"));

        articole.sort(function (a, b) {
            let numeA = a.querySelector(".nume").textContent.toLowerCase();
            let numeB = b.querySelector(".nume").textContent.toLowerCase();
            let pretA = parseFloat(a.querySelector(".val-pret").textContent);
            let pretB = parseFloat(b.querySelector(".val-pret").textContent);

            if (numeA !== numeB) {
                return semn * numeA.localeCompare(numeB);
            } else {
                return semn * (pretA - pretB);
            }
        });

        for (let art of articole) {
            container.appendChild(art);
        }
    }

    document.getElementById("btn-sort-asc").onclick = function () { sorteaza(1); };
    document.getElementById("btn-sort-desc").onclick = function () { sorteaza(-1); };


    // --- Etapa 6: Calcularea sumei prețurilor pentru toate produsele vizibile pe ecran (pop-up temporar) ---
    document.getElementById("btn-calcul").onclick = function () {
        if (!valideazaNume() || !valideazaTextarea()) {
            alert("Nu puteți calcula suma! Câmpurile conțin caractere invalide.");
            return;
        }

        let articole = document.getElementsByClassName("produs");
        let suma = 0;

        for (let art of articole) {
            if (art.style.display !== "none") {
                suma += parseFloat(art.querySelector(".val-pret").textContent);
            }
        }

        let divInfo = document.createElement("div");
        divInfo.innerHTML = `<strong>Suma produselor afișate:</strong> <br> ${suma.toFixed(2)} RON`;
        divInfo.style.position = "fixed";
        divInfo.style.bottom = "20px";
        divInfo.style.right = "20px";
        divInfo.style.backgroundColor = "var(--primary-color)";
        divInfo.style.color = "white";
        divInfo.style.padding = "15px";
        divInfo.style.borderRadius = "8px";
        divInfo.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.5)";
        divInfo.style.zIndex = "1000";

        document.body.appendChild(divInfo);

        setTimeout(function () {
            divInfo.remove();
        }, 2000);
    };


    // --- Etapa 6: Resetarea completă a valorilor din interfață și ștergerea cache-ului din sesiune ---
    document.getElementById("btn-reset").onclick = function () {
        if (confirm("Ești sigur că vrei să resetezi toate filtrele?")) {
            inpNume.value = "";
            txtDescriere.value = "";
            inpCuloare.value = "toate";
            inpGarantie.value = "";
            
            let maxRange = rngPret.getAttribute("max");
            rngPret.value = maxRange;
            infoRange.textContent = `(0 - ${maxRange} RON)`;
            
            inpNou.checked = true;
            document.getElementById("rad-toate").checked = true;
            
            for (let opt of selectCompat.options) {
                opt.selected = false;
            }

            inpNume.classList.remove("is-invalid");
            txtDescriere.classList.remove("is-invalid");

            sessionStorage.clear();

            filtreaza();
        }
    };


    // =======================================================================
    // --- Etapa 6, Bonus 20: Modulul JavaScript client responsabil pentru logica de Comparare Produse ---
    // =======================================================================
    const btnComparareList = document.querySelectorAll(".btn-comparare");
    const containerComparare = document.getElementById("container-comparare");
    const listaComparare = document.getElementById("produse-comparare-lista");
    const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");

    // --- Etapa 6, Bonus 20: Subpunctul privind ascunderea automată a containerului după expirarea a 24 de ore ---
    let lastAction = localStorage.getItem("comparare-timestamp");
    if (lastAction) {
        let timpTrecut = new Date().getTime() - parseInt(lastAction);
        let oZi = 24 * 60 * 60 * 1000; 
        if (timpTrecut > oZi) {
            localStorage.removeItem("produse-comparare");
            localStorage.removeItem("comparare-timestamp");
        }
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
                btn.disabled = false;
                btn.title = "";
                btn.innerHTML = '<i class="fa-solid fa-scale-balanced"></i> Compară';
            });
            return;
        }

        containerComparare.style.display = "block";

        comparare.forEach((prod, index) => {
            let div = document.createElement("div");
            div.className = "d-flex justify-content-between align-items-center mb-2 p-2";
            div.style.border = "1px solid var(--secondary-color)";
            div.style.borderRadius = "5px";
            div.innerHTML = `
                <span style="font-size: 0.9em; font-weight: bold; color: var(--text-color);">${prod.nume}</span>
                <button class="btn btn-sm btn-danger btn-sterge-comp" data-index="${index}" title="Șterge produsul">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            listaComparare.appendChild(div);
        });

        // --- Etapa 6, Bonus 20: Ascultător pentru butoanele de eliminare individuală a produselor din coșul de comparare ---
        document.querySelectorAll(".btn-sterge-comp").forEach(btn => {
            btn.onclick = function() {
                let idx = parseInt(this.getAttribute("data-index"));
                comparare.splice(idx, 1);
                salveazaComparare();
            };
        });

        // --- Etapa 6, Bonus 20: Logica dezactivării tuturor butoanelor cu injectare mesaj în tooltip la atingerea limitei de 2 ---
        if (comparare.length === 2) {
            btnAfiseaza.style.display = "block"; 
            
            btnComparareList.forEach(btn => {
                btn.disabled = true;
                btn.title = "ștergeți un produs din lista de comparare";
            });
        } else {
            btnAfiseaza.style.display = "none"; 
            
            btnComparareList.forEach(btn => {
                if (comparare.find(p => p.id === btn.getAttribute("data-id"))) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Selectat';
                    btn.title = "Acest produs este deja în lista de comparare.";
                } else {
                    btn.disabled = false;
                    btn.title = "";
                    btn.innerHTML = '<i class="fa-solid fa-scale-balanced"></i> Compară';
                }
            });
        }
    }

    btnComparareList.forEach(btn => {
        btn.onclick = function() {
            if (comparare.length < 2) {
                comparare.push({
                    id: this.getAttribute("data-id"),
                    nume: this.getAttribute("data-nume")
                });
                salveazaComparare();
            }
        };
    });

    // --- Etapa 6, Bonus 20: Acțiunea de deschidere în fereastră nouă/tab nou (window.open) a tabelului paralel ---
    btnAfiseaza.onclick = function() {
        if (comparare.length === 2) {
            window.open('/compara/' + comparare[0].id + '/' + comparare[1].id, '_blank');
        }
    };

    randeazaComparare();
});