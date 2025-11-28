"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  LogOut, 
  Briefcase, 
  Edit, 
  Mail,
  Shield
} from "lucide-react"
import { useEffect, useState } from "react"

export function Navbar() {
    const { data: session, status } = useSession()
    const [userInitials, setUserInitials] = useState("")

    useEffect(() => {
        if (session?.user?.name) {
            const names = session.user.name.split(" ")
            const initials = names
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            setUserInitials(initials)
        }
    }, [session])

    const handleLogout = () => {
        signOut({ callbackUrl: "/" })
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "CANDIDATE":
                return "Candidate"
            case "INTERVIEWER":
                return "Interviewer"
            case "ADMIN":
                return "Administrator"
            default:
                return "User"
        }
    }

    return (
        <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity group">
                            <Briefcase className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-xl font-bold text-foreground">TalentHub</span>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        {status === "loading" ? (
                            <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                        ) : session ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent transition-all"
                                    >
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            <AvatarImage src="" alt={session.user?.name || "User"} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {userInitials || <User className="h-5 w-5" />}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    className="w-56 mt-2" 
                                    align="end" 
                                    forceMount
                                >
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {session.user?.name || "User"}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground flex items-center gap-1 mt-1">
                                                <Mail className="h-3 w-3" />
                                                {session.user?.email}
                                            </p>
                                            {session.user?.role && (
                                                <div className="flex items-center gap-1 mt-1.5">
                                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {getRoleLabel(session.user.role)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    
                                    {session.user?.role === "CANDIDATE" && (
                                        <>
                                            <DropdownMenuItem 
                                                asChild
                                                className="cursor-pointer"
                                            >
                                                <Link href="/candidate/profile" className="flex items-center">
                                                    <User className="mr-2 h-4 w-4" />
                                                    <span>View Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                asChild
                                                className="cursor-pointer"
                                            >
                                                <Link href="/candidate/profile/edit" className="flex items-center">
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}

                                    {session.user?.role === "ADMIN" && (
                                        <>
                                            <DropdownMenuItem 
                                                asChild
                                                className="cursor-pointer"
                                            >
                                                <Link href="/admin" className="flex items-center">
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    <span>Admin Dashboard</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}

                                    {session.user?.role === "INTERVIEWER" && (
                                        <>
                                            <DropdownMenuItem 
                                                asChild
                                                className="cursor-pointer"
                                            >
                                                <Link href="/interviewer" className="flex items-center">
                                                    <User className="mr-2 h-4 w-4" />
                                                    <span>Interviewer Dashboard</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}

                                    <DropdownMenuItem 
                                        onClick={handleLogout}
                                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}

