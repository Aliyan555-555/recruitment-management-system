"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, KeyRound, Loader2, CheckCircle2 } from "lucide-react"
import { forgotPasswordSchema } from "@/lib/validations"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        // Client-side validation
        const validation = forgotPasswordSchema.safeParse({ email })
        if (!validation.success) {
            setError(validation.error.errors[0].message)
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (!response.ok) {
                throw new Error("Failed to submit request")
            }

            setIsSubmitted(true)
        } catch (err) {
            setError("An error occurred. Please try again later.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
            <Link href="/login" className="absolute top-4 left-4">
                <Button variant="secondary" size="sm" className="flex items-center gap-2 shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                </Button>
            </Link>

            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary rounded-full">
                            <KeyRound className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold">Forgot Password?</h1>
                    <p className="text-muted-foreground mt-2">
                        {!isSubmitted
                            ? "Enter your email to receive a password reset link"
                            : "Check your email for the reset link"}
                    </p>
                </div>

                <Card>
                    {!isSubmitted ? (
                        <>
                            <CardHeader>
                                <CardTitle>Reset Password</CardTitle>
                                <CardDescription>
                                    We&apos;ll send you a secure link to reset your password.
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
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col space-y-4">
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Send Reset Link
                                    </Button>
                                </CardFooter>
                            </form>
                        </>
                    ) : (
                        <CardContent className="pt-6 pb-8 text-center space-y-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">Check your email</h3>
                                <p className="text-muted-foreground text-sm">
                                    We have sent a password reset link to <strong>{email}</strong>.
                                </p>
                                <p className="text-muted-foreground text-xs mt-4">
                                    Did not receive the email? Check your spam folder or{" "}
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        try again
                                    </button>
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link href="/login">
                                    <Button variant="outline" className="w-full">
                                        Return to Login
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    )
}
