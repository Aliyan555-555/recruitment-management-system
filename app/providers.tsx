"use client"

import { SessionProvider } from "next-auth/react"
import { MantineProvider } from "@mantine/core"
import { ThemeProvider } from "next-themes"
import "@mantine/core/styles.css"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MantineProvider>
          {children}
        </MantineProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

