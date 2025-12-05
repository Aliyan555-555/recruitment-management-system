import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: "CV upload is deprecated. Profile data is used for applications." },
    { status: 410 }
  )
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "CV upload is deprecated. Profile data is used for applications." },
    { status: 410 }
  )
}

