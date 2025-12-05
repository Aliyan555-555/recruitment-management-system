import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: "CV upload is deprecated. Profile data is used for applications." },
    { status: 410 }
  )
}

