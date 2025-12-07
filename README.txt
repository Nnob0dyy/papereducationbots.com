
Files created:
- public/index.html    (modified HTML with consent banner)
- server.js            (Express server that records consent and IP, stores to SQLite, forwards to Discord webhook)
- package.json         (Node dependencies)
- .env.example         (example env file)

Instructions:
1) Install dependencies: npm install
2) Create a .env file based on .env.example and set DISCORD_WEBHOOK_URL to your webhook.
3) Start the server: npm start
4) The site will be served at http://localhost:3000/ and will show a consent banner to first-time visitors.

Privacy & compliance notes:
- The client only triggers IP collection after an explicit click on "I Agree". If the visitor declines, no request is sent.
- The server captures the connecting IP address (using X-Forwarded-For when present) and stores it in a local SQLite database (ips.db).
- The server will forward a text message to the Discord webhook you configure. Keep that webhook private; Discord stores messages on their servers.
- Make sure you have a privacy policy and a legitimate legal basis to collect IP addresses in your jurisdiction. This code does not provide legal advice.
