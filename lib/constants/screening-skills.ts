export interface SkillDefinition {
  key: string
  label: string
  description: string
  max: number
}

/** Rating criteria of the screening / final interview scorecard. Keys must match DEFAULT_SKILL_MAX. */
export const SCREENING_SKILLS: SkillDefinition[] = [
  { key: "appearance", label: "Appearance & outward personality", description: "Appropriately dressed and presentable. Appropriate body language and facial expressions.", max: 10 },
  { key: "education", label: "Educational background", description: "Suitably qualified (academically and professionally) for the job, from reputable institutions.", max: 10 },
  { key: "intellectual", label: "Intellectual disposition & general awareness", description: "Articulate, intelligent, aware of domestic and international current affairs.", max: 10 },
  { key: "leadership", label: "Leadership potential", description: "Strategic thinker and planner. Self-motivated team player. Believes in win-win outcomes.", max: 10 },
  { key: "principles", label: "Adherence to principles and values", description: "Committed to basic principles and values. No prejudice based on gender, background or beliefs.", max: 10 },
  { key: "itSkills", label: "IT skills", description: "Fluent with office applications, internet, e-mail and web based technologies.", max: 10 },
  { key: "communication", label: "Communication and inter-personal skills", description: "Fluent in verbal and written communication and presentation. Sound inter-personal skills.", max: 10 },
  { key: "commitment", label: "Commitment, enthusiasm and attention to quality", description: "Committed to hard work, quality conscious and generally enthusiastic.", max: 10 },
  { key: "assertiveness", label: "Assertiveness, self-confidence & self-discipline", description: "Sure of themselves, clear about personal and organizational goals, well organized.", max: 10 },
  { key: "versatility", label: "Versatility, innovativeness & creative thinking", description: "Variety of experience in academic or voluntary work. Exposure to sports, hobbies, travel, languages.", max: 10 },
  { key: "professionalKnowledge", label: "Professional knowledge", description: "In the specific area required by the job in question.", max: 25 },
  { key: "experience", label: "Relevance of previous experience", description: "To the specific job requirement and related areas.", max: 25 },
]
