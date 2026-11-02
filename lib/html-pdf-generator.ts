import puppeteer, { type Browser, type PDFOptions } from "puppeteer"
import fs from "fs"
import path from "path"
import os from "os"

export interface GeneratePdfOptions {
  format?: "A4" | "Letter" | "Legal"
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  printBackground?: boolean
  timeout?: number
}

/**
 * Resolves the path to the Chromium / Chrome executable.
 * Prioritizes environment variables, known Linux distro paths,
 * and falls back to undefined (allowing Puppeteer's internal resolution on local environments).
 */
export function getChromiumExecutablePath(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH
  if (envPath && fs.existsSync(envPath)) {
    return envPath
  }

  // Common Linux paths (Debian/Ubuntu, Alpine, RHEL/CentOS)
  const candidatePaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/snap/bin/chromium",
  ]

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}

/**
 * Robust, production-hardened HTML to PDF generator.
 * Works seamlessly in both local environments (Windows/macOS) and restricted
 * containerized production environments (Linux Docker with read-only rootfs).
 */
export async function generatePdfFromHtml(
  htmlContent: string,
  options: GeneratePdfOptions = {}
): Promise<Buffer> {
  const {
    format = "A4",
    margin = {
      top: "20mm",
      right: "20mm",
      bottom: "20mm",
      left: "20mm",
    },
    printBackground = true,
    timeout = 30000,
  } = options

  // In Docker with read_only rootfs, Chromium crashes if it cannot write user data.
  // We create a dedicated unique temp directory inside os.tmpdir() (which is mounted tmpfs).
  const tempUserDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "puppeteer_profile_")
  )

  const executablePath = getChromiumExecutablePath()

  const defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--no-first-run",
    "--mute-audio",
    "--hide-scrollbars",
    `--user-data-dir=${tempUserDataDir}`,
    `--data-path=${tempUserDataDir}`,
    `--disk-cache-dir=${path.join(tempUserDataDir, "cache")}`,
  ]

  // Merge extra flags from CHROMIUM_FLAGS if provided (e.g. from Dockerfile)
  const envChromiumFlags = process.env.CHROMIUM_FLAGS
  const extraArgs = envChromiumFlags
    ? envChromiumFlags.split(" ").filter((flag) => flag.trim().length > 0)
    : []

  // Combine args, avoiding duplicates
  const finalArgs = Array.from(new Set([...defaultArgs, ...extraArgs]))

  let browser: Browser | null = null

  try {
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: finalArgs,
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath
    }

    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()

    // Ensure proper document wrapping and UTF-8 charset
    const wrappedHtml = htmlContent.includes("<html")
      ? htmlContent
      : `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
</html>`

    try {
      // First attempt: wait for network idle to allow external assets/fonts to load
      await page.setContent(wrappedHtml, {
        waitUntil: "networkidle0",
        timeout: Math.min(timeout, 10000),
      })
    } catch {
      // If networkidle0 times out (e.g. isolated network or slow external asset in Docker),
      // proceed as content is already parsed in the DOM.
      await page.setContent(wrappedHtml, {
        waitUntil: "load",
        timeout: Math.min(timeout, 10000),
      })
    }

    const pdfOptions: PDFOptions = {
      format,
      margin,
      printBackground,
    }

    const pdfUint8Array = await page.pdf(pdfOptions)
    return Buffer.from(pdfUint8Array)
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeErr) {
        console.error("[HTML-PDF-GEN] Error closing browser:", closeErr)
      }
    }

    // Clean up temporary user data directory
    try {
      if (fs.existsSync(tempUserDataDir)) {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true })
      }
    } catch (cleanupErr) {
      console.warn("[HTML-PDF-GEN] Failed to remove temp directory:", cleanupErr)
    }
  }
}

