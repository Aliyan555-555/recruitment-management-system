const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

async function run() {
  const screenshotDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  console.log("Launching browser via Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[Console Error]:", msg.text());
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    console.log("[Page Error]:", err.message);
    errors.push(err.message);
  });

  try {
    console.log("\n--- STEP 1: Admin Login ---");
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle2" });
    await page.screenshot({ path: path.join(screenshotDir, "01_admin_login.png") });
    console.log("Screenshot saved: 01_admin_login.png");

    await page.focus("#email");
    await page.keyboard.type("admin@meteoric.com", { delay: 20 });
    await page.focus("#password");
    await page.keyboard.type("Admin123!", { delay: 20 });

    console.log("Submitting admin login form...");
    await page.click('button[type="submit"]');

    // Wait for the auth session to resolve with the user
    console.log("Waiting for auth session to be confirmed...");
    await page.waitForResponse(
      (res) => res.url().includes("/api/auth/session") && res.status() === 200,
      { timeout: 10000 }
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    console.log("Navigating to /admin/dashboard directly...");
    await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "networkidle2" });
    console.log("Current URL after dashboard navigation:", page.url());
    await page.screenshot({ path: path.join(screenshotDir, "02_admin_dashboard.png") });
    console.log("Screenshot saved: 02_admin_dashboard.png");

    console.log("\n--- STEP 2: Navigate to Admin Jobs ---");
    await page.goto("http://localhost:3000/admin/jobs", { waitUntil: "networkidle2" });
    await page.screenshot({ path: path.join(screenshotDir, "03_admin_jobs.png") });
    console.log("Screenshot saved: 03_admin_jobs.png");

    // Discover job links
    const jobs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/admin/jobs/"]'));
      const map = new Map();
      for (const a of links) {
        const m = a.href.match(/\/admin\/jobs\/(\d+)/);
        if (m && !map.has(m[1])) {
          map.set(m[1], { id: m[1], href: a.href, text: a.textContent?.trim() || "" });
        }
      }
      return Array.from(map.values());
    });
    console.log("Jobs found:", jobs);

    const targetJobId = jobs.length > 0 ? jobs[0].id : "1";
    const applicantsUrl = `http://localhost:3000/admin/jobs/${targetJobId}/applicants`;

    console.log(`\n--- STEP 3: Navigate to Applicants Page (${applicantsUrl}) ---`);
    await page.goto(applicantsUrl, { waitUntil: "networkidle2" });
    await page.screenshot({ path: path.join(screenshotDir, "04_applicants_page.png") });
    console.log("Screenshot saved: 04_applicants_page.png");

    // Check SheetActions buttons
    const sheetButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns
        .map((b) => b.textContent?.trim() || "")
        .filter((t) => t.includes("sheet") || t.includes("Download") || t.includes("Upload"));
    });
    console.log("SheetAction buttons found on page:", sheetButtons);

    console.log("\n--- STEP 4: Download Sheet via API ---");
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const downloadRes = await fetch(`http://localhost:3000/api/admin/sheets/SHORTLIST/download?jobId=${targetJobId}`, {
      headers: { Cookie: cookieHeader }
    });
    console.log("Download API HTTP status:", downloadRes.status);
    console.log("Content-Type:", downloadRes.headers.get("content-type"));
    console.log("Content-Disposition:", downloadRes.headers.get("content-disposition"));

    if (!downloadRes.ok) {
      const errText = await downloadRes.text();
      throw new Error(`Download API returned status ${downloadRes.status}: ${errText}`);
    }

    const sheetBuffer = Buffer.from(await downloadRes.arrayBuffer());
    const downloadedPath = path.join(screenshotDir, "downloaded.xlsx");
    fs.writeFileSync(downloadedPath, sheetBuffer);
    console.log(`Saved downloaded sheet (${sheetBuffer.length} bytes) to: downloaded.xlsx`);

    // Inspect workbook
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(sheetBuffer);
    console.log("Workbook sheets:", wb.worksheets.map((w) => w.name));

    const dataSheet = wb.getWorksheet("Data");
    const headers = [];
    if (dataSheet) {
      const headerRow = dataSheet.getRow(1);
      for (let c = 1; c <= dataSheet.columnCount; c++) {
        headers.push(headerRow.getCell(c).value);
      }
    }
    console.log("Data Sheet Headers:", headers);
    console.log("Total rows in Data Sheet (including header):", dataSheet ? dataSheet.rowCount : 0);

    // Edit sheet
    console.log("\n--- STEP 5: Editing Sheet (Filling Decision column) ---");
    const editedPath = path.join(screenshotDir, "edited.xlsx");
    if (dataSheet && dataSheet.rowCount > 1) {
      const decisionColIdx = headers.indexOf("Decision") + 1;
      console.log(`Decision column index: ${decisionColIdx}`);

      if (decisionColIdx > 0 && dataSheet.rowCount >= 2) {
        dataSheet.getRow(2).getCell(decisionColIdx).value = "Shortlist";
        console.log(`Row 2 set to "Shortlist"`);
      }
      if (decisionColIdx > 0 && dataSheet.rowCount >= 3) {
        dataSheet.getRow(3).getCell(decisionColIdx).value = "Maybe";
        console.log(`Row 3 set to "Maybe"`);
      }
      await wb.xlsx.writeFile(editedPath);
      console.log("Edited sheet saved to: edited.xlsx");
    } else {
      console.log("Saving unedited copy as edited.xlsx");
      fs.writeFileSync(editedPath, sheetBuffer);
    }

    console.log("\n--- STEP 6: Upload Sheet & Test ImportWizard Modal ---");
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("Could not find file input for upload on page.");

    console.log("Uploading edited sheet through page input...");
    await fileInput.uploadFile(editedPath);

    // Wait for modal dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotDir, "05_import_modal.png") });
    console.log("Screenshot saved: 05_import_modal.png");

    const modalDetails = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      const title = dialog.querySelector("h2, [class*='title'], [class*='Title']")?.textContent?.trim() || "";
      const text = dialog.textContent || "";
      const buttons = Array.from(dialog.querySelectorAll("button")).map((b) => b.textContent?.trim() || "");
      const statCards = Array.from(dialog.querySelectorAll("[class*='border']")).map((c) => c.textContent?.trim() || "").filter((t) => t.length < 50);
      return { title, textLength: text.length, buttons, statCards: statCards.slice(0, 8) };
    });
    console.log("ImportWizard Modal Details:", modalDetails);

    console.log("\n--- STEP 7: Testing Modal Close ---");
    const closeBtn = await page.$('button[aria-label="Close"], button:has-text("Close"), button:has-text("Discard")');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(screenshotDir, "06_modal_closed.png") });
      console.log("Screenshot saved: 06_modal_closed.png");
    }

    console.log("\n============================================");
    console.log("  ALL BROWSER TESTS COMPLETED SUCCESSFULLY!  ");
    console.log("============================================");
    console.log(`Console Errors encountered: ${errors.length}`);
  } catch (err) {
    console.error("Test execution failed:", err);
    await page.screenshot({ path: path.join(screenshotDir, "error_state.png") }).catch(() => {});
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
