let StatistikaNekretnina = function () {

    let listaNekretnina = [];
    let listaKorisnika = [];
    const spisakNekretnina = new SpisakNekretnina();

    const init = (nekretnine, korisnici) => {
        spisakNekretnina.init(nekretnine, korisnici);
        listaNekretnina = spisakNekretnina.listaNekretnina;
        listaKorisnika = spisakNekretnina.listaKorisnika;
    };

    const prosjecnaKvadratura = (kriterij) => {
        const filtrirane = spisakNekretnina.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return 0;

        const suma = filtrirane.reduce((acc, nekretnina) => acc + nekretnina.kvadratura, 0);
        return suma / filtrirane.length;
    };

    const outlier = (kriterij, svojstvo) => {
        const filtrirane = spisakNekretnina.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return null;

        const prosjek = filtrirane.reduce((acc, nekretnina) => acc + nekretnina[svojstvo], 0) / filtrirane.length;

        return filtrirane.reduce((najveci, nekretnina) => {
            const odstupanje = Math.abs(nekretnina[svojstvo] - prosjek);
            return odstupanje > najveci.odstupanje ? { nekretnina, odstupanje } : najveci;
        }, { nekretnina: null, odstupanje: 0 }).nekretnina;
    };

    const mojeNekretnine = (korisnik) => {
        const filtrirane = listaNekretnina.filter(nekretnina => 
            nekretnina.upiti.some(upit => upit.korisnik_id === korisnik.id)
        );

        return filtrirane.sort((a, b) => b.upiti.length - a.upiti.length);
    };

    const histogramCijena = (periodi, rasponi) => {    
        return periodi.flatMap((period, periodIndex) => 
            rasponi.map((raspon, rasponIndex) => {
                const filtrirane = listaNekretnina.filter(nekretnina => {
                    const godina = nekretnina.datum_objave.split('.')[2];
                    return godina >= period.od && godina <= period.do &&
                           nekretnina.cijena >= raspon.od && nekretnina.cijena <= raspon.do;
                });

                return {
                    indeksPerioda: periodIndex,
                    indeksRasponaCijena: rasponIndex,
                    brojNekretnina: filtrirane.length
                };
            })
        );
    };

    return {
        init,
        prosjecnaKvadratura,
        outlier,
        mojeNekretnine,
        histogramCijena
    };
};
