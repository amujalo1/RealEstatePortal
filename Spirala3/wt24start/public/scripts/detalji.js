window.postaviCarousel = postaviCarousel;
let sviUpiti = [];
let page = 1;
let index = 1;

let nekretninaId;

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    nekretninaId = urlParams.get('id');
    let carousel;

    if (nekretninaId) {
        PoziviAjax.getNekretnina(nekretninaId, async (error, nekretnina) => {
            if (error) {
                console.error("Greška pri dohvatu nekretnine:", error);
                alert("Ne možemo učitati detalje nekretnine. Pokušajte ponovo.");
            } else {
                await popuniDetalje(nekretnina);

                // Inicijalizacija karusela nakon što su detalji popunjeni
                const glavniElement = document.getElementById("upiti");
                const sviElementi = Array.from(glavniElement.querySelectorAll(".upit"));
                carousel = postaviCarousel(glavniElement, sviElementi);

                if (carousel) {
                    console.log("Carousel je uspješno povezan! Pozovite carousel.fnLijevo() i carousel.fnDesno() u terminalu za testiranje.");
                    window.carousel = carousel;
                } else {
                    console.error("Carousel nije mogao biti inicijalizovan.");
                }
            }
        });
    } else {
        alert("ID nekretnine nije definisan u URL-u.");
    }

    const btnLijevo = document.getElementById("btnLijevo");
    const btnDesno = document.getElementById("btnDesno");

    // Postavljanje događaja za dugmad
    btnLijevo?.addEventListener("click", () => {
        index--;
        if(index<=0){
            index=sviUpiti.length;
        }
        window.carousel?.fnLijevo()
    });
    btnDesno?.addEventListener("click", async () => {
        if (index % 3 === 0) {
            // Ako smo došli do kraja trenutne grupe upita, provjeri ima li još u sljedećem page-u
            await updateUpiti(nekretninaId);

            // Ažuriraj carousel nakon dohvaćanja novih upita
            const glavniElement = document.getElementById("upiti");
            const sviElementi = Array.from(glavniElement.querySelectorAll(".upit"));
            carousel = postaviCarousel(glavniElement, sviElementi);
            window.carousel = carousel;
            for(let i=0; i<index-1;i++){
                window.carousel?.fnDesno();
            }
            
        }  
        if(index == sviUpiti.length){
            index=1;
        } else {
            index++;
        }
        
        window.carousel?.fnDesno();
    });
});

async function popuniDetalje(nekretnina) {
    document.querySelector("#osnovno p:nth-child(2)").innerHTML = `<strong>Naziv:</strong> ${nekretnina.naziv}`;
    document.querySelector("#osnovno p:nth-child(3)").innerHTML = `<strong>Kvadratura:</strong> ${nekretnina.kvadratura} m²`;
    document.querySelector("#osnovno p:nth-child(4)").innerHTML = `<strong>Cijena:</strong> ${nekretnina.cijena} KM`;

    document.querySelector("#kolona1 p:nth-child(1)").innerHTML = `<strong>Tip grijanja:</strong> ${nekretnina.tip_grijanja}`;

    const lokacijaLink = document.getElementById("lokacija-link");
    const lokacijaElement = document.getElementById("lokacija");

    if (nekretnina.lokacija) {
        lokacijaElement.textContent = nekretnina.lokacija;
        lokacijaLink.href = `http://localhost:3000/html/nekretnine.html?lokacija=${encodeURIComponent(nekretnina.lokacija)}`;
    } else {
        lokacijaElement.textContent = "Lokacija nije dostupna";
        lokacijaLink.href = "#";
    }

    document.querySelector("#kolona2 p:nth-child(1)").innerHTML = `<strong>Godina izgradnje:</strong> ${nekretnina.godina_izgradnje}`;
    document.querySelector("#kolona2 p:nth-child(2)").innerHTML = `<strong>Datum objave oglasa:</strong> ${nekretnina.datum_objave}`;
    document.querySelector("#opis p").innerHTML = `<strong>Opis:</strong> ${nekretnina.opis}`;

    await updateUpiti(nekretnina.id);
}

async function updateUpiti(id) {
    const noviUpiti = await dohvatitiNextUpite(id);

    if (noviUpiti.length > 0) {
        const upitiContainer = document.getElementById("upiti");
        noviUpiti.forEach(upit => {
            const upitDiv = document.createElement("div");
            upitDiv.classList.add("upit");
            upitDiv.innerHTML = `
                <p><strong>ID korisnika:</strong> ${upit.korisnik_id}</p>
                <p>${upit.tekst_upita}</p>
            `;
            upitiContainer.appendChild(upitDiv);
        });
    }
}

async function dohvatitiNextUpite(nekretninaId) {
    try {
        const result = await new Promise((resolve, reject) => {
            PoziviAjax.getNextUpiti(nekretninaId, page, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        if (result.length > 0) {
            sviUpiti = sviUpiti.concat(result);
            page++;
        }

        return sviUpiti;
    } catch (error) {
        return sviUpiti;
    }
}
