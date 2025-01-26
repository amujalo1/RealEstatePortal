const express = require('express');
const session = require("express-session");
const path = require('path');
const fs = require('fs').promises; // Using asynchronus API for file read and write
const bcrypt = require('bcrypt');
const { json } = require('stream/consumers');

const sequelize = require('./data/sequelize');
const Korisnik = require('./data/Korisnik');
const Nekretnina = require('./data/Nekretnina');
const Upit = require('./data/Upit');
const Zahtjev = require('./data/Zahtjev');
const Ponuda = require('./data/Ponuda');
// Veze između modela
Korisnik.hasMany(Upit, { foreignKey: 'korisnik_id' });
Upit.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

Nekretnina.hasMany(Upit, { foreignKey: 'nekretnina_id' });
Upit.belongsTo(Nekretnina, { foreignKey: 'nekretnina_id' });

Korisnik.hasMany(Zahtjev, { foreignKey: 'korisnik_id' });
Zahtjev.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

Nekretnina.hasMany(Zahtjev, { foreignKey: 'nekretnina_id' });
Zahtjev.belongsTo(Nekretnina, { foreignKey: 'nekretnina_id' });

Korisnik.hasMany(Ponuda, { foreignKey: 'korisnik_id' });
Ponuda.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

Nekretnina.hasMany(Ponuda, { foreignKey: 'nekretnina_id' });
Ponuda.belongsTo(Nekretnina, { foreignKey: 'nekretnina_id' });

Ponuda.belongsTo(Ponuda, { foreignKey: 'vezanePonude' }); // Samoreferencirajuća veza

module.exports = {
  sequelize,
  Korisnik,
  Nekretnina,
  Upit,
  Zahtjev,
  Ponuda,
};

const app = express();
const PORT = 3000;

app.use(session({
  secret: 'tajna sifra',
  resave: true,
  saveUninitialized: true
}));

app.use(express.static(__dirname + '/public'));

// Enable JSON parsing without body-parser
app.use(express.json());


/* ---------------- SERVING HTML -------------------- */

