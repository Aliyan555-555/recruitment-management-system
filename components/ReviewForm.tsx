"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Star, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>
  initialData?: Partial<ReviewFormData>
  loading?: boolean
  title?: string
  description?: string
}

export interface ReviewFormData {
  // Overall Rating
  overallRating: number
  recommendation: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "STRONG_NO_HIRE"
  
  // Technical Skills
  technicalSkills: number
  technicalSkillsNotes?: string
  
  // Communication
  communication: number
  communicationNotes?: string
  
  // Problem Solving
  problemSolving: number
  problemSolvingNotes?: string
  
  // Teamwork
  teamwork: number
  teamworkNotes?: string
  
  // Leadership
  leadership: number
  leadershipNotes?: string
  
  // Cultural Fit
  culturalFit: number
  culturalFitNotes?: string
  
  // Experience Relevance
  experienceRelevance: number
  experienceRelevanceNotes?: string
  
  // Education & Qualifications
  educationRelevance: number
  educationRelevanceNotes?: string
  
  // Strengths
  strengths: string
  
  // Weaknesses
  weaknesses: string
  
  // Overall Feedback
  overallFeedback: string
  
  // Additional Comments
  additionalComments?: string
  
  // Interview Quality
  interviewQuality: "Excellent" | "Good" | "Fair" | "Poor"
  
  // Candidate Preparedness
  candidatePreparedness: "Excellent" | "Good" | "Fair" | "Poor"
  
  // Follow-up Required
  followUpRequired: boolean
  followUpNotes?: string
  
  // Salary Expectations Match
  salaryExpectationsMatch: "Yes" | "No" | "Not Discussed"
  
  // Availability Match
  availabilityMatch: "Yes" | "No" | "Not Discussed"
  
  // Red Flags
  redFlags?: string
  
  // Positive Highlights
  positiveHighlights?: string
}

const defaultData: ReviewFormData = {
  overallRating: 0,
  recommendation: "HIRE",
  technicalSkills: 0,
  communication: 0,
  problemSolving: 0,
  teamwork: 0,
  leadership: 0,
  culturalFit: 0,
  experienceRelevance: 0,
  educationRelevance: 0,
  strengths: "",
  weaknesses: "",
  overallFeedback: "",
  interviewQuality: "Good",
  candidatePreparedness: "Good",
  followUpRequired: false,
  salaryExpectationsMatch: "Not Discussed",
  availabilityMatch: "Not Discussed"
}

