import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Fetch all active jobs with their locations
    const jobs = await prisma.job.findMany({
      where: {
        deletedAt: null,
        status: true,
        postTo: {
          gte: new Date()
        }
      },

      select: {
        industry: true,
        locations: {
          select: {
            city: true,
            country: true
          }
        }
      }
    })

    // Extract unique departments (industries)
    const departments = Array.from(
      new Set(
        jobs
          .map(job => job.industry)
          .filter((industry): industry is string => Boolean(industry))
      )
    ).sort()

    // Extract unique locations
    const locationSet = new Set<string>()
    jobs.forEach(job => {
      job.locations.forEach(loc => {
        if (loc.city) {
          locationSet.add(loc.city)
        }
      })
    })
    const locations = Array.from(locationSet).sort()

    return NextResponse.json({
      success: true,
      departments,
      locations
    })
  } catch (error) {
    console.error("Error fetching filters:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch filters",
        departments: [],
        locations: []
      },
      { status: 500 }
    )
  }
}
