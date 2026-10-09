"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, UserCircle, Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams?.get("jobId")
  const callbackUrl = searchParams?.get("callbackUrl")
  const errorParam = searchParams?.get("error")
  const sessionExpired = errorParam === "SessionExpired"
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(
    sessionExpired
      ? "Your session expired. Please sign in again."
      : errorParam
        ? "Sign-in is temporarily unavailable. Please try again in a moment."
        : ""
  )
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      try {
        const response = await fetch("/api/auth/session")
        const session = await response.json()
        const userRole = session?.user?.role

        if (userRole === "CANDIDATE") {
          const fallback = jobId
            ? `/jobs/${jobId}`
            : callbackUrl && callbackUrl.startsWith("/")
              ? callbackUrl
              : "/"

          router.push(fallback)
          router.refresh()
          setIsLoading(false)
          return
        }

        if (userRole === "ADMIN") {
          setError("Admin users must use the Admin Login page.")
          await signOut({ redirect: false })
          setIsLoading(false)
          setTimeout(() => {
            router.push("/admin/login")
          }, 2000)
          return
        } else if (userRole === "INTERVIEWER") {
          router.push("/interviewer/dashboard")
          router.refresh()
          setIsLoading(false)
          return
        }
        router.refresh()
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching session:", err)
        router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/")
        router.refresh()
        setIsLoading(false)
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 px-4 py-8">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <Link href="/" className="absolute top-6 left-6">
        <Button variant="secondary" size="sm" className="flex items-center gap-2 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-600 rounded-full shadow-lg shadow-green-500/50">
              <UserCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-green-200">Sign in to explore job opportunities</p>
        </div>

        <Card className="border-green-500/20 shadow-2xl">
          <CardHeader>
            <CardTitle>Candidate Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {(error || sessionExpired) && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error || "Your session expired. Please sign in again."}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                <p>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
