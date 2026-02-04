import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface JobLocation {
  city: string;
  country: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  city?: string;
  country?: string;
  locations?: JobLocation[];
  shortDescription: string;
  employmentType: string;
  postFrom: string | Date;
  postTo: string | Date;
  skills: string[];
  minimumEducation?: string;
  createdBy: string;
  applicationCount: number;
  jobStatus: string;
}

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  fetchJobs: (filters?: {
    search?: string;
    department?: string;
    location?: string;
  }) => Promise<void>;
  reset: () => void;
}

const initialState = {
  jobs: [],
  loading: false,
  error: null,
};

export const useJobsStore = create<JobsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchJobs: async (filters) => {
        // Prevent duplicate fetches
        if (get().loading) return;

        // Only set loading to true if we don't have any jobs yet
        const currentJobs = get().jobs;
        if (currentJobs.length === 0) {
          set({ loading: true, error: null });
        } else {
          set({ error: null });
        }

        try {
          const params = new URLSearchParams();
          if (filters?.search) params.set("search", filters.search);
          if (filters?.department && filters.department !== "all")
            params.set("department", filters.department);
          if (filters?.location && filters.location !== "all")
            params.set("location", filters.location);

          const response = await fetch(`/api/jobs?${params.toString()}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to fetch jobs: ${response.statusText}`,
            );
          }

          const data = await response.json();

          // Transform the API response to match Job interface
          const transformedJobs: Job[] = data.jobs.map((job: any) => ({
            id: job.id.toString(),
            title: job.title,
            company: job.company,
            shortDescription: job.shortDescription || "",
            description: job.description || undefined,
            locations: job.locations?.map((loc: any) => ({
              city: loc.city,
              country: loc.country || "",
            })),
            city: job.city || undefined,
            country: job.country || undefined,
            employmentType: job.employmentType,
            postFrom: job.postFrom,
            postTo: job.postTo,
            skills: job.skills || [],
            minimumEducation: job.minimumEducation || undefined,
            createdBy: job.createdBy || "Unknown",
            applicationCount: job.applicationCount || 0,
            jobStatus: job.jobStatus || "ACTIVE",
          }));

          set({ jobs: transformedJobs, loading: false, error: null });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to fetch jobs";
          console.error("Error fetching jobs:", error);
          set({ loading: false, error: errorMessage });
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: "jobs-store", // For Redux DevTools
    },
  ),
);
