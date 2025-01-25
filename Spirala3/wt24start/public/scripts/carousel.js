function postaviCarousel(glavniElement, sviElementi, indeks = 0) {
    if (!glavniElement || !sviElementi.length || indeks < 0 || indeks >= sviElementi.length) {
        return null;
    }

    function azurirajPrikaz() {
        if (glavniElement && sviElementi.length > 0) {
            glavniElement.innerHTML = sviElementi[indeks].innerHTML;
        }
    }

    async function fnDesno() {
        indeks = (indeks + 1) % sviElementi.length;
        azurirajPrikaz();
    }
    

    function fnLijevo() {
        indeks = (indeks - 1 + sviElementi.length) % sviElementi.length;
        azurirajPrikaz();
    }

    azurirajPrikaz();
    return { fnLijevo, fnDesno };
}
