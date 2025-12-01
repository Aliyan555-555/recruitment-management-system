"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { resetPasswordSchema } from "@/lib/validations"

export default function ResetPasswordPage() {
    const router = useRouter()
    const params = useParams()
    const token = params?.token as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isValidToken, setIsValidToken] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState("")
    const [tokenError, setTokenError] = useState("")

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setTokenError("Missing token")
                setIsLoading(false)
                return
            }

            try {
                const response = await fetch("/api/auth/validate-reset-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                })

                const data = await response.json()

                if (data.valid) {
                    setIsValidToken(true)
                } else {
                    setTokenError(data.message || "Invalid or expired token")
                }
            } catch (err) {
                setTokenError("Failed to validate token")
            } finally {
                setIsLoading(false)
            }
        }

        validateToken()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        // Client-side validation
        const validation = resetPasswordSchema.safeParse({
            token,
            ...formData
        })

        if (!validation.success) {
            setError(validation.error.errors[0].message)
            setIsSubmitting(false)
            return
        }

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to reset password")
            }

            setIsSuccess(true)

            // Auto redirect after 3 seconds
            setTimeout(() => {
                router.push("/login")
            }, 3000)

        } catch (err: any) {
            setError(err.message || "An error occurred. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary rounded-full">
                            <Lock className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold">Reset Password</h1>
                    <p className="text-muted-foreground mt-2">
                        Create a new strong password for your account
                    </p>
                </div>

                <Card>
                    {!isValidToken ? (
                        <CardContent className="pt-6 pb-8 text-center space-y-4">
                            <div className="flex justify-center">
                                <AlertCircle className="h-16 w-16 text-destructive" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-destructive">Invalid Link</h3>
                                <p className="text-muted-foreground">
                                    {tokenError}
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link href="/forgot-password">
                                    <Button className="w-full">
                                        Request New Link
                                    </Button>
                                </Link>
                                <div className="mt-4">
                                    <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                                        Return to Login
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    ) : isSuccess ? (
                        <CardContent className="pt-6 pb-8 text-center space-y-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">Password Reset Successful</h3>
                                <p className="text-muted-foreground">
                                    Your password has been updated. Redirecting to login...
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link href="/login">
                                    <Button className="w-full">
                                        Login Now
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    ) : (
                        <>
                            <CardHeader>
                                <CardTitle>New Password</CardTitle>
                                <CardDescription>
                                    Please enter your new password below.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-4">
                                    {error && (
                                        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Min 8 characters"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                disabled={isSubmitting}
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

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Confirm new password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col space-y-4">
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Reset Password
                                    </Button>
                                </CardFooter>
                            </form>
                        </>
                    )}
                </Card>
            </div>
        </div>
    )
}