// Async function for serving html files
async function serveHTMLFile(req, res, fileName) {
  const htmlPath = path.join(__dirname, 'public/html', fileName);
  try {
    const content = await fs.readFile(htmlPath, 'utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error serving HTML file:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
}

// Array of HTML files and their routes
const routes = [
  { route: '/nekretnine.html', file: 'nekretnine.html' },
  { route: '/detalji.html', file: 'detalji.html' },
  { route: '/meni.html', file: 'meni.html' },
  { route: '/prijava.html', file: 'prijava.html' },
  { route: '/profil.html', file: 'profil.html' },
  {route: '/vijesti.html', file: 'vijesti.html' },
  {route: '/statistika.html', file: 'statistika.html' },
  // Practical for adding more .html files as the project grows
  { route: '/mojiUpiti.html', file: 'mojiUpiti.html' },
];

// Loop through the array so HTML can be served
routes.forEach(({ route, file }) => {
  app.get(route, async (req, res) => {
    await serveHTMLFile(req, res, file);
  });
});

/* ----------- SERVING OTHER ROUTES --------------- */

// Async function for reading json data from data folder 
async function readJsonFile(filename) {
  const filePath = path.join(__dirname, 'data', `${filename}.json`);
  try {
    const rawdata = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(rawdata);
  } catch (error) {
    throw error;
  }
}

// Async function for reading json data from data folder 
async function saveJsonFile(filename, data) {
  const filePath = path.join(__dirname, 'data', `${filename}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw error;
  }
}

const loginAttempts = {};
const BLOCK_DURATION = 60000; // 1 minut


app.post('/login', async (req, res) => {
  const jsonObj = req.body;
  const username = jsonObj.username;
  const password = jsonObj.password; // Lozinka iz zahtjeva
  const logFilePath = path.join(__dirname, 'data', 'prijave.txt');

  // Funkcija za logovanje pokušaja u fajl
  async function logAttempt(username, status) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] - username: "${username}" - status: "${status}"\n`;
    await fs.appendFile(logFilePath, logEntry);
  }

  try {
    // Provjera blokade
    if (loginAttempts[username]) {
      const { blockedUntil } = loginAttempts[username];

      if (blockedUntil && blockedUntil > Date.now()) {
        await logAttempt(username, 'neuspješno - blokiran');
        return res.status(429).json({ greska: 'Previše neuspješnih pokušaja. Pokušajte ponovo za 1 minut.' });
      }

      // Ako je blokada istekla, resetujemo podatke
      if (blockedUntil && blockedUntil <= Date.now()) {
        loginAttempts[username] = { count: 0, blockedUntil: 0 };
      }
    }

    // Traženje korisnika u bazi podataka koristeći Sequelize
    const korisnik = await Korisnik.findOne({ where: { username } });

    if (korisnik) {
      // Provjera lozinke koristeći bcrypt

      const isPasswordMatched = await bcrypt.compare(password, korisnik.password);
      //const isPasswordMatched = true;
      if (isPasswordMatched) {
        // Postavljanje sesije
        req.session.username = korisnik.username;
        req.session.userId = korisnik.id;

        // Resetovanje brojača pokušaja
        loginAttempts[username] = { count: 0, blockedUntil: 0 };

        // Logovanje uspješnog pokušaja
        await logAttempt(username, 'uspješno');

        return res.json({ poruka: 'Uspješna prijava' });
      }
    }

    // Ako korisnik nije pronađen ili lozinka nije tačna
    if (!loginAttempts[username]) {
      loginAttempts[username] = { count: 0, blockedUntil: 0 };
    }
    loginAttempts[username].count++;

    // Blokiranje korisnika ako dostigne limit
    if (loginAttempts[username].count >= 3) {
      loginAttempts[username].blockedUntil = Date.now() + BLOCK_DURATION;
      await logAttempt(username, 'neuspješno - blokiran');
      return res.status(429).json({ greska: 'Previše neuspješnih pokušaja. Pokušajte ponovo za 1 minut.' });
    }

    // Logovanje neuspješnog pokušaja
    await logAttempt(username, 'neuspješno');
    return res.json({ poruka: 'Neuspješna prijava' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ greska: 'Interna greška servera' });
  }
});


/*
Delete everything from the session.
*/
app.post('/logout', (req, res) => {
  // Check if the user is authenticated
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // Clear all information from the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).json({ greska: 'Internal Server Error' });
    } else {
      res.status(200).json({ poruka: 'Uspješno ste se odjavili' });
    }
  });
});


