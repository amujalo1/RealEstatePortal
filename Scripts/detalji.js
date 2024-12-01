// Globalna dostupnost funkcije
window.postaviCarousel = postaviCarousel;

// Primjer kreiranja i povezivanja carousel-a
document.addEventListener("DOMContentLoaded", () => {
    const glavniElement = document.getElementById("upiti");
    const sviElementi = Array.from(document.querySelectorAll("#upiti .upit"));
    const carousel = postaviCarousel(glavniElement, sviElementi);

    if (carousel) {
        console.log("Carousel je uspješno povezan! Pozovite carousel.fnLijevo() i carousel.fnDesno() u terminalu za testiranje.");
        window.carousel = carousel; // Izložimo carousel za terminal
    } else {
        console.error("Carousel nije mogao biti inicijalizovan.");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const btnLijevo = document.getElementById("btnLijevo");
    const btnDesno = document.getElementById("btnDesno");

    if (window.carousel) {
        btnLijevo.addEventListener("click", () => window.carousel.fnLijevo());
        btnDesno.addEventListener("click", () => window.carousel.fnDesno());
    }
});

