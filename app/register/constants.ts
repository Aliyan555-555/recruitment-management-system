export const steps = [
  { title: "Personal Info", description: "Tell us about yourself" },
  { title: "Education", description: "Share your academic background" },
  { title: "Experience & Skills", description: "Highlight your expertise" },
  { title: "Job Preferences", description: "Where do you want to grow?" },
  { title: "Security & Disclaimer", description: "Create credentials & confirm" },
]

export const titles = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."]
export const genderOptions = ["Male", "Female", "Other"]
export const maritalStatuses = ["Single", "Married", "Divorced", "Widowed"]
export const priorityOptions = ["IT", "Admin", "HR", "Finance", "Operations", "Not Applicable"]
export const religionOptions = ["Islam", "Christianity", "Hinduism", "Sikhism", "Other"]

export const nationalityOptions = [
  "Pakistani",
  "Afghan",
  "Bangladeshi",
  "Chinese",
  "Indian",
  "Iranian",
  "Sri Lankan",
  "Other",
]

export const pakistaniCities = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Peshawar",
  "Quetta",
  "Multan",
  "Faisalabad",
  "Hyderabad",
  "Sialkot",
  "Sukkur",
  "Gujranwala",
  "Other",
]

export const departmentOptions = [
  "Information Technology",
  "Human Resources",
  "Finance",
  "Accounting",
  "Marketing",
  "Sales",
  "Operations",
  "Customer Support",
  "Procurement",
  "Logistics",
  "Legal",
  "Engineering",
  "Research & Development",
  "Quality Assurance",
  "Administration",
  "Education",
  "Healthcare",
  "Other",
]

export const degreeLevelOptions = [
  "Matric / O-Level",
  "Intermediate / A-Level",
  "Diploma",
  "Bachelor's",
  "Master's",
  "MPhil / MS",
  "PhD",
  "Professional Certification",
]

export const passingYearOptions = Array.from({ length: 50 }, (_, index) => {
  const year = new Date().getFullYear() - index
  return year.toString()
})

