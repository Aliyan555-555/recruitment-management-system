import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return NextResponse.json(
    { error: "CV download is deprecated. Profile data is used for applications." },
    { status: 410 }
  )
}

