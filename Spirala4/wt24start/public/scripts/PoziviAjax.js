const PoziviAjax = (() => {

    // fnCallback se u svim metodama poziva kada stigne
    // odgovor sa servera putem Ajax-a
    // svaki callback kao parametre ima error i data,
    // error je null ako je status 200 i data je tijelo odgovora
    // ako postoji greška, poruka se prosljeđuje u error parametru
    // callback-a, a data je tada null

    function ajaxRequest(method, url, data, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    callback(null, xhr.responseText);
                } else {
                    callback({ status: xhr.status, statusText: xhr.statusText }, null);
                }
            }
        };
        xhr.send(data ? JSON.stringify(data) : null);
    }

    function impl_getTop5Nekretnina(lokacija, fnCallback) {
        ajaxRequest('GET', '/nekretnine/top5?lokacija='+lokacija, null, (error, data) => {
            if (error) {
                fnCallback(error, null);
            } else {
                try {
                    const nekretnine = JSON.parse(data);
                    fnCallback(null, nekretnine);
                } catch (parseError) {
                    fnCallback(parseError, null);
                }
            }
        });
    }

    // Dohvati sva interesovanja za nekretninu
function impl_getInteresovanja(nekretninaId, fnCallback) {
    const url = `/nekretnina/${nekretninaId}/interesovanja`;
    ajaxRequest('GET', url, null, (error, data) => {
        if (error) {
            fnCallback(error, null);
        } else {
            try {
                const interesovanja = JSON.parse(data);
                fnCallback(null, interesovanja);
            } catch (parseError) {
                fnCallback(parseError, null);
            }
        }
    });
}



// Kreiraj novu ponudu
function impl_kreirajPonudu(nekretninaId, podaci, fnCallback) {
    const url = `/nekretnina/${nekretninaId}/ponuda`;
    ajaxRequest('POST', url, podaci, (error, data) => {
        if (error) {
            fnCallback(error, null);
        } else {
            try {
                const odgovor = JSON.parse(data);
                fnCallback(null, odgovor);
            } catch (parseError) {
                fnCallback(parseError, null);
            }
        }
    });
}

// Kreiraj novi zahtjev
function impl_kreirajZahtjev(nekretninaId, podaci, fnCallback) {
    const url = `/nekretnina/${nekretninaId}/zahtjev`;
    ajaxRequest('POST', url, podaci, (error, data) => {
        if (error) {
            fnCallback(error, null);
        } else {
            try {
                const odgovor = JSON.parse(data);
                fnCallback(null, odgovor);
            } catch (parseError) {
                fnCallback(parseError, null);
            }
        }
    });
}

