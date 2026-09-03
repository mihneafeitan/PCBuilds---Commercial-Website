document.addEventListener("DOMContentLoaded", function () {
    // BONUS 2 (Etapa 6): Utilizatorul poate alege dintre 4 teme (dark, light, ocean, sepia),
    // nu doar light/dark. Tema aleasa se memoreaza in localStorage, ca si pana acum.
    const selTema = document.getElementById("sel-tema");
    if (!selTema) return;

    const temeDisponibile = ["dark", "light", "ocean", "sepia"];

    function aplicaTema(tema) {
        if (!temeDisponibile.includes(tema)) tema = "dark";
        document.body.classList.remove(...temeDisponibile);
        document.body.classList.add(tema);
        localStorage.setItem("tema", tema);
        selTema.value = tema;
    }

    // 1. La incarcare, aplicam tema salvata anterior (sau dark, implicit)
    let temaSalvata = localStorage.getItem("tema") || "dark";
    aplicaTema(temaSalvata);

    // 2. La schimbarea selectului, aplicam noua tema aleasa
    selTema.addEventListener("change", function () {
        aplicaTema(this.value);
    });
});
