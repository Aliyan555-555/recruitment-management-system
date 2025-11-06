import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface Application {
  id: string;
  jobTitle: string;
  jobCompany: string;
  appliedAt: string;
  status: string;
  pipeline: {
    id: string;
    currentStep: number;
    totalSteps: number;
    overallStatus: string;
    lockState: string;
    steps: Array<{
      stepOrder: number;
      status: string;
    }>;
  } | null;
}

export interface UpcomingInterview {
  bookingId?: string;
  slotId: string;
  stepName: string;
  stepOrder: number;
  startsAt: string;
  endsAt: string;
  meetingLink?: string;
  interviewerName?: string;
  jobTitle: string;
  jobCompany: string;
  applicationId?: string;
}

export interface DashboardStats {
  activeJobs: number;
  applications: number;
  interviews: number;
  successRate: number;
}

interface DashboardState {
  stats: DashboardStats;
  recentApplications: Application[];
  upcomingInterviews: UpcomingInterview[];
  loading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
  reset: () => void;
}

const initialState: Omit<DashboardState, 'fetchDashboardData' | 'reset'> = {
  stats: {
    activeJobs: 0,
    applications: 0,
    interviews: 0,
    successRate: 0,
  },
  recentApplications: [],
  upcomingInterviews: [],
  loading: false,
  error: null,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchDashboardData: async () => {
        // Prevent duplicate fetches
        if (get().loading) return;

        set({ loading: true, error: null });

        try {
          // Fetch all data in parallel
          const [jobsResponse, applicationsResponse, interviewsResponse] =
            await Promise.all([
              fetch("/api/jobs", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }),
              fetch("/api/applications", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }),
              fetch("/api/interviews/upcoming", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }).catch(() => ({ ok: false, json: async () => ({ upcoming: [] }) })),
            ]);

          // Handle jobs
          let activeJobs = 0;
          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            activeJobs = jobsData.jobs?.length || 0;
          }

          // Handle applications
          let applications: Application[] = [];
          let totalApplications = 0;
          let completedApplications = 0;

          if (applicationsResponse.ok) {
            const applicationsData = await applicationsResponse.json();
            applications = applicationsData.applications || [];
            totalApplications = applications.length;
            completedApplications = applications.filter(
              (app: Application) =>
                app.status === "COMPLETED" ||
                app.pipeline?.overallStatus === "COMPLETED"
            ).length;
          }

          // Handle interviews
          let upcomingInterviews: UpcomingInterview[] = [];
          if (interviewsResponse.ok) {
            const interviewsData = await interviewsResponse.json();
            upcomingInterviews = interviewsData.upcoming || [];
          }

          // Calculate success rate
          const successRate =
            totalApplications > 0
              ? Math.round((completedApplications / totalApplications) * 100)
              : 0;

          // Get recent applications (last 5)
          const recentApplications = applications.slice(0, 5);

          set({
            stats: {
              activeJobs,
              applications: totalApplications,
              interviews: upcomingInterviews.length,
              successRate,
            },
            recentApplications,
            upcomingInterviews: upcomingInterviews.slice(0, 5),
            loading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to fetch dashboard data";
          console.error("Error fetching dashboard data:", error);
          set({ loading: false, error: errorMessage });
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: "dashboard-store",
    }
  )
);

