const express = require('express');
const session = require("express-session");
const path = require('path');
const fs = require('fs').promises; // Using asynchronus API for file read and write
const bcrypt = require('bcrypt');
const { json } = require('stream/consumers');

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
        res.status(429).json({ greska: 'Previše neuspješnih pokušaja. Pokušajte ponovo za 1 minut.' });
      }

      // Ako je blokada istekla, resetujemo podatke
      if (blockedUntil && blockedUntil <= Date.now()) {
        loginAttempts[username] = { count: 0, blockedUntil: 0 };
      }
    }

    const data = await fs.readFile(path.join(__dirname, 'data', 'korisnici.json'), 'utf-8');
    const korisnici = JSON.parse(data);
    let found = false;

    for (const korisnik of korisnici) {
      if (korisnik.username === username) {
        const isPasswordMatched = await bcrypt.compare(jsonObj.password, korisnik.password);
        //const isPasswordMatched = true;  za testiranje mozes ovo postaviti
        if (isPasswordMatched) {
          req.session.username = korisnik.username;
          req.session.userId = korisnik.id;
          loginAttempts[username] = { count: 0, blockedUntil: 0 }; // Resetujemo pokušaje
          await logAttempt(username, 'uspješno');
          found = true;
          break;
        }
      }
    }

    if (found) {
      res.json({ poruka: 'Uspješna prijava' });
    } else {
      // Ažuriramo broj pokušaja
      if (!loginAttempts[username]) {
        loginAttempts[username] = { count: 0, blockedUntil: 0 };
      }
      loginAttempts[username].count++;

      // Blokiramo korisnika ako dostigne limit
      if (loginAttempts[username].count >= 3) {
        loginAttempts[username].blockedUntil = Date.now() + BLOCK_DURATION;
        await logAttempt(username, 'neuspješno - blokiran');
        return res.status(429).json({ greska: 'Previše neuspješnih pokušaja. Pokušajte ponovo za 1 minut.' });
      }

      await logAttempt(username, 'neuspješno');
      res.json({ poruka: 'Neuspješna prijava' });
    }
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
    const nekretnine = await readJsonFile('nekretnine');
    const korisnikID = req.session.userId;
    const korisnikoviUpiti = nekretnine.flatMap((nekretnina) =>
      nekretnina.upiti
        .filter((upit) => upit.korisnik_id === korisnikID) 
        .map((upit) => ({
          id: nekretnina.id, 
          tekst_upita: upit.tekst_upita,
        }))
    );
    if (korisnikoviUpiti.length === 0) {
      return res.status(404).json([]);
    }
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
  // Check if the username is present in the session
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // User is logged in, fetch additional user data
  const username = req.session.username;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile('korisnici');

    // Find the user by username
    const user = users.find((u) => u.username === username);

    if (!user) {
      // User not found (should not happen if users are correctly managed)
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Send user data
    const userData = {
      id: user.id,
      ime: user.ime,
      prezime: user.prezime,
      username: user.username,
      password: user.password // Should exclude the password for security reasons
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
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
    const nekretnine = await readJsonFile('nekretnine'); 

    const filtriraneNekretnine = nekretnine
      .filter(n => n.lokacija === lokacija)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum))
      .slice(0, 5);
    res.status(200).json(filtriraneNekretnine);
  } catch (error) {
    console.error('Greška prilikom čitanja nekretnina:', error);
    res.status(500).json({ greska: 'Interna greška servera.' });
  }
});

app.get('/nekretnina/:id', async (req, res) => {
  const nekretninaId  = parseInt(req.params.id); // Čita ID nekretnine iz parametra URL-a
  
  try {
    const nekretnine = await readJsonFile('nekretnine'); 
    const nekretnina = nekretnine.find(n => n.id === nekretninaId );
  
    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }
  
    const skraćeniUpiti = nekretnina.upiti.slice(-3);
  
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
      upiti: skraćeniUpiti
    };

    res.status(200).json(detaljiNekretnine);
  } catch (error) {
    console.error('Greška prilikom čitanja nekretnina:', error);
    res.status(500).json({ greska: 'Interna greška servera.', detalji: error.message });
  }
});

app.get('/next/upiti/nekretnina:id', async (req, res) => {
  const nekretninaId = parseInt(req.params.id);
  const page = parseInt(req.query.page);

  if (page < 1){
    return res.status(400),json({ greska: 'Page mora biti >= 1.' });
  }
  try {
    const nekretnine = await readJsonFile('nekretnine');
    const nekretnina = nekretnine.find(n => n.id === nekretninaId);
    if (!nekretnina) {
      return res.status(404).json({ greska: 'Nekretnina s tim ID-em nije pronađena.' });
    }
    let startIndex = 0;
    for (let i = 1; i < page; i++) { startIndex+=3; }
    const endIndex = page * 3;
    const nextUpiti = nekretnina.upiti.slice(startIndex, endIndex);
    if (nextUpiti.length === 0) {
      return res.status(404).json([]);
    }
    res.status(200).json(nextUpiti);
  }catch (error) {
  console.error('Greška prilikom čitanja nekretnina:', error);
  res.status(500).json({ greska: 'Interna greška servera.' });
}
});



/*
Allows logged user to make a request for a property
*/
app.post('/upit', async (req, res) => {
  // Check if the user is authenticated
  if (!req.session.user) {
    // User is not logged in
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // Get data from the request body
  const { nekretnina_id, tekst_upita } = req.body;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile('korisnici');

    // Read properties data from the JSON file
    const nekretnine = await readJsonFile('nekretnine');

    // Find the user by username
    const loggedInUser = users.find((user) => user.username === req.session.username);

    // Check if the property with nekretnina_id exists
    const nekretnina = nekretnine.find((property) => property.id === nekretnina_id);

    if (!nekretnina) {
      // Property not found
      return res.status(400).json({ greska: `Nekretnina sa id-em ${nekretnina_id} ne postoji` });
    }

    // Add a new query to the property's queries array
    nekretnina.upiti.push({
      korisnik_id: loggedInUser.id,
      tekst_upita: tekst_upita
    });

    const userQueriesForProprety = nekretnina.upiti.filter(
      (upit) => upit.korisnik_id === loggedInUser.id
    );

    if (userQueriesForProprety.length >=3) {
      return res.status(429).json({greska:'Previse upita za istu nekretninu.'});
    }

    // Save the updated properties data back to the JSON file
    await saveJsonFile('nekretnine', nekretnine);

    res.status(200).json({ poruka: 'Upit je uspješno dodan' });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ greska: 'Internal Server Error' });
  }
});

/*
Updates any user field
*/
app.put('/korisnik', async (req, res) => {
  // Check if the user is authenticated
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: 'Neautorizovan pristup' });
  }

  // Get data from the request body
  const { ime, prezime, username, password } = req.body;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile('korisnici');

    // Find the user by username
    const loggedInUser = users.find((user) => user.username === req.session.username);

    if (!loggedInUser) {
      // User not found (should not happen if users are correctly managed)
      return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Update user data with the provided values
    if (ime) loggedInUser.ime = ime;
    if (prezime) loggedInUser.prezime = prezime;
    if (username) loggedInUser.username = username;
    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      loggedInUser.password = hashedPassword;
    }

    // Save the updated user data back to the JSON file
    await saveJsonFile('korisnici', users);
    res.status(200).json({ poruka: 'Podaci su uspješno ažurirani' });
  } catch (error) {
    console.error('Error updating user data:', error);
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
