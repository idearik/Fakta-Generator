const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const base64 = require('base-64');
const serverless = require('serverless-http');
const path = require('path');
const session = require('express-session');

dotenv.config();

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(session({
  secret: 'your-secret-key', // Replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 } // Session duration: 1 minute for testing, adjust as needed
}));

let serviceAccount;
try {
  serviceAccount = JSON.parse(base64.decode(process.env.GOOGLE_SERVICE_ACCOUNT));
} catch (error) {
  console.error('Error decoding service account JSON:', error.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

const getRandomFact = (rows, seenFacts) => {
  const availableFacts = rows.filter((_, index) => !seenFacts.includes(index));
  if (availableFacts.length === 0) {
    return null; // All facts have been seen
  }
  const randomIndex = Math.floor(Math.random() * availableFacts.length);
  const factIndex = rows.indexOf(availableFacts[randomIndex]);
  return { fact: availableFacts[randomIndex], factIndex };
};

app.get('/', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1rUWXBFW6f_rlJlUgKADpo_Bag0lkDSxKsTRobOPguZ8',
      range: 'Sheet1!A2:B',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the spreadsheet.');
    }

    req.session.seenFacts = req.session.seenFacts || [];
    const result = getRandomFact(rows, req.session.seenFacts);
    if (!result) {
      req.session.seenFacts = []; // Reset if all facts have been seen
      const retryResult = getRandomFact(rows, req.session.seenFacts);
      if (!retryResult) {
        throw new Error('No available facts.');
      }
      req.session.seenFacts.push(retryResult.factIndex);
      const year = retryResult.fact[0];
      const fact = retryResult.fact[1];
      res.render('index', { year, fact });
    } else {
      req.session.seenFacts.push(result.factIndex);
      const year = result.fact[0];
      const fact = result.fact[1];
      res.render('index', { year, fact });
    }
  } catch (error) {
    console.error('Error retrieving data:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error retrieving data');
  }
});

app.get('/fact', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1rUWXBFW6f_rlJlUgKADpo_Bag0lkDSxKsTRobOPguZ8',
      range: 'Sheet1!A2:B',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the spreadsheet.');
    }

    req.session.seenFacts = req.session.seenFacts || [];
    const result = getRandomFact(rows, req.session.seenFacts);
    if (!result) {
      req.session.seenFacts = []; // Reset if all facts have been seen
      const retryResult = getRandomFact(rows, req.session.seenFacts);
      if (!retryResult) {
        throw new Error('No available facts.');
      }
      req.session.seenFacts.push(retryResult.factIndex);
      const year = retryResult.fact[0];
      const fact = retryResult.fact[1];
      res.json({ year, fact });
    } else {
      req.session.seenFacts.push(result.factIndex);
      const year = result.fact[0];
      const fact = result.fact[1];
      res.json({ year, fact });
    }
  } catch (error) {
    console.error('Error retrieving data:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error retrieving data');
  }
});

module.exports = app;
module.exports.handler = serverless(app);
