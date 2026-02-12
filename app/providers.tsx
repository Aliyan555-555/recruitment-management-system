"use client"

import { SessionProvider } from "next-auth/react"
import { MantineProvider } from "@mantine/core"
import { ThemeProvider } from "next-themes"
import "@mantine/core/styles.css"
import { SessionGuard } from "@/components/SessionGuard"

// Refetch session every 5 min to keep it fresh and avoid expiry-related failures
const SESSION_REFETCH_INTERVAL = 60 * 5

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={SESSION_REFETCH_INTERVAL}
      refetchOnWindowFocus={true}
    >
      <SessionGuard>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MantineProvider>
            {children}
          </MantineProvider>
        </ThemeProvider>
      </SessionGuard>
    </SessionProvider>
  )
}

