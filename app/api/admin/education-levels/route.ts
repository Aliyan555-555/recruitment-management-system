import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const levels = await prisma.userEducationLevel.findMany({
      orderBy: { name: "asc" },
    });

    const serialized = levels.map((level) => ({
      ...level,
      id: level.id.toString(),
    }));

    return NextResponse.json({ levels: serialized });
  } catch (error) {
    console.error("Error fetching education levels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newLevel = await prisma.userEducationLevel.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      level: {
        ...newLevel,
        id: newLevel.id.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating education level:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
