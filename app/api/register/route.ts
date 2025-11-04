import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { getCurrentTimestamp } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user
    const currentTime = getCurrentTimestamp()
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        firstname: validatedData.firstname,
        lastname: validatedData.lastname,
        phone1: validatedData.phone1,
        phone2: validatedData.phone2,
        institution: validatedData.institution,
        department: validatedData.department,
        address: validatedData.address,
        city: validatedData.city,
        country: validatedData.country,
        // auth: "user",
        firstAccess: currentTime,
        createdAt: currentTime,
        updatedAt: currentTime,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstname: true,
        lastname: true,
      }
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Registration error:", error)
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    )
  }
}

