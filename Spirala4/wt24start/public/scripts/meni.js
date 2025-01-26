window.onload = function () {
  // Funkcija za ažuriranje menija na osnovu statusa prijave
  function updateMenuForLoginStatus(loggedIn) {
    // Pronađite HTML elemente menija koje želite ažurirati
    const profilLink = document.getElementById('profilLink');
    const nekretnineLink = document.getElementById('nekretnineLink');
    const detaljiLink = document.getElementById('detaljiLink');
    const prijavaLink = document.getElementById('prijavaLink');
    const odjavaLink = document.getElementById('odjavaLink');
    const upitiLink = document.getElementById('upitiLink'); // Ispravljeno: getElementById

    // Ako je korisnik prijavljen, pokažite opciju "Profil", inače pokažite opcije "Nekretnine", "Detalji" i "Prijava"
    if (loggedIn) {
      if (profilLink) profilLink.style.display = 'block';
      if (nekretnineLink) nekretnineLink.style.display = 'block';
      if (detaljiLink) detaljiLink.style.display = 'block';
      if (prijavaLink) prijavaLink.style.display = 'none';
      if (odjavaLink) odjavaLink.style.display = 'block';
      if (upitiLink) upitiLink.style.display = 'block';
    } else {
      if (profilLink) profilLink.style.display = 'none';
      if (nekretnineLink) nekretnineLink.style.display = 'block';
      if (detaljiLink) detaljiLink.style.display = 'block';
      if (prijavaLink) prijavaLink.style.display = 'block';
      if (odjavaLink) odjavaLink.style.display = 'none';
      if (upitiLink) upitiLink.style.display = 'none';
    }
  }

  // Pozivajte metodu za dobijanje korisnika kad se stranica učita
  PoziviAjax.getKorisnik(function (err, data) {
    if (err) {
      updateMenuForLoginStatus(false);
      return;
    }

    if (!data || !data.username) {
      updateMenuForLoginStatus(false);
      return;
    }

    updateMenuForLoginStatus(true);
  });

  // Dodajte event listener za opciju "Odjava"
  const odjavaLink = document.getElementById('odjavaLink');
  if (odjavaLink) {
    odjavaLink.addEventListener('click', function () {
      PoziviAjax.postLogout(function (err, data) {
        if (err) {
          window.alert(err);
          return;
        }

        // Redirektujem se nazad na početnu stranicu prijava.html
        window.location.href = "http://localhost:3000/prijava.html";

        // Update menu for login status inside the callback
        updateMenuForLoginStatus(false);
      });
    });
  }
};