import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function GET() {
  try {
    const configPath = join(process.cwd(), "config", "company.json")
    const configFile = readFileSync(configPath, "utf-8")
    const companyConfig = JSON.parse(configFile)
    
    return NextResponse.json({
      name: companyConfig.organization.name,
      alias: companyConfig.organization.alias,
      legalName: companyConfig.organization.legalName,
      email: companyConfig.contact.email,
      phone: companyConfig.contact.phone,
      address: companyConfig.contact.address
    })
  } catch (error) {
    console.error("Error loading company config:", error)
    return NextResponse.json(
      { error: "Failed to load company information" },
      { status: 500 }
    )
  }
}

