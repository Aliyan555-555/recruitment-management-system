import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppState {
  user: any | null;
  org: any | null;
  jobs: any[];
  loading: boolean;
  setUser: (user: any) => void;
  setOrg: (org: any) => void;
  setJobs: (jobs: any[]) => void;
  fetchJobsOnce: () => Promise<void>;
}

// ✅ Zustand store with persist + devtools for debugging
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        org: null,
        jobs: [],
        loading: false,

        setUser: (user) => set({ user }),
        setOrg: (org) => set({ org }),
        setJobs: (jobs) => set({ jobs }),

        // ✅ Fast "one-time load" pattern
        fetchJobsOnce: async () => {
          if (get().jobs.length > 0) return; // already loaded
          set({ loading: true });
          try {
            const res = await fetch("/api/jobs");
            const data = await res.json();
            set({ jobs: data, loading: false });
          } catch (err) {
            console.error("Error loading jobs", err);
            set({ loading: false });
          }
        },
      }),
      {
        name: "rms-app-store", // persist key (localStorage)
      }
    )
  )
);
