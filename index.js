// index.js
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load credentials from the service account JSON file
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json')));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getAuthClient() {
  const authClient = await auth.getClient();
  return authClient;
}

const spreadsheetId = '1rUWXBFW6f_rlJlUgKADpo_Bag0lkDSxKsTRobOPguZ8';

async function getRandomFact() {
  const authClient = await getAuthClient();
  const request = {
    spreadsheetId,
    range: 'Sheet1!A2:B', // Adjusted the range to include columns A and B
    auth: authClient,
  };

  try {
    const response = await google.sheets('v4').spreadsheets.values.get(request);
    const data = response.data.values;
    if (data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      const year = data[randomIndex][0];
      const fact = data[randomIndex][1];
      return { year, fact };
    } else {
      return { year: 'Unknown', fact: 'No facts available.' };
    }
  } catch (err) {
    console.error('Error reading data from Google Sheets:', err);
    return { year: 'Error', fact: 'Error fetching fact.' };
  }
}

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', async (req, res) => {
  const { year, fact } = await getRandomFact();
  res.render('index', { year, fact });
});

app.get('/fact', async (req, res) => {
  const { year, fact } = await getRandomFact();
  res.json({ year, fact });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
