import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExperienceEntry, SkillEntry } from "@/app/register/types"
import { sanitizeSkillInput } from "@/lib/skills"

type ExperienceSkillsStepProps = {
  experiences: ExperienceEntry[]
  skills: SkillEntry[]
  onExperienceChange: (id: string, field: keyof ExperienceEntry, value: string | boolean) => void
  onSkillChange: (id: string, field: keyof SkillEntry, value: string | number) => void
  onAddExperience: () => void
  onRemoveExperience: (id: string) => void
  onAddSkill: () => void
  onRemoveSkill: (id: string) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
}

const ExperienceSkillsStep = ({
  experiences,
  skills,
  onExperienceChange,
  onSkillChange,
  onAddExperience,
  onRemoveExperience,
  onAddSkill,
  onRemoveSkill,
  clearFieldError,
  getFieldError,
}: ExperienceSkillsStepProps) => {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {experiences.map((entry, index) => (
          <Card key={entry.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Experience #{index + 1}</CardTitle>
                <CardDescription>Professional experience details</CardDescription>
              </div>
              {experiences.length > 1 && (
                <Button variant="ghost" onClick={() => onRemoveExperience(entry.id)}>
                  Remove
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g., Senior Software Engineer"
                    value={entry.jobTitle}
                    onChange={(e) => {
                      clearFieldError(`experience.${index}.jobTitle`)
                      onExperienceChange(entry.id, "jobTitle", e.target.value)
                    }}
                  />
                  {getFieldError(`experience.${index}.jobTitle`) && (
                    <p className="text-xs text-destructive">
                      {getFieldError(`experience.${index}.jobTitle`)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input
                    placeholder="e.g., ABC Technologies"
                    value={entry.company}
                    onChange={(e) => {
                      clearFieldError(`experience.${index}.company`)
                      onExperienceChange(entry.id, "company", e.target.value)
                    }}
                  />
                  {getFieldError(`experience.${index}.company`) && (
                    <p className="text-xs text-destructive">
                      {getFieldError(`experience.${index}.company`)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={entry.location}
                    onChange={(e) => onExperienceChange(entry.id, "location", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={entry.startDate}
                    onChange={(e) => onExperienceChange(entry.id, "startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    type="date"
                    disabled={entry.isCurrent}
                    value={entry.endDate}
                    onChange={(e) => onExperienceChange(entry.id, "endDate", e.target.value)}
                  />
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border"
                      checked={entry.isCurrent}
                      onChange={(e) => onExperienceChange(entry.id, "isCurrent", e.target.checked)}
                    />
                    <span>To Present</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={onAddExperience}>
          Add More Experience
        </Button>
        {getFieldError("experience") && (
          <p className="text-sm text-destructive">{getFieldError("experience")}</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Skills</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add skill names only — no spaces, stored in uppercase. Proficiency is verified later via AI assessment.
          </p>
        </div>
        {skills.map((skill, index) => (
          <div key={skill.id} className="flex flex-col md:flex-row items-center gap-4 border rounded-lg p-4">
            <div className="w-full">
              <Label>Skill Name *</Label>
              <Input
                value={skill.name}
                placeholder="e.g. REACT, PYTHON"
                onChange={(e) => {
                  clearFieldError("skills")
                  clearFieldError(`skills.${index}.name`)
                  onSkillChange(skill.id, "name", sanitizeSkillInput(e.target.value))
                }}
              />
              {getFieldError(`skills.${index}.name`) && (
                <p className="text-xs text-destructive">
                  {getFieldError(`skills.${index}.name`)}
                </p>
              )}
            </div>
            {skills.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => {
                  clearFieldError("skills")
                  onRemoveSkill(skill.id)
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => {
            clearFieldError("skills")
            onAddSkill()
          }}
        >
          Add New Skill
        </Button>
        {getFieldError("skills") && (
          <p className="text-sm text-destructive">{getFieldError("skills")}</p>
        )}
      </div>
    </div>
  )
}

export default ExperienceSkillsStep

