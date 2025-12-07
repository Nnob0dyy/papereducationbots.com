// api/consent.js
// Safe, minimal implementation — avoids template literals to prevent copy/paste syntax errors.

module.exports = async (req, res) => {
  try {
    console.log('/api/consent invoked, method=', req.method);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const body = req.body || {};
    if (!body.consent) {
      return res.status(400).json({ ok: false, error: 'consent not provided' });
    }

    const forwardedHeader = (req.headers['x-forwarded-for'] || '').toString();
    const ip = forwardedHeader ? forwardedHeader.split(',')[0].trim() :
             (req.socket && req.socket.remoteAddress) || null;
    const ua = req.headers['user-agent'] || '';
    const now = new Date().toISOString();

    // Optionally hash IP
    let storedIp = ip;
    if (process.env.HASH_IP === '1' && ip) {
      const crypto = require('crypto');
      const salt = process.env.HASH_SALT || '';
      storedIp = crypto.createHash('sha256').update(ip + salt).digest('hex');
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      // build URL by concatenation to avoid template literal issues
      const insertUrl = supabaseUrl + '/rest/v1/ips';

      // use global fetch (Node 18+ / Vercel provides fetch). If fetch is undefined, it will throw.
      const resp = await fetch(insertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ip: storedIp,
          forwarded_for: forwardedHeader || null,
          user_agent: ua,
          consent_time: now
        })
      });

      // optional logging for debugging
      if (!resp.ok) {
        const text = await resp.text().catch(() => '[no body]');
        console.error('Supabase insert failed status=', resp.status, 'body=', text);
      }
    } else {
      console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; skipping DB insert');
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const dResp = await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'New consent recorded\\nIP: ' + (storedIp || 'N/A') + '\\nForwarded: ' + (forwardedHeader || 'N/A') + '\\nUA: ' + ua + '\\nTime: ' + now
          })
        });
        if (!dResp.ok) {
          console.error('Discord webhook returned status', dResp.status);
        }
      } catch (err) {
        console.error('Discord webhook error', err && err.toString ? err.toString() : err);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unhandled error in /api/consent:', err && err.toString ? err.toString() : err);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
};
