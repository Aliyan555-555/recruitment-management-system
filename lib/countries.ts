/**
 * List of countries for dropdown selection
 * Includes country code and name
 */
export const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KW", name: "Kuwait" },
  { code: "LB", name: "Lebanon" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
] as const;

export const AVAILABILITY_OPTIONS = [
  "Immediately Available",
  "Available in 2 Weeks",
  "Available in 1 Month",
  "Available in 2 Months",
  "Available in 3 Months",
  "Not Currently Looking",
] as const;

export const NOTICE_PERIOD_OPTIONS = [
  "No Notice Period",
  "1 Week",
  "2 Weeks",
  "1 Month",
  "2 Months",
  "3 Months",
  "Negotiable",
] as const;

export const PAKISTANI_CITIES = [
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
] as const;

export const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
] as const;

export const RELIGION_OPTIONS = [
  "Islam",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Other",
] as const;

export const NATIONALITY_OPTIONS = [
  "Pakistani",
  "Afghan",
  "Bangladeshi",
  "Chinese",
  "Indian",
  "Iranian",
  "Sri Lankan",
  "Other",
] as const;

export const DEPARTMENT_OPTIONS = [
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
] as const;

export const DEGREE_LEVEL_OPTIONS = [
  "Matric / O-Level",
  "Intermediate / A-Level",
  "Diploma",
  "Bachelor's",
  "Master's",
  "MPhil / MS",
  "PhD",
  "Professional Certification",
] as const;

//  Generate years for passing year dropdown (last 50 years)
export const  PASSING_YEAR_OPTIONS = Array.from({ length: 50 }, (_, index) => {
  const year = new Date().getFullYear() - index;
  return year.toString();
});
