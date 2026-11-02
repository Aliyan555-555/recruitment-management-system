#!/bin/sh
# Docker PDF generation test script
# Run inside container to verify Puppeteer + Chromium works

set -e

echo "=== PDF Generation Test in Docker ==="
echo ""
echo "[1] Checking Chromium binary..."
if [ -f /usr/bin/chromium ]; then
  echo "    ✅ /usr/bin/chromium found"
  /usr/bin/chromium --version 2>/dev/null || echo "    (version check skipped in headless mode)"
else
  echo "    ❌ /usr/bin/chromium NOT found"
  exit 1
fi

echo ""
echo "[2] Checking environment variables..."
echo "    PUPPETEER_EXECUTABLE_PATH=${PUPPETEER_EXECUTABLE_PATH}"
echo "    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD}"
echo "    XDG_CONFIG_HOME=${XDG_CONFIG_HOME}"
echo "    XDG_CACHE_HOME=${XDG_CACHE_HOME}"

echo ""
echo "[3] Checking /tmp is writable (tmpfs)..."
if touch /tmp/test_write_$$ 2>/dev/null; then
  rm -f /tmp/test_write_$$
  echo "    ✅ /tmp is writable"
else
  echo "    ❌ /tmp is NOT writable"
  exit 1
fi

echo ""
echo "[4] Running Puppeteer PDF generation..."
node - <<'NODEEOF'
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
  console.log('    executablePath:', execPath);
  console.log('    exists:', fs.existsSync(execPath));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_pdf_test_'));

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--mute-audio',
        '--hide-scrollbars',
        '--user-data-dir=' + tempDir,
        '--data-path=' + tempDir,
        '--disk-cache-dir=' + path.join(tempDir, 'cache'),
      ],
    });

    console.log('    ✅ Browser launched');

    const page = await browser.newPage();
    await page.setContent(
      `<!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:40px;}</style></head>
        <body>
          <h1>PDF Test — Docker Production</h1>
          <p>Puppeteer + Chromium working in read-only container!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </body>
      </html>`,
      { waitUntil: 'load', timeout: 10000 }
    );

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });

    await browser.close();
    browser = null;

    console.log('    ✅ PDF generated successfully!');
    console.log('    PDF size:', pdf.length, 'bytes');

    if (pdf.length < 1000) {
      console.error('    ❌ PDF suspiciously small — possible render failure');
      process.exit(1);
    }

    console.log('    ✅ PDF size looks valid (>' + pdf.length + ' bytes)');
  } finally {
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
  }
})().catch(err => {
  console.error('    ❌ FAILED:', err.message);
  process.exit(1);
});
NODEEOF

echo ""
echo "=== ✅ ALL TESTS PASSED — PDF generation works in Docker! ==="

