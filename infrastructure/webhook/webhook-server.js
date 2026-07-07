/**
 * Minimal GitHub webhook listener.
 * Verifies the X-Hub-Signature-256 HMAC and redeploys the repo that pushed.
 *
 * Run with: WEBHOOK_SECRET=xxxx node webhook-server.js  (or via the systemd unit)
 * GitHub webhook URL: http://<server>/hooks/deploy  (proxied by Nginx to :9000)
 */
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = process.env.WEBHOOK_SECRET;
if (!SECRET) {
  console.error('WEBHOOK_SECRET env var is required');
  process.exit(1);
}

const DEPLOY = {
  'pulse-backend': 'cd /home/ubuntu/apps/pulse-backend && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build api',
  'pulse-frontend':
    'cd /home/ubuntu/apps/pulse-frontend && git pull origin main && ' +
    'docker build -t pulse-web --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" . && ' +
    'docker rm -f pulse-web || true; docker run -d --name pulse-web --restart always -p 127.0.0.1:3000:3000 pulse-web',
};

http
  .createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/hooks/deploy') {
      res.writeHead(404); return res.end('Not found');
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const sig = req.headers['x-hub-signature-256'] || '';
      const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
      const valid = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!valid) { res.writeHead(401); return res.end('Bad signature'); }

      let payload;
      try { payload = JSON.parse(body); } catch { res.writeHead(400); return res.end('Bad JSON'); }

      const repo = payload?.repository?.name;
      const branch = (payload?.ref || '').replace('refs/heads/', '');
      const cmd = DEPLOY[repo];

      if (!cmd || branch !== 'main') { res.writeHead(200); return res.end('Ignored'); }

      console.log(`[${new Date().toISOString()}] Deploying ${repo}@${branch}…`);
      res.writeHead(202); res.end('Deploying');
      exec(cmd, { shell: '/bin/bash' }, (err, stdout, stderr) => {
        if (err) console.error(`Deploy failed for ${repo}:`, stderr);
        else console.log(`Deploy OK for ${repo}:`, stdout.slice(-500));
      });
    });
  })
  .listen(9000, () => console.log('Webhook listener on :9000 (path /hooks/deploy)'));
