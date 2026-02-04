import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const location = searchParams.get("location");

    console.log("Fetching public jobs with filters:", { search, location });

    // Simplified query to ensure reliable results
    const jobs = await prisma.job.findMany({
      where: {
        deletedAt: null,
        status: true,
        jobStatus: "ACTIVE",
        postFrom: {
          lte: new Date(),
        },
        postTo: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        company: true,
        shortDescription: true,
        description: true,
        industry: true,
        employmentType: true,
        employmentShift: true,
        totalPositions: true,
        minimumExperience: true,
        minimumSalary: true,
        benefits: true,
        postFrom: true,
        postTo: true,
        jobType: true,
        jobStatus: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    console.log(`Found ${jobs.length} jobs`);

    // Apply filters after fetching
    let filteredJobs = jobs;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredJobs = filteredJobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          (job.shortDescription &&
            job.shortDescription.toLowerCase().includes(searchLower)),
      );
    }

    const currentDate = new Date();

    return NextResponse.json({
      success: true,
      jobs: filteredJobs
        .filter(
          (job) =>
            new Date(job.postTo) >= currentDate &&
            new Date(job.postFrom) <= currentDate,
        )
        .map((job) => ({
          id: job.id.toString(),
          title: job.title,
          company: job.company,
          shortDescription: job.shortDescription || "",
          description: job.description || "",
          industry: job.industry || "",
          employmentType: job.employmentType,
          employmentShift: job.employmentShift || "",
          totalPositions: job.totalPositions || 1,
          minimumExperience: job.minimumExperience || "",
          minimumSalary: job.minimumSalary || "",
          benefits: job.benefits || "",
          postFrom: job.postFrom.toISOString(),
          postTo: job.postTo.toISOString(),
          jobType: job.jobType || "NORMAL",
          jobStatus: job.jobStatus || "ACTIVE",
          skills: [], // Will add back once basic query works
          locations: [], // Will add back once basic query works
          educationRequirements: [], // Will add back once basic query works
          applicationCount: 0, // Will add back once basic query works
          createdAt: new Date(Number(job.createdAt) * 1000).toISOString(),
        })),
    });
  } catch (error) {
    console.error("Error fetching public jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch jobs. Please try again later.",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}