// Ažuriraj status zahtjeva
function impl_azurirajZahtjev(nekretninaId, zahtjevId, podaci, fnCallback) {
    const url = `/nekretnina/${nekretninaId}/zahtjev/${zahtjevId}`;
    ajaxRequest('PUT', url, podaci, (error, data) => {
        if (error) {
            fnCallback(error, null);
        } else {
            try {
                const odgovor = JSON.parse(data);
                fnCallback(null, odgovor);
            } catch (parseError) {
                fnCallback(parseError, null);
            }
        }
    });
}

    function impl_getMojiUpiti(fnCallback) {
        ajaxRequest('GET', '/upiti/moji', null, (error, data) => {
            if (error) {
                fnCallback(error, null);
            } else {
                try {
                    const korisnikoviUpiti = JSON.parse(data);
                    fnCallback(null, korisnikoviUpiti);
                } catch (parseError) {
                    fnCallback(parseError, null);
                }
            }
        });
    }

    function impl_getNekretnina(nekretnina_id, fnCallback) {
        ajaxRequest('GET', '/nekretnina/'+nekretnina_id, null, (error, data) => {
            if (error) {
                fnCallback(error, null);
            } else {
                try {
                    const nekretnina = JSON.parse(data);
                    fnCallback(null, nekretnina);
                } catch (parseError) {
                    fnCallback(parseError, null);
                }
            }
        });
    }

    function impl_getNextUpiti(nekretnina_id, page, fnCallback) {
        ajaxRequest('GET', '/next/upiti/nekretnina'+nekretnina_id+'?page='+page, null, (error, data) => {
            if (error) {
                fnCallback(error, null);
            } else {
                try {
                    const UpitNekretnina = JSON.parse(data);
                    fnCallback(null, UpitNekretnina);
                } catch (parseError) {
                    fnCallback(parseError, null);
                }
            }
        });
    }

    // vraća korisnika koji je trenutno prijavljen na sistem
    function impl_getKorisnik(fnCallback) {
        let ajax = new XMLHttpRequest();

        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                if (ajax.status == 200) {
                    console.log('Uspješan zahtjev, status 200');
                    fnCallback(null, JSON.parse(ajax.responseText));
                } else if (ajax.status == 401) {
                    console.log('Neuspješan zahtjev, status 401');
                    fnCallback("error", null);
                } else {
                    console.log('Nepoznat status:', ajax.status);
                }
            }
        };

        ajax.open("GET", "http://localhost:3000/korisnik/", true);
        ajax.setRequestHeader("Content-Type", "application/json");
        ajax.send();
    }

    // ažurira podatke loginovanog korisnika
    function impl_putKorisnik(noviPodaci, fnCallback) {
        // Check if user is authenticated
        if (!req.session.username) {
            // User is not logged in
            return fnCallback({ status: 401, statusText: 'Neautorizovan pristup' }, null);
        }

        // Get data from request body
        const { ime, prezime, username, password } = noviPodaci;

        // Read user data from the JSON file
        const users = readJsonFile('korisnici');

        // Find the user by username
        const loggedInUser = users.find((user) => user.username === req.session.username);

        if (!loggedInUser) {
            // User not found (should not happen if users are correctly managed)
            return fnCallback({ status: 401, statusText: 'Neautorizovan pristup' }, null);
        }

        // Update user data with the provided values
        if (ime) loggedInUser.ime = ime;
        if (prezime) loggedInUser.prezime = prezime;
        if (username) loggedInUser.adresa = adresa;
        if (password) loggedInUser.brojTelefona = brojTelefona;

        // Save the updated user data back to the JSON file
        saveJsonFile('korisnici', users);

        fnCallback(null, { poruka: 'Podaci su uspješno ažurirani' });
    }

    // dodaje novi upit za trenutno loginovanog korisnika
    function impl_postUpit(nekretnina_id, tekst_upita, fnCallback) {
        const url = '/upit'; // Endpoint za slanje upita
        const podaci = {
            nekretnina_id: nekretnina_id,
            tekst_upita: tekst_upita
        };

        // Koristimo vašu ajaxRequest funkciju
        ajaxRequest('POST', url, podaci, (error, data) => {
            if (error) {
                // Greška pri slanju upita
                console.error('Greška pri slanju upita:', error);
                fnCallback(error, null);
            } else {
                try {
                    // Parsiraj odgovor sa servera
                    const odgovor = JSON.parse(data);
                    fnCallback(null, odgovor);
                } catch (parseError) {
                    // Greška pri parsiranju odgovora
                    console.error('Greška pri parsiranju odgovora:', parseError);
                    fnCallback(parseError, null);
                }
            }
        });
    }

    function impl_getNekretnine(fnCallback) {
        // Koristimo AJAX poziv da bismo dohvatili podatke s servera
        ajaxRequest('GET', '/nekretnine', null, (error, data) => {
            // Ako se dogodi greška pri dohvaćanju podataka, proslijedi grešku kroz callback
            if (error) {
                fnCallback(error, null);
            } else {
                // Ako su podaci uspješno dohvaćeni, parsiraj JSON i proslijedi ih kroz callback
                try {
                    const nekretnine = JSON.parse(data);
                    fnCallback(null, nekretnine);
                } catch (parseError) {
                    // Ako se dogodi greška pri parsiranju JSON-a, proslijedi grešku kroz callback
                    fnCallback(parseError, null);
                }
            }
        });
    }

    function impl_postLogin(username, password, fnCallback) {
        var ajax = new XMLHttpRequest()

        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4 && ajax.status == 200) {
                fnCallback(null, ajax.response)
            }
            else if (ajax.readyState == 4) {
                //desio se neki error
                fnCallback(ajax.statusText, null)
            }
        }
        ajax.open("POST", "http://localhost:3000/login", true)
        ajax.setRequestHeader("Content-Type", "application/json")
        var objekat = {
            "username": username,
            "password": password
        }
        forSend = JSON.stringify(objekat)
        ajax.send(forSend)
    }

    function impl_postLogout(fnCallback) {
        let ajax = new XMLHttpRequest()

        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4 && ajax.status == 200) {
                fnCallback(null, ajax.response)
            }
            else if (ajax.readyState == 4) {
                //desio se neki error
                fnCallback(ajax.statusText, null)
            }
        }
        ajax.open("POST", "http://localhost:3000/logout", true)
        ajax.send()
    }

    return {
        postLogin: impl_postLogin,
        postLogout: impl_postLogout,
        getKorisnik: impl_getKorisnik,
        putKorisnik: impl_putKorisnik,
        postUpit: impl_postUpit,
        getNekretnine: impl_getNekretnine,
        getMojiUpiti: impl_getMojiUpiti,
        getTop5Nekretnina: impl_getTop5Nekretnina,
        getNekretnina: impl_getNekretnina,
        getNextUpiti: impl_getNextUpiti,
        getInteresovanja: impl_getInteresovanja,
        kreirajPonudu: impl_kreirajPonudu,
        kreirajZahtjev: impl_kreirajZahtjev,
        azurirajZahtjev: impl_azurirajZahtjev,
    };
})();