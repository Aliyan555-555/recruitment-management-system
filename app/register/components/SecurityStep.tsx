import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AgreementsState, PersonalInfoState } from "@/app/register/types"
import { CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

type SecurityStepProps = {
  personalInfo: PersonalInfoState
  password: string
  confirmPassword: string
  agreements: AgreementsState
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onAgreementChange: (key: keyof AgreementsState, value: boolean) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
}

const disclaimers = [
  {
    key: "verification" as const,
    label: "I authorize verification of the above information and any other necessary inquiries.",
  },
  {
    key: "truth" as const,
    label: "I affirm that the above information is true to the best of my knowledge.",
  },
  {
    key: "liability" as const,
    label: "I realize that falsification or misstatement may lead to disqualification or dismissal.",
  },
] as const

type PasswordRequirement = {
  label: string
  met: boolean
}

const SecurityStep = ({
  personalInfo,
  password,
  confirmPassword,
  agreements,
  onPasswordChange,
  onConfirmPasswordChange,
  onAgreementChange,
  clearFieldError,
  getFieldError,
}: SecurityStepProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRequirements = useMemo((): PasswordRequirement[] => {
    return [
      {
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "Contains lowercase letter",
        met: /[a-z]/.test(password),
      },
      {
        label: "Contains uppercase letter",
        met: /[A-Z]/.test(password),
      },
      {
        label: "Contains number",
        met: /[0-9]/.test(password),
      },
      {
        label: "Contains special character",
        met: /[^a-zA-Z0-9]/.test(password),
      },
    ]
  }, [password])

  const passwordStrength = useMemo(() => {
    const metCount = passwordRequirements.filter((req) => req.met).length
    if (metCount === 0) return { level: "none", label: "", color: "" }
    if (metCount <= 2) return { level: "weak", label: "Weak", color: "text-red-600" }
    if (metCount <= 3) return { level: "fair", label: "Fair", color: "text-yellow-600" }
    if (metCount <= 4) return { level: "good", label: "Good", color: "text-blue-600" }
    return { level: "strong", label: "Strong", color: "text-green-600" }
  }, [passwordRequirements])

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return null
    return password === confirmPassword
  }, [password, confirmPassword])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={personalInfo.email} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={personalInfo.username} disabled className="bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Password *</Label>
            {password && passwordStrength.level !== "none" && (
              <span className={`text-xs font-medium ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              maxLength={128}
              onChange={(e) => {
                clearFieldError("security.password")
                onPasswordChange(e.target.value)
              }}
              placeholder="Enter a strong password"
              className={getFieldError("security.password") ? "border-destructive" : ""}
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
          {getFieldError("security.password") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {getFieldError("security.password")}
            </p>
          )}
          {password && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={req.met ? "text-green-700" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Confirm Password *</Label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              maxLength={128}
              onChange={(e) => {
                clearFieldError("security.confirmPassword")
                onConfirmPasswordChange(e.target.value)
              }}
              placeholder="Re-enter your password"
              className={
                getFieldError("security.confirmPassword") || (passwordsMatch === false && confirmPassword)
                  ? "border-destructive"
                  : passwordsMatch === true && confirmPassword
                    ? "border-green-500"
                    : ""
              }
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {getFieldError("security.confirmPassword") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {getFieldError("security.confirmPassword")}
            </p>
          )}
          {confirmPassword && passwordsMatch === false && !getFieldError("security.confirmPassword") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Passwords do not match
            </p>
          )}
          {confirmPassword && passwordsMatch === true && !getFieldError("security.confirmPassword") && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Passwords match
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-3">Required Disclaimers</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Please read and accept all disclaimers to complete your registration.
          </p>
        </div>
        <div className="space-y-3">
          {disclaimers.map((item) => {
            const errorKey = `security.${item.key}`
            const hasError = !!getFieldError(errorKey)
            return (
              <div key={item.key} className="space-y-1">
                <label
                  className={`flex items-start gap-3 text-sm cursor-pointer ${hasError ? "text-destructive" : "text-foreground"
                    }`}
                >
                  <input
                    type="checkbox"
                    className={`mt-1 h-4 w-4 rounded border flex-shrink-0 ${hasError ? "border-destructive" : ""
                      }`}
                    checked={agreements[item.key]}
                    onChange={(e) => {
                      clearFieldError(errorKey)
                      onAgreementChange(item.key, e.target.checked)
                    }}
                  />
                  <span className="leading-relaxed">{item.label}</span>
                </label>
                {hasError && (
                  <p className="text-xs text-destructive flex items-center gap-1 ml-7">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError(errorKey)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SecurityStep

