import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;
    const rank = body.rank === undefined || body.rank === "" ? undefined : Number(body.rank);

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (rank !== undefined && (!Number.isInteger(rank) || rank < 0 || rank > 1000)) {
      return NextResponse.json({ error: "Rank must be a whole number from 0 to 1000" }, { status: 400 });
    }

    const updatedLevel = await prisma.userEducationLevel.update({
      where: { id: BigInt(params.id) },
      data: { name: name.trim(), ...(rank !== undefined ? { rank } : {}) },
    });

    return NextResponse.json({
      success: true,
      level: {
        ...updatedLevel,
        id: updatedLevel.id.toString(),
      },
    });
  } catch (error) {
    console.error("Error updating education level:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.userEducationLevel.delete({
      where: { id: BigInt(params.id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting education level:", error);
    // Check for Prisma unique constraint or foreign key violations
    if ((error as any).code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Cannot delete this level: it is currently referenced by users or jobs.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
