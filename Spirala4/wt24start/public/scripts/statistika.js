const nekretnine = StatistikaNekretnina();
nekretnine.init(listaNekretnina, listaKorisnika);
function prikaziProsjecnuKvadraturu() {
    const kriterij = document.getElementById("kvadratura-kriterij").value.trim();
    if (!kriterij) {
        alert("Greška: Unesite kriterij (npr. tip_nekretnine: Stan).");
        return;
    }

    // Parsiranje kriterija
    const dijelovi = kriterij.split(":").map(dio => dio.trim());
    if (dijelovi.length !== 2) {
        alert("Greška: Kriterij mora biti u formatu tip_nekretnine: Stan.");
        return;
    }

    const [kljuc, vrijednost] = dijelovi;
    const kriterijObj = { [kljuc]: vrijednost };

    const rezultat = nekretnine.prosjecnaKvadratura(kriterijObj);
    document.getElementById("rezultat-kvadratura").innerText =
        rezultat ? `Prosječna kvadratura: ${rezultat.toFixed(2)} m²` : "Nema podataka za navedeni kriterij.";
}

function prikaziOutlier() {
    const kriterij = document.getElementById("outlier-kriterij").value.trim();
    const nazivSvojstva = document.getElementById("naziv-svojstva").value.trim();

    if (!kriterij || !nazivSvojstva) {
        alert("Greška: Unesite kriterij (npr. tip_nekretnine: Stan) i naziv svojstva.");
        return;
    }

    // Parsiranje kriterija
    const dijelovi = kriterij.split(":").map(dio => dio.trim());
    if (dijelovi.length !== 2) {
        alert("Greška: Kriterij mora biti u formatu tip_nekretnine: Stan.");
        return;
    }

    const [kljuc, vrijednost] = dijelovi;
    const kriterijObj = { [kljuc]: vrijednost };

    const rezultat = nekretnine.outlier(kriterijObj, nazivSvojstva);
    document.getElementById("rezultat-outlier").innerText =
        rezultat ? `Outlier nekretnina: ${rezultat.naziv}, Vrijednost: ${rezultat[nazivSvojstva]}` : "Nema outlier-a za zadani kriterij.";
}

function prikaziMojeNekretnine() {
    const korisnikId = parseInt(document.getElementById("korisnik-id").value);
    if (isNaN(korisnikId)) {
        alert("Greška: Unesite validan ID korisnika.");
        return;
    }

    const korisnik = listaKorisnika.find(k => k.id === korisnikId);
    if (!korisnik) {
        alert("Korisnik s tim ID-om ne postoji.");
        return;
    }

    const mojeNekretnine = nekretnine.mojeNekretnine(korisnik);
    document.getElementById("rezultat-nekretnine").innerHTML =
        mojeNekretnine.length > 0
            ? mojeNekretnine.map(nekretnina => `<p>${nekretnina.naziv} (${nekretnina.cijena} KM)</p>`).join("")
            : "Nema nekretnina za ovog korisnika.";
}

function iscrtajHistogram() {
    const divHistogrami = document.getElementById("histogrami");
    const periodiInput = document.getElementById("periodi").value.trim();
    const rasponiCijenaInput = document.getElementById("rasponi-cijena").value.trim();

    if (!periodiInput || !rasponiCijenaInput) {
        alert("Greška: Unesite validne periode i raspone cijena.");
        return;
    }

    // Parsiranje perioda
    const periodi = periodiInput.split(",").map(period => {
        const dijelovi = period.split("-").map(d => parseInt(d.trim()));
        if (dijelovi.length !== 2 || isNaN(dijelovi[0]) || isNaN(dijelovi[1])) {
            alert("Greška: Periodi moraju biti u formatu 2000-2010, 2010-2024.");
            throw new Error("Neispravan format perioda.");
        }
        return { od: dijelovi[0], do: dijelovi[1] };
    });

    // Parsiranje raspona cijena
    const rasponiCijena = rasponiCijenaInput.split(",").map(raspon => {
        const dijelovi = raspon.split("-").map(d => parseInt(d.trim()));
        if (dijelovi.length !== 2 || isNaN(dijelovi[0]) || isNaN(dijelovi[1])) {
            alert("Greška: Rasponi cijena moraju biti u formatu 10000-150000, 150000-1000000.");
            throw new Error("Neispravan format raspona cijena.");
        }
        return { od: dijelovi[0], do: dijelovi[1] };
    });
    // Dobijanje podataka za histogram
    const histogramPodaci = nekretnine.histogramCijena(periodi, rasponiCijena);


    // Čišćenje prethodnih histograma
    divHistogrami.innerHTML = "";

    // Generisanje grafova za svaki period
    periodi.forEach((period, indeksPerioda) => {
        const podaciZaPeriod = histogramPodaci.filter(
            pod => pod.indeksPerioda === indeksPerioda
        );

        const labels = rasponiCijena.map(
            raspon => `${raspon.od}-${raspon.do}`
        );
        const data = rasponiCijena.map(
            (_, indeksRaspona) => {
                const pod = podaciZaPeriod.find(p => p.indeksRasponaCijena === indeksRaspona);
                return pod ? pod.brojNekretnina : 0;
            }
        );

        const canvas = document.createElement("canvas");
        canvas.id = `chart-${indeksPerioda}`;
        divHistogrami.appendChild(canvas);

        new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: `Period ${period.od} - ${period.do}`,
                    data: data,
                    backgroundColor: "#007bff",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "top" },
                    title: { display: true, text: `Histogram za period ${period.od} - ${period.do}` },
                },
                scales: {
                    x: { beginAtZero: true },
                    y: { beginAtZero: true }
                }
            }
        });
    });
}