export function ReviewForm({ 
  onSubmit, 
  initialData, 
  loading = false,
  title = "Candidate Review",
  description = "Provide comprehensive feedback on the candidate"
}: ReviewFormProps) {
  const [formData, setFormData] = useState<ReviewFormData>({
    ...defaultData,
    ...initialData
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleRatingChange = (field: keyof ReviewFormData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleTextChange = (field: keyof ReviewFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSelectChange = (field: keyof ReviewFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBooleanChange = (field: keyof ReviewFormData, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (formData.overallRating === 0) {
      newErrors.overallRating = "Overall rating is required"
    }

    if (!formData.strengths.trim()) {
      newErrors.strengths = "Strengths are required"
    }

    if (!formData.weaknesses.trim()) {
      newErrors.weaknesses = "Weaknesses are required"
    }

    if (!formData.overallFeedback.trim()) {
      newErrors.overallFeedback = "Overall feedback is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    await onSubmit(formData)
  }

  const RatingInput = ({ 
    label, 
    field, 
    value, 
    notesField, 
    notesValue 
  }: { 
    label: string
    field: keyof ReviewFormData
    value: number
    notesField?: keyof ReviewFormData
    notesValue?: string
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value > 0 && (
          <Badge variant="secondary">{value}/10</Badge>
        )}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingChange(field, rating)}
            className={`p-2 rounded transition-colors ${
              value >= rating
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className={`h-5 w-5 ${value >= rating ? "fill-current" : ""}`} />
          </button>
        ))}
      </div>
      {errors[field] && (
        <p className="text-sm text-destructive">{errors[field]}</p>
      )}
      {notesField && (
        <Textarea
          placeholder={`Notes on ${label.toLowerCase()}...`}
          value={notesValue || ""}
          onChange={(e) => handleTextChange(notesField, e.target.value)}
          rows={2}
          className="mt-2"
        />
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Rating & Recommendation */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base font-semibold">Overall Rating *</Label>
              <RatingInput
                label="Overall Rating"
                field="overallRating"
                value={formData.overallRating}
              />
            </div>
            <div>
              <Label className="text-base font-semibold">Recommendation *</Label>
              <Select
                value={formData.recommendation}
                onValueChange={(value) => handleSelectChange("recommendation", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRONG_HIRE">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Strong Hire
                    </div>
                  </SelectItem>
                  <SelectItem value="HIRE">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Hire
                    </div>
                  </SelectItem>
                  <SelectItem value="NO_HIRE">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-500" />
                      No Hire
                    </div>
                  </SelectItem>
                  <SelectItem value="STRONG_NO_HIRE">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Strong No Hire
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Detailed Assessment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RatingInput
                label="Technical Skills"
                field="technicalSkills"
                value={formData.technicalSkills}
                notesField="technicalSkillsNotes"
                notesValue={formData.technicalSkillsNotes}
              />
              <RatingInput
                label="Communication"
                field="communication"
                value={formData.communication}
                notesField="communicationNotes"
                notesValue={formData.communicationNotes}
              />
              <RatingInput
                label="Problem Solving"
                field="problemSolving"
                value={formData.problemSolving}
                notesField="problemSolvingNotes"
                notesValue={formData.problemSolvingNotes}
              />
              <RatingInput
                label="Teamwork"
                field="teamwork"
                value={formData.teamwork}
                notesField="teamworkNotes"
                notesValue={formData.teamworkNotes}
              />
              <RatingInput
                label="Leadership"
                field="leadership"
                value={formData.leadership}
                notesField="leadershipNotes"
                notesValue={formData.leadershipNotes}
              />
              <RatingInput
                label="Cultural Fit"
                field="culturalFit"
                value={formData.culturalFit}
                notesField="culturalFitNotes"
                notesValue={formData.culturalFitNotes}
              />
              <RatingInput
                label="Experience Relevance"
                field="experienceRelevance"
                value={formData.experienceRelevance}
                notesField="experienceRelevanceNotes"
                notesValue={formData.experienceRelevanceNotes}
              />
              <RatingInput
                label="Education Relevance"
                field="educationRelevance"
                value={formData.educationRelevance}
                notesField="educationRelevanceNotes"
                notesValue={formData.educationRelevanceNotes}
              />
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="strengths">Strengths *</Label>
              <Textarea
                id="strengths"
                value={formData.strengths}
                onChange={(e) => handleTextChange("strengths", e.target.value)}
                placeholder="List the candidate's key strengths..."
                rows={5}
                required
              />
              {errors.strengths && (
                <p className="text-sm text-destructive mt-1">{errors.strengths}</p>
              )}
            </div>
            <div>
              <Label htmlFor="weaknesses">Weaknesses / Areas for Improvement *</Label>
              <Textarea
                id="weaknesses"
                value={formData.weaknesses}
                onChange={(e) => handleTextChange("weaknesses", e.target.value)}
                placeholder="Identify areas where the candidate could improve..."
                rows={5}
                required
              />
              {errors.weaknesses && (
                <p className="text-sm text-destructive mt-1">{errors.weaknesses}</p>
              )}
            </div>
          </div>

          {/* Overall Feedback */}
          <div>
            <Label htmlFor="overallFeedback">Overall Feedback *</Label>
            <Textarea
              id="overallFeedback"
              value={formData.overallFeedback}
              onChange={(e) => handleTextChange("overallFeedback", e.target.value)}
              placeholder="Provide comprehensive overall feedback on the candidate..."
              rows={6}
              required
            />
            {errors.overallFeedback && (
              <p className="text-sm text-destructive mt-1">{errors.overallFeedback}</p>
            )}
          </div>

          {/* Interview Quality & Preparedness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Interview Quality</Label>
              <Select
                value={formData.interviewQuality}
                onValueChange={(value) => handleSelectChange("interviewQuality", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Candidate Preparedness</Label>
              <Select
                value={formData.candidatePreparedness}
                onValueChange={(value) => handleSelectChange("candidatePreparedness", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary & Availability Match */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Salary Expectations Match</Label>
              <Select
                value={formData.salaryExpectationsMatch}
                onValueChange={(value) => handleSelectChange("salaryExpectationsMatch", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Not Discussed">Not Discussed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Availability Match</Label>
              <Select
                value={formData.availabilityMatch}
                onValueChange={(value) => handleSelectChange("availabilityMatch", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Not Discussed">Not Discussed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Follow-up Required */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={formData.followUpRequired}
                onChange={(e) => handleBooleanChange("followUpRequired", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="followUpRequired">Follow-up Required</Label>
            </div>
            {formData.followUpRequired && (
              <Textarea
                placeholder="Specify what follow-up is needed..."
                value={formData.followUpNotes || ""}
                onChange={(e) => handleTextChange("followUpNotes", e.target.value)}
                rows={3}
              />
            )}
          </div>

          {/* Additional Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="positiveHighlights">Positive Highlights</Label>
              <Textarea
                id="positiveHighlights"
                value={formData.positiveHighlights || ""}
                onChange={(e) => handleTextChange("positiveHighlights", e.target.value)}
                placeholder="Key positive points to highlight..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="redFlags">Red Flags / Concerns</Label>
              <Textarea
                id="redFlags"
                value={formData.redFlags || ""}
                onChange={(e) => handleTextChange("redFlags", e.target.value)}
                placeholder="Any concerns or red flags identified..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="additionalComments">Additional Comments</Label>
              <Textarea
                id="additionalComments"
                value={formData.additionalComments || ""}
                onChange={(e) => handleTextChange("additionalComments", e.target.value)}
                placeholder="Any additional comments or observations..."
                rows={4}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

