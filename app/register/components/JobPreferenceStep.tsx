import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JobPreferenceState } from "@/app/register/types"

type JobPreferenceStepProps = {
  jobPreference: JobPreferenceState
  priorityOptions: string[]
  onChange: (updates: Partial<JobPreferenceState>) => void
  clearFieldError: (key: string) => void
  getFieldError: (key: string) => string | undefined
}

const JobPreferenceStep = ({
  jobPreference,
  priorityOptions,
  onChange,
  clearFieldError,
  getFieldError,
}: JobPreferenceStepProps) => {
  const handleChange = (key: keyof JobPreferenceState, value: string) => {
    clearFieldError(`preferences.${key}`)
    onChange({ [key]: value })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["firstPriority", "secondPriority", "thirdPriority"] as const).map((priorityKey, index) => (
          <div key={priorityKey} className="space-y-2">
            <Label>{["First Priority", "Second Priority", "Third Priority"][index]} *</Label>
            <Select value={jobPreference[priorityKey]} onValueChange={(value) => handleChange(priorityKey, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError(`preferences.${priorityKey}`) && (
              <p className="text-xs text-destructive">{getFieldError(`preferences.${priorityKey}`)}</p>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Summary</Label>
        <Textarea
          value={jobPreference.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="Share more details about your ideal role or team."
        />
      </div>
    </div>
  )
}

export default JobPreferenceStep

