"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            This can happen if your session expired or the connection was interrupted. Please sign in again to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/login">Sign in again</Link>
          </Button>
          <Button variant="outline" onClick={reset} className="w-full">
            Try again
          </Button>
          <Link href="/" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
