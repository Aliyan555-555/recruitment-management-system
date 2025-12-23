import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  departmentOptions,
  genderOptions,
  maritalStatuses,
  nationalityOptions,
  pakistaniCities,
  religionOptions,
  titles,
} from "@/app/register/constants"
import { PersonalInfoState } from "@/app/register/types"
import { formatCnic, formatPakPhone, formatPostalCode } from "@/app/register/utils"

type PersonalInfoStepProps = {
  personalInfo: PersonalInfoState
  onChange: (updates: Partial<PersonalInfoState>) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
  maxDob: string
  disabledFields?: Array<keyof PersonalInfoState>
}

const PersonalInfoStep = ({
  personalInfo,
  onChange,
  clearFieldError,
  getFieldError,
  maxDob,
  disabledFields = [],
}: PersonalInfoStepProps) => {
  const isDisabled = (key: keyof PersonalInfoState): boolean => disabledFields.includes(key)

  const handleInputChange = (key: keyof PersonalInfoState, value: string) => {
    if (isDisabled(key)) return
    clearFieldError(`personal.${key}`)
    onChange({ [key]: value })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Select
            value={personalInfo.title}
            onValueChange={(value) => handleInputChange("title", value)}
            disabled={isDisabled("title")}
          >
            <SelectTrigger disabled={isDisabled("title")}>
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
            onChange={(e) => handleInputChange("firstname", e.target.value)}
            disabled={isDisabled("firstname")}
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
            onChange={(e) => handleInputChange("lastname", e.target.value)}
            disabled={isDisabled("lastname")}
          />
          {getFieldError("personal.lastname") && (
            <p className="text-xs text-destructive">{getFieldError("personal.lastname")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Father Name *</Label>
          <Input
            value={personalInfo.fatherName}
            placeholder="e.g., Shujat Ullah Khan"
            onChange={(e) => handleInputChange("fatherName", e.target.value)}
            disabled={isDisabled("fatherName")}
          />
          {getFieldError("personal.fatherName") && (
            <p className="text-xs text-destructive">{getFieldError("personal.fatherName")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input
            type="email"
            value={personalInfo.email}
            placeholder="you@example.com"
            onChange={(e) => handleInputChange("email", e.target.value)}
            disabled={isDisabled("email")}
          />
          {getFieldError("personal.email") && (
            <p className="text-xs text-destructive">{getFieldError("personal.email")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Username *</Label>
          <Input
            value={personalInfo.username}
            placeholder="e.g., ikram.khan92"
            onChange={(e) => handleInputChange("username", e.target.value)}
            disabled={isDisabled("username")}
          />
          {getFieldError("personal.username") && (
            <p className="text-xs text-destructive">{getFieldError("personal.username")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Religion</Label>
          <Select
            value={personalInfo.religion}
            onValueChange={(value) => handleInputChange("religion", value)}
            disabled={isDisabled("religion")}
          >
            <SelectTrigger disabled={isDisabled("religion")}>
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {religionOptions.map((religion) => (
                <SelectItem key={religion} value={religion}>
                  {religion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("personal.religion") && (
            <p className="text-xs text-destructive">{getFieldError("personal.religion")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Contact Number *</Label>
          <Input
            value={personalInfo.contactNumber}
            placeholder="03XX-XXXXXXX"
            onChange={(e) => handleInputChange("contactNumber", formatPakPhone(e.target.value))}
            disabled={isDisabled("contactNumber")}
          />
          {getFieldError("personal.contactNumber") && (
            <p className="text-xs text-destructive">{getFieldError("personal.contactNumber")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Alternative Number</Label>
          <Input
            value={personalInfo.alternateNumber}
            placeholder="03XX-XXXXXXX"
            onChange={(e) => handleInputChange("alternateNumber", formatPakPhone(e.target.value))}
            disabled={isDisabled("alternateNumber")}
          />
        </div>
        <div className="space-y-2">
          <Label>Nationality</Label>
          <Select
            value={personalInfo.nationality}
            onValueChange={(value) => handleInputChange("nationality", value)}
            disabled={isDisabled("nationality")}
          >
            <SelectTrigger disabled={isDisabled("nationality")}>
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {nationalityOptions.map((nation) => {
                const optionValue = nation === "Pakistani" ? "PK" : nation
                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    {nation}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {getFieldError("personal.nationality") && (
            <p className="text-xs text-destructive">{getFieldError("personal.nationality")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={personalInfo.dateOfBirth}
            max={maxDob}
            onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
            disabled={isDisabled("dateOfBirth")}
          />
          {getFieldError("personal.dateOfBirth") && (
            <p className="text-xs text-destructive">{getFieldError("personal.dateOfBirth")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>CNIC</Label>
          <Input
            placeholder="#####-#######-#"
            value={personalInfo.cnic}
            onChange={(e) => handleInputChange("cnic", formatCnic(e.target.value))}
            disabled={isDisabled("cnic")}
          />
          {getFieldError("personal.cnic") && (
            <p className="text-xs text-destructive">{getFieldError("personal.cnic")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Preferred City</Label>
          <Select
            value={personalInfo.preferredCity}
            onValueChange={(value) => handleInputChange("preferredCity", value)}
            disabled={isDisabled("preferredCity")}
          >
            <SelectTrigger disabled={isDisabled("preferredCity")}>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {pakistaniCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("personal.preferredCity") && (
            <p className="text-xs text-destructive">{getFieldError("personal.preferredCity")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={personalInfo.gender}
            onValueChange={(value) => handleInputChange("gender", value)}
            disabled={isDisabled("gender")}
          >
            <SelectTrigger disabled={isDisabled("gender")}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("personal.gender") && (
            <p className="text-xs text-destructive">{getFieldError("personal.gender")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Marital Status</Label>
          <Select
            value={personalInfo.maritalStatus}
            onValueChange={(value) => handleInputChange("maritalStatus", value)}
            disabled={isDisabled("maritalStatus")}
          >
            <SelectTrigger disabled={isDisabled("maritalStatus")}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {maritalStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("personal.maritalStatus") && (
            <p className="text-xs text-destructive">{getFieldError("personal.maritalStatus")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Postal Code</Label>
          <Input
            placeholder="70000"
            value={personalInfo.postalCode}
            onChange={(e) => handleInputChange("postalCode", formatPostalCode(e.target.value))}
            disabled={isDisabled("postalCode")}
          />
          {getFieldError("personal.postalCode") && (
            <p className="text-xs text-destructive">{getFieldError("personal.postalCode")}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Home Address</Label>
        <Textarea
          value={personalInfo.homeAddress}
          placeholder="House #, Street, Area, City"
          onChange={(e) => handleInputChange("homeAddress", e.target.value)}
          disabled={isDisabled("homeAddress")}
        />
        {getFieldError("personal.homeAddress") && (
          <p className="text-xs text-destructive">{getFieldError("personal.homeAddress")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>City</Label>
        <Select
          value={personalInfo.city}
          onValueChange={(value) => handleInputChange("city", value)}
          disabled={isDisabled("city")}
        >
          <SelectTrigger disabled={isDisabled("city")}>
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {pakistaniCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError("personal.city") && (
          <p className="text-xs text-destructive">{getFieldError("personal.city")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select
          value={personalInfo.department}
          onValueChange={(value) => handleInputChange("department", value)}
          disabled={isDisabled("department")}
        >
          <SelectTrigger disabled={isDisabled("department")}>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departmentOptions.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError("personal.department") && (
          <p className="text-xs text-destructive">{getFieldError("personal.department")}</p>
        )}
      </div>
    </div>
  )
}

export default PersonalInfoStep

