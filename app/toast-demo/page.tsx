"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, confirm } from "@/lib/toast"
import { CheckCircle2, XCircle, AlertTriangle, Info, HelpCircle } from "lucide-react"

export default function ToastDemoPage() {
    const handleSuccessToast = () => {
        toast.success("Operation completed successfully!")
    }

    const handleErrorToast = () => {
        toast.error("Something went wrong. Please try again.")
    }

    const handleWarningToast = () => {
        toast.warning("This action requires your attention")
    }

    const handleInfoToast = () => {
        toast.info("New features are now available")
    }

    const handleMessageToast = () => {
        toast.message("This is a generic message")
    }

    const handleConfirm = async () => {
        const result = await confirm("Are you sure you want to proceed with this action?")
        if (result) {
            toast.success("Action confirmed!")
        } else {
            toast.info("Action cancelled")
        }
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-2">Toast Notification Demo</h1>
                    <p className="text-muted-foreground">
                        Test the new custom toast system that replaces HTML alerts
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Basic Toasts</CardTitle>
                        <CardDescription>
                            These replace traditional `alert()` calls with themed, non-blocking notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                            onClick={handleSuccessToast}
                            className="w-full gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Success Toast
                        </Button>

                        <Button
                            onClick={handleErrorToast}
                            className="w-full gap-2 bg-red-600 hover:bg-red-700"
                            variant="destructive"
                        >
                            <XCircle className="h-4 w-4" />
                            Error Toast
                        </Button>

                        <Button
                            onClick={handleWarningToast}
                            className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Warning Toast
                        </Button>

                        <Button
                            onClick={handleInfoToast}
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Info className="h-4 w-4" />
                            Info Toast
                        </Button>

                        <Button
                            onClick={handleMessageToast}
                            variant="secondary"
                            className="w-full gap-2"
                        >
                            Message Toast
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Confirmation Dialog</CardTitle>
                        <CardDescription>
                            This replaces `confirm()` with a promise-based confirmation dialog
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleConfirm}
                            variant="outline"
                            className="w-full gap-2"
                        >
                            <HelpCircle className="h-4 w-4" />
                            Test Confirmation Dialog
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-muted">
                    <CardHeader>
                        <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Before (Old HTML Alert):</h3>
                            <pre className="bg-card p-4 rounded-lg text-sm overflow-x-auto border">
                                {`alert("Please upload an image file")
// Blocks the UI ❌
// No customization ❌
// Looks outdated ❌`}
                            </pre>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">After (Custom Toast):</h3>
                            <pre className="bg-card p-4 rounded-lg text-sm overflow-x-auto border">
                                {`import { toast } from '@/lib/toast'

toast.error("Please upload an image file")
// Non-blocking ✅
// Themed & beautiful ✅
// Dark mode support ✅`}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center text-sm text-muted-foreground">
                    <p>
                        Check the <code className="bg-muted px-2 py-1 rounded">.agent/docs/toast-migration-guide.md</code> for full migration instructions
                    </p>
                </div>
            </div>
        </div>
    )
}
