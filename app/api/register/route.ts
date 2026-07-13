import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { getCurrentTimestamp } from "@/lib/utils";

const resolveEducationLevelId = async (
  tx: Prisma.TransactionClient,
  value?: string | null,
) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // If value already looks like an ID, convert to BigInt
  if (/^\d+$/.test(trimmed)) {
    try {
      return BigInt(trimmed);
    } catch {
      // If conversion fails, fall through to name lookup
    }
  }

  // Otherwise, try to find a matching education level by name (case-insensitive)
  let level = await tx.userEducationLevel.findFirst({
    where: {
      name: {
        equals: trimmed,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  // If level doesn't exist, create it to ensure the education entry can be saved
  if (!level) {
    try {
      level = await tx.userEducationLevel.create({
        data: { name: trimmed },
        select: { id: true },
      });
    } catch (createError) {
      console.error(
        "Failed to create education level during resolution:",
        createError,
      );
      return null;
    }
  }

  return level.id;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    const currentTime = getCurrentTimestamp();

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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
          firstAccess: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime,
        },
      });

      if (validatedData.profile) {
        const profile = validatedData.profile;
        try {
          await tx.userProfileDetail.create({
            data: {
              userId: createdUser.id,
              title: profile.title,
              fatherName: profile.fatherName,
              religion: profile.religion,
              nationality: profile.nationality,
              dateOfBirth: profile.dateOfBirth,
              cnic: profile.cnic,
              gender: profile.gender,
              maritalStatus: profile.maritalStatus,
              preferredCity: profile.preferredCity,
              postalCode: profile.postalCode,
              disclaimersAgreed: profile.disclaimersAgreed ?? false,
              createdAt: currentTime,
              updatedAt: currentTime,
            },
          });
        } catch (profileError: any) {
          // Log the error but don't fail registration if profile table doesn't exist
          console.error("Failed to create user profile detail:", profileError);
          // If it's a table not found error, we'll continue without profile
          if (profileError.code === "P2021") {
            console.warn(
              "UserProfileDetail table not found. Skipping profile creation.",
            );
          } else {
            throw profileError;
          }
        }
      }

      if (validatedData.educationHistory?.length) {
        for (const entry of validatedData.educationHistory) {
          const educationLevelId = await resolveEducationLevelId(
            tx,
            entry.educationLevelId,
          );

          if (!educationLevelId) {
            console.warn(
              "Skipping education entry due to unresolved education level",
              entry.educationLevelId,
            );
            continue;
          }

          await tx.userEducation.create({
            data: {
              userId: createdUser.id,
              educationLevelId,
              degreeTitle: entry.degreeTitle,
              institute: entry.institute,
              majorSubject: entry.majorSubject,
              grade: entry.grade,
              passingYear: entry.passingYear,
              country: entry.country,
              createdAt: currentTime,
              updatedAt: currentTime,
            },
          });
        }
      }

      if (validatedData.experiences?.length) {
        for (const exp of validatedData.experiences) {
          await tx.userExperience.create({
            data: {
              userId: createdUser.id,
              jobTitle: exp.jobTitle,
              company: exp.company,
              location: exp.location,
              startDate: exp.startDate,
              endDate: exp.endDate,
              isCurrent: exp.isCurrent ?? false,
              createdAt: currentTime,
              updatedAt: currentTime,
            },
          });
        }
      }

      if (validatedData.skillsInput?.length) {
        for (const skill of validatedData.skillsInput) {
          await tx.userSkills.create({
            data: {
              userId: createdUser.id,
              skillName: skill.name,
              level: 0,
              verifiedLevel: "BEGINNER",
              createdAt: currentTime,
              updatedAt: currentTime,
            },
          });
        }
      }

      if (validatedData.jobPreference) {
        const pref = validatedData.jobPreference;
        await tx.userJobPreference.create({
          data: {
            userId: createdUser.id,
            firstPriority: pref.firstPriority,
            secondPriority: pref.secondPriority,
            thirdPriority: pref.thirdPriority,
            summary: pref.summary,
            createdAt: currentTime,
            updatedAt: currentTime,
          },
        });
      }

      return createdUser;
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    // Handle Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 400 },
      );
    }

    if (error.code === "P2021") {
      return NextResponse.json(
        {
          error: "Database table not found. Please run database migrations.",
          details: error.meta?.modelName
            ? `Table for model ${error.meta.modelName} does not exist`
            : "Required database table is missing",
        },
        { status: 500 },
      );
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith("P")) {
      return NextResponse.json(
        {
          error: "Database error occurred",
          details:
            error.message || "Please check database connection and schema",
        },
        { status: 500 },
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "An error occurred during registration",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
