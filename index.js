import express from 'express';
import { createHmac } from "crypto";
import { google } from 'googleapis';
import 'dotenv/config'

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const googleApiKey = process.env.GOOGLE_API_KEY;
const channelSecret = process.env.LINE_CHANNEL_SECRET; // Line Channel secret string

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors() {
  const sheets = google.sheets({version: 'v4', auth: googleApiKey});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  }
  console.log('Name, Major:');
  rows.forEach((row) => {
    // Print columns A and E, which correspond to indices 0 and 4.
    console.log(`${row[0]}, ${row[4]}`);
  });
}



// const googleClient = await authorize();

app.get('/', (req, res) => {
    res.send('Hello World!');
    listMajors();
})

app.post('/webhook', (req, res) => {
    const rcvSignature = req.header("x-line-signature");
    if(rcvSignature != null && rcvSignature != '' && rcvSignature != ' '){
        const body = req.body;
        const bodyString = JSON.stringify(body);
        const signature = createHmac("SHA256", channelSecret).update(bodyString).digest("base64");
        if (rcvSignature == signature) {
            console.log(body);
            res.status(200).send();
        }
    }
    res.status(401).send();
})
  
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})