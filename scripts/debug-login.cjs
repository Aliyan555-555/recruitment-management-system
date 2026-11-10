const puppeteer = require("puppeteer");

async function debugLogin() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on("response", async res => {
    const url = res.url();
    if (url.includes("/api/auth/")) {
      let body = "";
      try { body = await res.text(); } catch(e) {}
      console.log(`AUTH API [${res.status()}] ${url}:`, body.slice(0, 200));
    }
  });

  await page.goto("http://localhost:3000/admin/login", { waitUntil: "domcontentloaded" });
  
  await page.focus("#email");
  await page.keyboard.type("admin@meteoric.com", { delay: 20 });
  
  await page.focus("#password");
  await page.keyboard.type("Admin123!", { delay: 20 });

  console.log("Submitting login...");
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 4000));
  console.log("Current URL:", page.url());

  const cookies = await page.cookies();
  console.log("Cookies after submit:", cookies.map(c => ({ name: c.name, secure: c.secure, domain: c.domain })));

  await browser.close();
}

debugLogin().catch(console.error);
