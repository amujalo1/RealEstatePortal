window.postaviCarousel = postaviCarousel;
let nekretninaId;

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    nekretninaId = urlParams.get('id');
    

    if (nekretninaId) {
        PoziviAjax.getNekretnina(nekretninaId, async (error, nekretnina) => {
            if (error) {
                console.error("Greška pri dohvatu nekretnine:", error);
                alert("Ne možemo učitati detalje nekretnine. Pokušajte ponovo.");
            } else {
                await popuniDetalje(nekretnina);
            }
        });
        dodajFormuInteresovanja(nekretninaId);
    } else {
        alert("ID nekretnine nije definisan u URL-u.");
    }

    
    const btnLijevoUpiti = document.getElementById('btnLijevoUpiti');
    const btnDesnoUpiti = document.getElementById('btnDesnoUpiti');
    const btnLijevoZahtjevi = document.getElementById('btnLijevoZahtjevi');
    const btnDesnoZahtjevi = document.getElementById('btnDesnoZahtjevi');
    const btnLijevoPonude = document.getElementById('btnLijevoPonude');
    const btnDesnoPonude = document.getElementById('btnDesnoPonude');

    btnLijevoUpiti?.addEventListener('click', async () => window.carouselUpiti?.fnLijevo());
    btnDesnoUpiti?.addEventListener('click', async () => window.carouselUpiti?.fnDesno());
    btnLijevoZahtjevi?.addEventListener('click', async () => window.carouselZahtjevi?.fnLijevo());
    btnDesnoZahtjevi?.addEventListener('click', async () => window.carouselZahtjevi?.fnDesno());
    btnLijevoPonude?.addEventListener('click', async () => window.carouselPonude?.fnLijevo());
    btnDesnoPonude?.addEventListener('click', async () => window.carouselPonude?.fnDesno());
});
let ponudaPrazna=false;
// Funkcija za dodavanje forme interesovanja
function dodajFormuInteresovanja(nekretninaId) {
    const formaInteresovanje = document.getElementById("forma-interesovanje");
    const tipInteresovanjaSelect = document.getElementById("tip-interesovanja");
    const upitSection = document.getElementById("upit-section");
    const zahtjevSection = document.getElementById("zahtjev-section");
    const ponudaSection = document.getElementById("ponuda-section");
    const vezanaPonudaSelect = document.getElementById("vezana-ponuda");

    // Prikazivanje/skrivanje sekcija forme
    tipInteresovanjaSelect.addEventListener("change", (e) => {
        const selectedType = e.target.value;
        upitSection.style.display = selectedType === "upit" ? "block" : "none";
        zahtjevSection.style.display = selectedType === "zahtjev" ? "block" : "none";
        ponudaSection.style.display = selectedType === "ponuda" ? "block" : "none";

        if (selectedType === "ponuda") {
            // Dohvati sve ponude za trenutnu nekretninu
            PoziviAjax.getInteresovanja(nekretninaId, (error, data) => {
                if (error) {
                    console.error("Greška pri dohvatanju ponuda:", error);
                    return;
                }

                const ponude = data.filter(interesovanje => interesovanje.tip === "ponuda" && interesovanje.cijenaPonude !== undefined && interesovanje.cijenaPonude !== null);
                if (ponude.length == 0) {ponudaPrazna=true;}
                if (ponude.length > 0) {
                    vezanaPonudaSelect.innerHTML = ponude.map(ponuda => `
                        <option value="${ponuda.id}">Ponuda #${ponuda.id}, ${ponuda.cijenaPonude}KM</option>
                    `).join("");
                    vezanaPonudaSelect.disabled = false;
                } else {
                    vezanaPonudaSelect.innerHTML = '<option value="">Nema ranijih ponuda</option>';
                    vezanaPonudaSelect.disabled = true;
                }
            });
        }
    });

    // Slanje forme
    formaInteresovanje.addEventListener("submit", (e) => {
        e.preventDefault();
        const tipInteresovanja = tipInteresovanjaSelect.value;
        let podaciUpita = null;
        let podaci = {};
        if (tipInteresovanja === "upit") {
            podaciUpita = document.getElementById("tekst-upita").value;
            PoziviAjax.postUpit(nekretninaId, podaciUpita, (error, data) => {
                if (error) {
                    console.error("Greška pri kreiranju upita:", error);
                } else {
                    console.log("Upit uspješno kreiran:", data);
                    osvjeziListuInteresovanja(nekretninaId);
                }
            });
        } else if (tipInteresovanja === "zahtjev") {
            podaci.tekst = document.getElementById("tekst-zahtjeva").value;
            podaci.trazeniDatum = document.getElementById("trazeni-datum").value;
            PoziviAjax.kreirajZahtjev(nekretninaId, podaci, (error, data) => {
                if (error) {
                    console.error("Greška pri kreiranju zahtjeva:", error);
                } else {
                    console.log("Zahtjev uspješno kreiran:", data);
                    osvjeziListuInteresovanja(nekretninaId);
                }
            });
        } else if (tipInteresovanja === "ponuda") {
            podaci.tekst = document.getElementById("tekst-ponude").value;
            podaci.ponudaCijene = document.getElementById("ponuda-cijena").value;
            podaci.idVezanePonude = document.getElementById("vezana-ponuda").value;
            if(ponudaPrazna)
                podaci.idVezanePonude=null;
            
            podaci.datumPonude = document.getElementById("trazeni-datum-ponuda").value;
            PoziviAjax.kreirajPonudu(nekretninaId, podaci, (error, data) => {
                if (error) {
                    console.error("Greška pri kreiranju ponude:", error);
                } else {
                    console.log("Ponuda uspješno kreirana:", data);
                    osvjeziListuInteresovanja(nekretninaId);
                }
            });
        }
    });
}

