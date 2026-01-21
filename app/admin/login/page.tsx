"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function AdminLoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
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

            // Wait for session cookie to be set
            await new Promise(resolve => setTimeout(resolve, 800))

            // Verify session
            const response = await fetch("/api/auth/session", {
                cache: "no-store",
                credentials: "include"
            })
            const session = await response.json()
            const userRole = session?.user?.role

            if (userRole !== "ADMIN") {
                setError("Access denied. Admin credentials required.")
                await signOut({ redirect: false })
                setIsLoading(false)
                return
            }

            // Get callbackUrl from query params or default to dashboard
            let callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard"
            
            // Decode URL-encoded callbackUrl (e.g., %2Fadmin%2Fdashboard -> /admin/dashboard)
            try {
                callbackUrl = decodeURIComponent(callbackUrl)
            } catch (e) {
                // If decoding fails, use default
                callbackUrl = "/admin/dashboard"
            }
            
            // Security: Ensure callbackUrl is a relative path (prevent open redirect)
            if (callbackUrl && !callbackUrl.startsWith("/")) {
                callbackUrl = "/admin/dashboard"
            }
            
            // Ensure it's an admin route
            if (!callbackUrl.startsWith("/admin/")) {
                callbackUrl = "/admin/dashboard"
            }
            
            // Force a full page reload to ensure cookies are available to middleware
            // Using window.location.replace to avoid adding to history
            window.location.replace(callbackUrl)
        } catch (error) {
            setError("An error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-8">
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
                        <div className="p-4 bg-purple-600 rounded-full shadow-lg shadow-purple-500/50">
                            <Shield className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">Admin Portal</h1>
                    <p className="text-purple-200">Sign in to access the admin dashboard</p>
                </div>

                <Card className="border-purple-500/20 shadow-2xl">
                    <CardHeader>
                        <CardTitle>Administrator Login</CardTitle>
                        <CardDescription>Enter your admin credentials to continue</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
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
                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In as Admin
                            </Button>


                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
