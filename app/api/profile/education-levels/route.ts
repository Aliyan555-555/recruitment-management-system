import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const levels = await prisma.userEducationLevel.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      levels: levels.map((level) => ({
        id: level.id.toString(),
        name: level.name,
      })),
    });
  } catch (error) {
    console.error("Education levels fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch education levels" },
      { status: 500 },
    );
  }
}