/*
Ruta: /upiti/moji
Metoda: GET
Opis: Vraća sve upite za loginovanog korisnika.
*/
app.get('/upiti/moji', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  try {
    const korisnikID = req.session.userId;

    // Dohvati sve upite za trenutnog korisnika
    const upiti = await Upit.findAll({
      where: { korisnik_id: korisnikID },
      include: [
        {
          model: Nekretnina,
          attributes: ['id', 'naziv'], // Dohvati samo potrebne atribute
        },
      ],
    });

    if (upiti.length === 0) {
      return res.status(404).json([]);
    }

    // Formatiraj odgovor
    const korisnikoviUpiti = upiti.map((upit) => ({
      id: upit.Nekretnina.id, // ID nekretnine
      tekst_upita: upit.tekst_upita,
      naziv_nekretnine: upit.Nekretnina.naziv, // Dodajte naziv nekretnine
    }));

    res.status(200).json(korisnikoviUpiti);
  } catch (error) {
    console.error('Greška prilikom dohvatanja upita:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});

/*
Returns currently logged user data. First takes the username from the session and grabs other data
from the .json file.
*/
app.get('/korisnik', async (req, res) => {
  // Provjera da li je korisnik prijavljen
  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  const usernameK = req.session.username;
  try {
    // Dohvati korisnika iz baze podataka koristeći Sequelize
    const user = await Korisnik.findOne({
      where: { username:usernameK },
      attributes: ['id', 'ime', 'prezime', 'username', 'admin'], // Isključite lozinku iz odgovora
    });

    if (!user) {
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Pošalji podatke o korisniku
    res.status(200).json(user);
  } catch (error) {
    console.error('Greška prilikom dohvatanja podataka o korisniku:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});

// Ruta za vraćanje 5 posljednje objavljenih nekretnina na zadanoj lokaciji
app.get('/nekretnine/top5', async (req, res) => {
  const lokacija = req.query.lokacija;

  if (!lokacija) {
    return res.status(400).json({ greska: 'Lokacija nije navedena.' });
  }

  try {
    const nekretnine = await Nekretnina.findAll({
      where: { lokacija },
      order: [['datum_objave', 'DESC']], // Sortiraj po datumu objave (od najnovijeg)
      limit: 5, // Ograniči na 5 rezultata
      attributes: ['id', 'tip_nekretnine', 'naziv', 'kvadratura', 'cijena', 'tip_grijanja', 'lokacija', 'godina_izgradnje', 'datum_objave', 'opis'], // Odaberi atribute
    });

    if (nekretnine.length === 0) {
      return res.status(404).json([]);
    }

    // Pošalji filtrirane nekretnine
    res.status(200).json(nekretnine);
  } catch (error) {
    console.error('Greška prilikom dohvatanja nekretnina:', error);
    res.status(500).json({ greska: 'Interna greška servera.' });
  }
});

app.get('/nekretnina/:id', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);

  try {
    // Dohvati nekretninu i njenih 3 najnovija upita
    const nekretnina = await Nekretnina.findOne({
      where: { id: nekretninaId },
      include: [
        {
          model: Upit, // Bez 'as' jer niste koristili alijase u definiciji veze
          limit: 3,    // Ograniči na 3 upita
          order: [['id', 'DESC']], // Sortiraj upite po ID-u (od najnovijeg)
        },
      ],
      attributes: ['id', 'tip_nekretnine', 'naziv', 'kvadratura', 'cijena', 'tip_grijanja', 'lokacija', 'godina_izgradnje', 'datum_objave', 'opis'],
    });

    // Ako nekretnina nije pronađena
    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }

    // Formatiraj odgovor
    const detaljiNekretnine = {
      id: nekretnina.id,
      tip_nekretnine: nekretnina.tip_nekretnine,
      naziv: nekretnina.naziv,
      kvadratura: nekretnina.kvadratura,
      cijena: nekretnina.cijena,
      tip_grijanja: nekretnina.tip_grijanja,
      lokacija: nekretnina.lokacija,
      godina_izgradnje: nekretnina.godina_izgradnje,
      datum_objave: nekretnina.datum_objave,
      opis: nekretnina.opis,
      upiti: nekretnina.Upits.map((upit) => ({ // Ovdje koristimo 'Upits' jer Sequelize automatski pluralizuje ime modela
        id: upit.id,
        tekst_upita: upit.tekst_upita,
      })),
    };

    res.status(200).json(detaljiNekretnine);
  } catch (error) {
    console.error('Greška prilikom dohvatanja detalja o nekretnini:', error);
    res.status(500).json({ greska: 'Interna greška servera.', detalji: error.message });
  }
});

app.get('/next/upiti/nekretnina:id', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);
  const page = parseInt(req.query.page);

  // Provjera da li je page >= 1
  if (page < 1) {
    return res.status(400).json({ greska: 'Page mora biti >= 1.' });
  }

  try {
    // Dohvati nekretninu po ID-u
    const nekretnina = await Nekretnina.findOne({
      where: { id: nekretninaId },
    });

    // Ako nekretnina nije pronađena
    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }

    // Izračunaj offset i limit za paginaciju
    const limit = 3; // Broj upita po stranici
    const offset = (page - 1) * limit; // Početni indeks

    // Dohvati upite za datu nekretninu sa paginacijom
    const upiti = await Upit.findAll({
      where: { nekretnina_id: nekretninaId },
      order: [['id', 'ASC']], // Sortiraj upite po ID-u (od najstarijeg)
      limit: limit,
      offset: offset,
    });

    // Ako nema upita za datu stranicu
    if (upiti.length === 0) {
      return res.status(404).json([]);
    }

    // Pošalji upite
    res.status(200).json(upiti);
  } catch (error) {
    console.error('Greška prilikom dohvatanja upita:', error);
    res.status(500).json({ greska: 'Interna greška servera.' });
  }
});

app.get('/nekretnina/:id/interesovanja', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);

  try {
    // Dohvati nekretninu
    const nekretnina = await Nekretnina.findByPk(nekretninaId);

    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }

    // Dohvati prijavljenog korisnika (ako postoji)
    const korisnik = req.session.username
      ? await Korisnik.findOne({ where: { username: req.session.username } })
      : null;

    // Dohvati sva interesovanja za nekretninu
    const upiti = await nekretnina.getUpits();
    const zahtjevi = await nekretnina.getZahtjevs();
    const ponude = await nekretnina.getPonudas();

    // Kombinuj sve u jedan niz i dodaj atribut "tip"
    let interesovanja = [
      ...upiti.map(upit => ({ ...upit.toJSON(), tip: 'upit' })),
      ...zahtjevi.map(zahtjev => ({ ...zahtjev.toJSON(), tip: 'zahtjev' })),
      ...ponude.map(ponuda => ({ ...ponuda.toJSON(), tip: 'ponuda' }))
    ];

    // Ako korisnik nije admin, filtriraj ponude
    if (!korisnik || !korisnik.admin) {
      interesovanja = interesovanja.map(interesovanje => {
        if (interesovanje.tip === 'ponuda') {
          const isKorisnikovaPonuda = korisnik && interesovanje.korisnik_id === korisnik.id;
          const isVezanaZaKorisnikovuPonudu = korisnik && interesovanje.vezanePonude && interesovanje.vezanePonude.korisnik_id === korisnik.id;

          if (!isKorisnikovaPonuda && !isVezanaZaKorisnikovuPonudu) {
            // Ukloni atribut cijene ako korisnik nema pravo da ga vidi
            const { cijenaPonude, ...filteredPonuda } = interesovanje;
            return filteredPonuda;
          }
        }
        return interesovanje;
      });
    }

    res.status(200).json(interesovanja);
  } catch (error) {
    console.error('Greška prilikom dohvatanja interesovanja:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});


app.post('/nekretnina/:id/ponuda', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);
  const { tekst, ponudaCijene, datumPonude, idVezanePonude, odbijenaPonuda } = req.body;

  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }
  console.log(datumPonude);
  try {
    const korisnik = await Korisnik.findOne({
      where: { username: req.session.username },
    });

    if (!korisnik) {
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }
    const nekretnina = await Nekretnina.findByPk(nekretninaId);

    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }
    if (idVezanePonude !== null) {
      const vezanaPonuda = await Ponuda.findByPk(idVezanePonude);

      if (!vezanaPonuda) {
        return res.status(404).json({ greska: 'Vezana ponuda nije pronađena.' });
      }

      if (vezanaPonuda.odbijenaPonuda) {
        return res.status(400).json({ greska: 'Ova ponuda je već odbijena. Nije moguće dodati novu ponudu.' });
      }

      if (!korisnik.admin && vezanaPonuda.korisnik_id !== korisnik.id) {
        return res.status(403).json({ greska: 'Nemate pravo da odgovorite na ovu ponudu.' });
      }
    }

    const novaPonuda = await Ponuda.create({
      tekst_upita: tekst,
      cijenaPonude: ponudaCijene,
      datumPonude: datumPonude,
      nekretnina_id: nekretninaId,
      korisnik_id: korisnik.id,
      vezanePonude: idVezanePonude,
      odbijenaPonuda: odbijenaPonuda || false, // Ako nije poslano, podrazumevano je false
    });
    console.log("kraj");
    res.status(200).json({ poruka: 'Ponuda je uspješno kreirana.', ponuda: novaPonuda });
  } catch (error) {
    console.error('Greška prilikom kreiranja ponude:', error);
    res.status(404).json({ greska: 'Internal Server Error' });
  }
});


