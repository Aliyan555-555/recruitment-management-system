import Joi from "joi"

export const personalInfoSchema = Joi.object({
  title: Joi.string().required().messages({ "any.required": "Title is required" }),
  firstname: Joi.string().min(2).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
  }),
  lastname: Joi.string().min(2).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters",
  }),
  fatherName: Joi.string().min(2).required().messages({
    "string.empty": "Father name is required",
  }),
  email: Joi.string().email({ tlds: false }).required().messages({
    "string.email": "Enter a valid email address",
    "any.required": "Email is required",
  }),
  username: Joi.string().min(3).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 3 characters",
  }),
  contactNumber: Joi.string()
    .pattern(/^\d{4}-\d{7}$/)
    .required()
    .messages({
      "string.pattern.base": "Use format 03XX-XXXXXXX",
      "any.required": "Contact number is required",
    }),
  alternateNumber: Joi.string().allow(""),
  religion: Joi.string().required().messages({ "any.required": "Religion is required" }),
  nationality: Joi.string().required().messages({ "any.required": "Nationality is required" }),
  dateOfBirth: Joi.string()
    .allow("")
    .custom((value, helpers) => {
      if (!value) return value
      const dateValue = new Date(value)
      if (Number.isNaN(dateValue.getTime())) {
        return helpers.error("date.base")
      }
      const today = new Date()
      const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
      if (dateValue > eighteenYearsAgo) {
        return helpers.error("date.less")
      }
      return value
    })
    .messages({
      "date.base": "Enter a valid date",
      "date.less": "You must be at least 18 years old",
    }),
  cnic: Joi.string()
    .pattern(/^\d{5}-\d{7}-\d{1}$/)
    .required()
    .messages({
      "string.pattern.base": "Use format #####-#######-#",
      "any.required": "CNIC is required",
    }),
  gender: Joi.string().required().messages({ "any.required": "Gender is required" }),
  maritalStatus: Joi.string().required().messages({ "any.required": "Marital status is required" }),
  preferredCity: Joi.string().required().messages({ "any.required": "Preferred city is required" }),
  homeAddress: Joi.string().min(5).required().messages({
    "string.empty": "Home address is required",
    "string.min": "Home address is too short",
  }),
  city: Joi.string().required().messages({ "any.required": "City is required" }),
  postalCode: Joi.string()
    .length(5)
    .required()
    .messages({
      "string.length": "Postal code must be 5 digits",
      "any.required": "Postal code is required",
    }),
  institution: Joi.string().allow(""),
  department: Joi.string().required().messages({
    "any.required": "Department is required",
  }),
})

export const educationEntrySchemaJoi = Joi.object({
  educationLevelId: Joi.string().required().messages({
    "any.required": "Degree level is required",
  }),
  degreeTitle: Joi.string().min(2).required().messages({
    "string.empty": "Degree title is required",
  }),
  institute: Joi.string().min(2).required().messages({
    "string.empty": "Institution name is required",
  }),
  majorSubject: Joi.string().min(2).required().messages({
    "string.empty": "Major subject is required",
  }),
  grade: Joi.string().allow(""),
  passingYear: Joi.string().required().messages({
    "any.required": "Year of passing is required",
  }),
}).options({ allowUnknown: true })

export const experienceEntrySchemaJoi = Joi.object({
  jobTitle: Joi.string().required().messages({
    "string.empty": "Job title is required",
    "any.required": "Job title is required",
  }),
  company: Joi.string().required().messages({
    "string.empty": "Company name is required",
    "any.required": "Company name is required",
  }),
  location: Joi.string().allow(""),
  startDate: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),
  endDate: Joi.when("isCurrent", {
    is: Joi.valid(true),
    then: Joi.any().strip(),
    otherwise: Joi.date().required().messages({
      "date.base": "End date must be a valid date",
      "any.required": "End date is required unless you are currently in this role",
    }),
  }),
  isCurrent: Joi.boolean(),
}).options({ allowUnknown: true })

export const skillEntrySchemaJoi = Joi.object({
  name: Joi.string().min(2).required().messages({
    "string.empty": "Skill name is required",
  }),
  level: Joi.number().min(1).max(10).required(),
}).options({ allowUnknown: true })

export const jobPreferenceSchemaJoi = Joi.object({
  firstPriority: Joi.string().required().messages({
    "any.required": "First priority is required",
  }),
  secondPriority: Joi.string().required().messages({
    "any.required": "Second priority is required",
  }),
  thirdPriority: Joi.string().required().messages({
    "any.required": "Third priority is required",
  }),
  summary: Joi.string().allow(""),
})

export const securitySchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must not exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match. Please ensure both passwords are identical",
      "any.required": "Please confirm your password",
    }),
  verification: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      "any.only": "You must authorize verification of the provided information",
      "any.required": "Verification authorization is required",
    }),
  truth: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      "any.only": "You must affirm that the information provided is true",
      "any.required": "Truth affirmation is required",
    }),
  liability: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      "any.only": "You must accept the liability statement to proceed",
      "any.required": "Liability acceptance is required",
    }),
})

