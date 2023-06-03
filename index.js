import express from 'express';
import { createHmac } from "crypto";
import { google } from 'googleapis';
import axios from 'axios';
import 'dotenv/config'

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const googleApiKey = process.env.GOOGLE_API_KEY;
const channelSecret = process.env.LINE_CHANNEL_SECRET; // Line Channel secret string

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function getMajors() {
  const list = [];
  const sheets = google.sheets({version: 'v4', auth: googleApiKey});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return list;
  }
  rows.forEach((row) => {
    list.push({ name: row[0], major: row[4] });
  });
  return list;
}

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/webhook', asyncMiddleware(async (req, res) => {
  const rcvSignature = req.header("x-line-signature");
  if (rcvSignature != null && rcvSignature != '' && rcvSignature != ' ') {
      const body = req.body;
      const bodyString = JSON.stringify(body);
      const signature = createHmac("SHA256", channelSecret).update(bodyString).digest("base64");
      if (rcvSignature == signature) {
          if (body.events && body.events.length > 0 && typeof body.events === 'object') {
            const event = body.events[0];
            if (event && event.type == 'message') {
              const message = event.message;
              if (message && message.type == 'text') {
                const text = message.text;
                const replyToken = message.replyToken;
                console.log(`Receive message: ${text}`);
                const majors = await getMajors();
                const results = majors.filter(x => x.major.toLowerCase() == text.toLowerCase());
                let resText = results.length > 0 ? results.join(",") : 'Not found!';
                const url = 'https://api.line.me/v2/bot/message/reply';
                await axios.post(url, {
                  replyToken: replyToken,
                  messages: [ { type: 'text', text: resText } ]
                }, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelSecret}`
                  }
                });
              }
            }
          }

          res.status(200).send();
      }
  }
  res.status(401).send();
}))
  
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})