// Funkcija za osvježavanje liste interesovanja
async function osvjeziListuInteresovanja(nekretninaId) {
    PoziviAjax.getInteresovanja(nekretninaId, (error, data) => {
        if (error) {
            console.error("Greška pri dohvatanju interesovanja:", error);
            return;
        }

        // Razdvoji upite, zahtjeve i ponude
        const upiti = data.filter(interesovanje => interesovanje.tip === 'upit');
        const zahtjevi = data.filter(interesovanje => interesovanje.tip === 'zahtjev');
        const ponude = data.filter(interesovanje => interesovanje.tip === 'ponuda');

        // Prikazi upite
        const upitiDiv = document.getElementById('upiti');
        upitiDiv.innerHTML = upiti.map(upit => `
            <div class="upit">
                <p><strong>Korisnik:</strong> ${upit.korisnik_id}</p>
                <p><strong>Tekst:</strong> ${upit.tekst_upita}</p>
            </div>
        `).join('');

        // Prikazi zahtjeve
        const zahtjeviDiv = document.getElementById('zahtjevi');
        zahtjeviDiv.innerHTML = zahtjevi.map(zahtjev => `
            <div class="zahtjev">
                <p><strong>Korisnik:</strong> ${zahtjev.korisnik_id}</p>
                <p><strong>Traženi datum:</strong> ${zahtjev.trazeniDatum}</p>
                <p><strong>Status:</strong> ${zahtjev.odobren ? 'Odobreno' : 'Na čekanju'}</p>
            </div>
        `).join('');

        // Prikazi ponude
        const ponudeDiv = document.getElementById('ponude');
        ponudeDiv.innerHTML = ponude.map(ponuda => `
            <div class="ponuda">
                <p><strong>Korisnik:</strong> ${ponuda.korisnik_id}</p>
                <p><strong>Tekst:</strong> ${ponuda.tekst_upita}</p>
                ${ponuda.cijenaPonude ? `<p><strong>Cijena:</strong> ${ponuda.cijenaPonude}</p>` : ''}
                <p><strong>Status:</strong> ${ponuda.odbijenaPonuda ? 'Odbijena' : 'Na čekanju'}</p>
            </div>
        `).join('');

        // Inicijalizacija karusela nakon učitavanja podataka
        const carouselUpiti = postaviCarousel(upitiDiv, Array.from(upitiDiv.querySelectorAll(".upit")));
        const carouselZahtjevi = postaviCarousel(zahtjeviDiv, Array.from(zahtjeviDiv.querySelectorAll(".zahtjev")));
        const carouselPonude = postaviCarousel(ponudeDiv, Array.from(ponudeDiv.querySelectorAll(".ponuda")));

        // Postavljanje karusela u globalni scope za testiranje
        if (carouselUpiti) {
            console.log("Carousel za upite je uspješno povezan!");
            window.carouselUpiti = carouselUpiti;
        } else {
            console.error("Carousel za upite nije mogao biti inicijalizovan.");
        }

        if (carouselZahtjevi) {
            console.log("Carousel za zahtjeve je uspješno povezan!");
            window.carouselZahtjevi = carouselZahtjevi;
        } else {
            console.error("Carousel za zahtjeve nije mogao biti inicijalizovan.");
        }

        if (carouselPonude) {
            console.log("Carousel za ponude je uspješno povezan!");
            window.carouselPonude = carouselPonude;
        } else {
            console.error("Carousel za ponude nije mogao biti inicijalizovan.");
        }
    });
}

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

    await osvjeziListuInteresovanja(nekretninaId);
}

