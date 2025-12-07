
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL || null;

app.set('trust proxy', true); // trust X-Forwarded-For if behind proxy
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Init DB
const db = new sqlite3.Database(path.join(__dirname, 'ips.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    forwarded_for TEXT,
    user_agent TEXT,
    consent_time TEXT
  )`);
});

app.post('/consent', async (req, res) => {
  try {
    if (!req.body || req.body.consent !== true) {
      return res.status(400).json({ ok: false, error: 'consent not true' });
    }

    // Determine client IP
    const forwarded = (req.headers['x-forwarded-for'] || '').toString();
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection.remoteAddress);
    const ua = req.headers['user-agent'] || '';
    const now = new Date().toISOString();

    // Store in DB
    db.run('INSERT INTO ips (ip, forwarded_for, user_agent, consent_time) VALUES (?, ?, ?, ?)', [ip, forwarded, ua, now], function(err){
      if (err) console.error('DB insert error', err);
    });

    // Send to Discord webhook if configured
    if (WEBHOOK) {
      try {
        const content = `New consent recorded:\nIP: ${ip}\nForwarded: ${forwarded || 'N/A'}\nUA: ${ua}\nTime: ${now}`;
        await axios.post(WEBHOOK, { content: content });
      } catch (err) {
        console.error('Failed sending to webhook', err.toString());
      }
    } else {
      console.warn('DISCORD_WEBHOOK_URL not set; skipping sending to Discord');
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'server error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
