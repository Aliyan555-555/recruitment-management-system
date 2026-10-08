import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EducationEntry } from "@/app/register/types"
import { InstituteSelect } from "@/components/InstituteSelect"

type DegreeOption = { value: string; label: string; rank?: number }

type EducationStepProps = {
  entries: EducationEntry[]
  degreeOptions: DegreeOption[]
  passingYearOptions: string[]
  onEntryChange: (id: string, field: keyof EducationEntry, value: string) => void
  onAddEntry: () => void
  onRemoveEntry: (id: string) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
}

const EducationStep = ({
  entries,
  degreeOptions,
  passingYearOptions,
  onEntryChange,
  onAddEntry,
  onRemoveEntry,
  clearFieldError,
  getFieldError,
}: EducationStepProps) => {
  // Entries without a chosen level behave like degree-level (rank 40) so the stricter rules apply
  const levelRank = (entry: EducationEntry) =>
    degreeOptions.find((o) => o.value === entry.educationLevelId)?.rank ?? 40

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Education is optional. Add your qualifications if you have them, or continue to the next step.
      </p>
      {entries.map((entry, index) => (
        <Card key={entry.id} className="border-2 border-dashed">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Education #{index + 1}</CardTitle>
              <CardDescription>Provide details about this qualification</CardDescription>
            </div>
            {entries.length > 1 && (
              <Button variant="ghost" onClick={() => onRemoveEntry(entry.id)}>
                Remove
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Degree Level *</Label>
                <Select
                  value={entry.educationLevelId}
                  onValueChange={(value) => {
                    clearFieldError(`education.${index}.educationLevelId`)
                    onEntryChange(entry.id, "educationLevelId", value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select degree level" />
                  </SelectTrigger>
                  <SelectContent>
                    {degreeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError(`education.${index}.educationLevelId`) && (
                  <p className="text-xs text-destructive">
                    {getFieldError(`education.${index}.educationLevelId`)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title of degree *</Label>
                <Input
                  value={entry.degreeTitle}
                  onChange={(e) => {
                    clearFieldError(`education.${index}.degreeTitle`)
                    onEntryChange(entry.id, "degreeTitle", e.target.value)
                  }}
                />
                {getFieldError(`education.${index}.degreeTitle`) && (
                  <p className="text-xs text-destructive">
                    {getFieldError(`education.${index}.degreeTitle`)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{levelRank(entry) < 30 ? "School / College name *" : "Name of institution *"}</Label>
                <InstituteSelect
                  freeText={levelRank(entry) < 30}
                  value={{ instituteId: entry.instituteId, institute: entry.institute }}
                  onChange={(v) => {
                    clearFieldError(`education.${index}.institute`)
                    onEntryChange(entry.id, "instituteId", v.instituteId)
                    onEntryChange(entry.id, "institute", v.institute)
                  }}
                />
                {getFieldError(`education.${index}.institute`) && (
                  <p className="text-xs text-destructive">
                    {getFieldError(`education.${index}.institute`)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{levelRank(entry) >= 30 ? "Major subject *" : "Major subject (optional)"}</Label>
                <Input
                  value={entry.majorSubject}
                  placeholder="e.g., Computer Science"
                  onChange={(e) => {
                    clearFieldError(`education.${index}.majorSubject`)
                    onEntryChange(entry.id, "majorSubject", e.target.value)
                  }}
                />
                {getFieldError(`education.${index}.majorSubject`) && (
                  <p className="text-xs text-destructive">
                    {getFieldError(`education.${index}.majorSubject`)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade / CGPA</Label>
                <Input
                  placeholder="e.g. 3.5/4 or 85%"
                  value={entry.grade}
                  onChange={(e) => onEntryChange(entry.id, "grade", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Year of passing</Label>
                <Select
                  value={entry.passingYear}
                  onValueChange={(value) => {
                    clearFieldError(`education.${index}.passingYear`)
                    onEntryChange(entry.id, "passingYear", value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {passingYearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError(`education.${index}.passingYear`) && (
                  <p className="text-xs text-destructive">
                    {getFieldError(`education.${index}.passingYear`)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={onAddEntry}>
        Add More Education
      </Button>
      {getFieldError("education") && (
        <p className="text-sm text-destructive">{getFieldError("education")}</p>
      )}
    </div>
  )
}

export default EducationStep