app.post('/nekretnina/:id/zahtjev', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);
  const { tekst, trazeniDatum } = req.body;

  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  try {
    const korisnik = await Korisnik.findOne({
      where: { username: req.session.username },
    });

    if (!korisnik) {
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    const trenutniDatum = new Date();
    const datumZahtjeva = new Date(trazeniDatum);

    if (datumZahtjeva < trenutniDatum) {
      return res.status(404).json({ greska: 'Traženi datum ne može biti raniji od trenutnog datuma.' });
    }

    const nekretnina = await Nekretnina.findByPk(nekretninaId);

    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }

    const noviZahtjev = await Zahtjev.create({
      tekst_upita: tekst,
      trazeniDatum: datumZahtjeva,
      nekretnina_id: nekretninaId,
      korisnik_id: korisnik.id,
      odobren: false, // Podrazumevano, zahtjev nije odobren
    });

    res.status(200).json({ poruka: 'Zahtjev je uspješno kreiran.', zahtjev: noviZahtjev });
  } catch (error) {
    console.error('Greška prilikom kreiranja zahtjeva:', error);
    res.status(404).json({ greska: 'Internal Server Error' });
  }
});

app.put('/nekretnina/:id/zahtjev/:zid', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);
  const zahtjevId = parseInt(req.params.zid);
  const { odobren, addToTekst } = req.body;

  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  try {
    const korisnik = await Korisnik.findOne({
      where: { username: req.session.username },
    });

    if (!korisnik.admin) {
      return res.status(403).json({ greska: 'Samo admin može odgovoriti na zahtjev.' });
    }

    const zahtjev = await Zahtjev.findOne({
      where: { id: zahtjevId, nekretnina_id: nekretninaId },
    });

    if (!zahtjev) {
      return res.status(404).json({ greska: 'Zahtjev nije pronađen.' });
    }

    if (odobren === false && !addToTekst) {
      return res.status(404).json({ greska: 'addToTekst je obavezan ako zahtjev nije odobren.' });
    }

    zahtjev.odobren = odobren;

    // Dodaj odgovor admina na kraj teksta zahtjeva
    if (addToTekst) {
      zahtjev.tekst_upita += `\nODGOVOR ADMINA: ${addToTekst}`;
    }

    await zahtjev.save();

    res.status(200).json({ poruka: 'Zahtjev je uspješno ažuriran.', zahtjev });
  } catch (error) {
    console.error('Greška prilikom ažuriranja zahtjeva:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});

/*
Allows logged user to make a request for a property
*/
app.post('/upit', async (req, res) => {
  // Provjera da li je korisnik prijavljen
  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // Podaci iz zahtjeva
  const { nekretnina_id, tekst_upita } = req.body;
  // Validacija podataka
  if (!nekretnina_id || !tekst_upita) {
    return res.status(404).json({ greska: 'Nekretnina ID i tekst upita su obavezni.' });
  }

  try {
    // Dohvati prijavljenog korisnika
    const loggedInUser = await Korisnik.findOne({
      where: { username: req.session.username },
    });

    if (!loggedInUser) {
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Provjeri da li nekretnina postoji
    const nekretnina = await Nekretnina.findOne({
      where: { id: nekretnina_id },
    });

    if (!nekretnina) {
      return res.status(404).json({ greska: `Nekretnina sa id-em ${nekretnina_id} ne postoji` });
    }


    // Dodaj novi upit
    const noviUpit = await Upit.create({
      nekretnina_id: nekretnina_id, // Ovo je strani ključ za Nekretnina
      korisnik_id: loggedInUser.id, // Ovo je strani ključ za Korisnik
      tekst_upita: tekst_upita,     // Ovo je sadržaj upita
    });

    res.status(200).json({ poruka: 'Upit je uspješno dodan', upit: noviUpit });
  } catch (error) {
    console.error('Greška prilikom obrade upita:', error);
    res.status(404).json({ greska: 'Internal Server Error' });
  }
});
/*
Updates any user field
*/
app.put('/korisnik', async (req, res) => {
  // Provjera da li je korisnik prijavljen
  if (!req.session.username) {
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // Podaci iz zahtjeva
  const { ime, prezime, username, password } = req.body;

  try {
    // Dohvati prijavljenog korisnika
    const loggedInUser = await Korisnik.findOne({
      where: { username: req.session.username },
    });

    if (!loggedInUser) {
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Ažuriraj podatke o korisniku
    if (ime) loggedInUser.ime = ime;
    if (prezime) loggedInUser.prezime = prezime;
    if (username) loggedInUser.username = username;
    if (password) {
      // Hashovanje nove lozinke
      const hashedPassword = await bcrypt.hash(password, 10);
      loggedInUser.password = hashedPassword;
    }

    // Sačuvaj promjene u bazi
    await loggedInUser.save();

    res.status(200).json({ poruka: 'Podaci su uspješno ažurirani' });
  } catch (error) {
    console.error('Greška prilikom ažuriranja podataka o korisniku:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});
/*
Returns all properties from the file.
*/
app.get('/nekretnine', async (req, res) => {
  try {
    const nekretnineData = await readJsonFile('nekretnine');
    res.json(nekretnineData);
  } catch (error) {
    console.error('Error fetching properties data:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});

/* ----------------- MARKETING ROUTES ----------------- */

// Route that increments value of pretrage for one based on list of ids in nizNekretnina
app.post('/marketing/nekretnine', async (req, res) => {
  const { nizNekretnina } = req.body;

  try {
    // Load JSON data
    let preferencije = await readJsonFile('preferencije');

    // Check format
    if (!preferencije || !Array.isArray(preferencije)) {
      console.error('Neispravan format podataka u preferencije.json.');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Init object for search
    preferencije = preferencije.map((nekretnina) => {
      nekretnina.pretrage = nekretnina.pretrage || 0;
      return nekretnina;
    });

    // Update atribute pretraga
    nizNekretnina.forEach((id) => {
      const nekretnina = preferencije.find((item) => item.id === id);
      if (nekretnina) {
        nekretnina.pretrage += 1;
      }
    });

    // Save JSON file
    await saveJsonFile('preferencije', preferencije);

    res.status(200).json({});
  } catch (error) {
    console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/marketing/nekretnina/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Read JSON 
    const preferencije = await readJsonFile('preferencije');

    // Finding the needed objects based on id
    const nekretninaData = preferencije.find((item) => item.id === parseInt(id, 10));

    if (nekretninaData) {
      // Update clicks
      nekretninaData.klikovi = (nekretninaData.klikovi || 0) + 1;

      // Save JSON file
      await saveJsonFile('preferencije', preferencije);

      res.status(200).json({ success: true, message: 'Broj klikova ažuriran.' });
    } else {
      res.status(404).json({ error: 'Nekretnina nije pronađena.' });
    }
  } catch (error) {
    console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/marketing/osvjezi/pretrage', async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    // Read JSON 
    const preferencije = await readJsonFile('preferencije');

    // Finding the needed objects based on id
    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, pretrage: nekretninaData ? nekretninaData.pretrage : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/marketing/osvjezi/klikovi', async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    // Read JSON 
    const preferencije = await readJsonFile('preferencije');

    // Finding the needed objects based on id
    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, klikovi: nekretninaData ? nekretninaData.klikovi : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
