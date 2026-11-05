import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { titles } from "@/app/register/constants"
import { PersonalInfoState } from "@/app/register/types"

type AccountCheckStepProps = {
  personalInfo: PersonalInfoState
  onChange: (updates: Partial<PersonalInfoState>) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
  loginHref: string
  emailTaken: boolean
}

const AccountCheckStep = ({
  personalInfo,
  onChange,
  clearFieldError,
  getFieldError,
  loginHref,
  emailTaken,
}: AccountCheckStepProps) => {
  const handleChange = (key: keyof PersonalInfoState, value: string) => {
    clearFieldError(`personal.${key}`)
    onChange({ [key]: value })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        We first check that you don&apos;t already have an account, so you don&apos;t spend time on a
        form you won&apos;t need.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Select value={personalInfo.title} onValueChange={(value) => handleChange("title", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              {titles.map((title) => (
                <SelectItem key={title} value={title}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("personal.title") && (
            <p className="text-xs text-destructive">{getFieldError("personal.title")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input
            value={personalInfo.firstname}
            placeholder="e.g., Ikram Ullah"
            onChange={(e) => handleChange("firstname", e.target.value)}
          />
          {getFieldError("personal.firstname") && (
            <p className="text-xs text-destructive">{getFieldError("personal.firstname")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input
            value={personalInfo.lastname}
            placeholder="e.g., Khan"
            onChange={(e) => handleChange("lastname", e.target.value)}
          />
          {getFieldError("personal.lastname") && (
            <p className="text-xs text-destructive">{getFieldError("personal.lastname")}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email *</Label>
        <Input
          type="email"
          value={personalInfo.email}
          placeholder="you@example.com"
          onChange={(e) => handleChange("email", e.target.value)}
        />
        {getFieldError("personal.email") && (
          <p className="text-xs text-destructive">{getFieldError("personal.email")}</p>
        )}
        {emailTaken && (
          <p className="text-sm text-destructive">
            An account with this email already exists.{" "}
            <Link href={loginHref} className="font-medium underline">
              Sign in instead
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default AccountCheckStep
