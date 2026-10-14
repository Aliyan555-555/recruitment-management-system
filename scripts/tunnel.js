const dns = require('dns');
const { spawn } = require('child_process');

// Ensure IPv4 is prioritized to bypass Windows IPv6 routing timeouts
dns.setDefaultResultOrder('ipv4first');

const port = process.env.PORT || 3000;

async function startTunnel() {
  console.log(`Requesting Cloudflare Tunnel for http://localhost:${port}...`);
  try {
    const res = await fetch('https://api.trycloudflare.com/tunnel', { method: 'POST' });
    const data = await res.json();
    if (!data.success || !data.result) {
      throw new Error(JSON.stringify(data.errors));
    }

    const { id, hostname, account_tag, secret } = data.result;
    const token = Buffer.from(JSON.stringify({ a: account_tag, t: id, s: secret })).toString('base64');

    console.log(`\n======================================================`);
    console.log(`🚀 Cloudflare Tunnel URL: https://${hostname}`);
    console.log(`➡️  Routing traffic to:   http://localhost:${port}`);
    console.log(`======================================================\n`);

    const child = spawn('cloudflared', [
      'tunnel',
      '--edge-ip-version', '4',
      '--protocol', 'http2',
      'run',
      '--token', token,
      '--url', `http://localhost:${port}`
    ], { stdio: 'inherit' });

    child.on('close', (code) => {
      console.log(`Tunnel process exited with code ${code}`);
    });
  } catch (err) {
    console.error('Failed to create Cloudflare tunnel:', err);
    process.exit(1);
  }
}

startTunnel();
