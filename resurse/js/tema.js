document.addEventListener("DOMContentLoaded", function () {
    const btnTema = document.getElementById("btn-tema");
    
    // 1. Verificăm dacă există o temă salvată anterior în localStorage
    let temaSalvata = localStorage.getItem("tema");

    // Dacă există, o aplicăm pe <body>
    if (temaSalvata) {
        document.body.classList.add(temaSalvata);
        
        // Dacă tema salvată este 'dark', bifăm switch-ul ca să arate corect
        if (temaSalvata === "dark") {
            btnTema.checked = true;
        }
    }

    // 2. Ce se întâmplă când dăm click pe switch
    btnTema.addEventListener("change", function () {
        if (this.checked) {
            // S-a bifat -> Trecem pe Dark Mode
            document.body.classList.remove("light"); // Scoatem clasa light (dacă ai)
            document.body.classList.add("dark");     // Adăugăm clasa dark
            localStorage.setItem("tema", "dark");    // Salvăm în browser
        } else {
            // S-a debifat -> Trecem pe Light Mode
            document.body.classList.remove("dark");
            document.body.classList.add("light");
            localStorage.setItem("tema", "light");
        }
    });
});