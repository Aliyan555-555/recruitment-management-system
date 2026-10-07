import { z } from "zod"
import { callAiChat } from "@/lib/ai/ai-client"

const generatedQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct: z.string().min(1),
  points: z.number().int().positive(),
})

const generatedQuestionsSchema = z.array(generatedQuestionSchema).min(1)

export type GeneratedAssessmentQuestion = z.infer<typeof generatedQuestionSchema>

export class AssessmentGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AssessmentGenerationError"
  }
}

export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n")
    if (lines.length >= 2 && lines[lines.length - 1]?.trim().endsWith("```")) {
      lines.shift()
      lines.pop()
      return lines.join("\n").trim()
    }
  }
  const jsonMatch = trimmed.match(/(\[\s*[\s\S]*\s*\]|\{\s*[\s\S]*\s*\})/)
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim()
  }
  return trimmed
}

export function normalizePoints(
  questions: GeneratedAssessmentQuestion[],
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const rawTotal = questions.reduce((sum, question) => sum + question.points, 0)
  if (rawTotal <= 0) {
    throw new AssessmentGenerationError("Generated questions have invalid point totals")
  }

  const scaled = questions.map((question) => ({
    ...question,
    points: Math.max(1, Math.round((question.points / rawTotal) * maxPoints)),
  }))

  const scaledTotal = scaled.reduce((sum, question) => sum + question.points, 0)
  const delta = maxPoints - scaledTotal

  if (delta !== 0) {
    const last = scaled[scaled.length - 1]
    if (last) {
      scaled[scaled.length - 1] = {
        ...last,
        points: Math.max(1, last.points + delta),
      }
    }
  }

  return scaled
}

function validateGeneratedQuestions(
  questions: GeneratedAssessmentQuestion[],
  count: number,
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const parsed = generatedQuestionsSchema.parse(questions)

  if (parsed.length !== count) {
    throw new AssessmentGenerationError(
      `Expected ${count} questions but received ${parsed.length}`
    )
  }

  for (const question of parsed) {
    if (!question.options.includes(question.correct)) {
      throw new AssessmentGenerationError(
        "Generated question correct answer must match one of the provided options"
      )
    }
  }

  return normalizePoints(parsed, maxPoints)
}

async function requestQuestions(
  skill: string,
  count: number,
  strict: boolean
): Promise<string> {
  const systemPrompt = strict
    ? "You are a technical assessment generator. Return ONLY valid JSON array syntax with no markdown fences, no commentary, and no trailing text."
    : "You are a technical assessment generator. Return ONLY valid JSON, no markdown fences, no commentary."

  const userPrompt = `Generate ${count} multiple choice questions to assess practical, real-world proficiency in "${skill}". Mix difficulty from foundational to advanced. Return a JSON array of objects: { "question": string, "options": string[4], "correct": string (must exactly match one option), "points": number }.`

  try {
    return await callAiChat({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    })
  } catch (error: any) {
    console.error(`[Assessment Generator] Question generation request failed for skill '${skill}':`, error?.message)
    throw new AssessmentGenerationError(error?.message ?? "AI question generation failed")
  }
}

function parseAndValidateQuestions(
  raw: string,
  count: number,
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const cleaned = stripCodeFences(raw)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new AssessmentGenerationError("AI response was not valid JSON")
  }

  return validateGeneratedQuestions(parsed as GeneratedAssessmentQuestion[], count, maxPoints)
}

/**
 * High-quality fallback questions in case AI service is unavailable or exhausted
 */
export function getFallbackQuestions(skill: string, count: number, maxPoints: number): GeneratedAssessmentQuestion[] {
  const skillLower = skill.toLowerCase()
  let pool: Array<{ question: string; options: [string, string, string, string]; correct: string }> = []

  if (skillLower.includes("react")) {
    pool = [
      {
        question: "In React, which hook should be used to run a side effect only when a specific state variable changes?",
        options: ["useEffect with a dependency array", "useCallback with no dependencies", "useMemo with an empty array", "useLayoutEffect without dependencies"],
        correct: "useEffect with a dependency array",
      },
      {
        question: "What is the primary benefit of using React.memo on a functional component?",
        options: ["Prevents re-renders if props have not changed", "Stores state persistently in local storage", "Automatically catches runtime errors in child components", "Optimizes network fetch calls"],
        correct: "Prevents re-renders if props have not changed",
      },
      {
        question: "When updating state that depends on previous state in React, what is the best practice?",
        options: ["Pass an updater function to the state setter", "Directly mutate the existing state variable", "Call the state setter twice consecutively", "Read state from the DOM directly"],
        correct: "Pass an updater function to the state setter",
      },
      {
        question: "Which of the following is true regarding React keys in lists?",
        options: ["Keys must be uniquely identifiable among sibling elements", "Index is always the recommended key for dynamic lists", "Keys are accessible as props inside the rendered component", "Keys are only required for HTML div elements"],
        correct: "Keys must be uniquely identifiable among sibling elements",
      },
      {
        question: "What does the useRef hook return?",
        options: ["A mutable object with a .current property that persists across renders", "An immutable tuple containing the current state and setter", "A promise that resolves on the next DOM update", "A clone of the virtual DOM node"],
        correct: "A mutable object with a .current property that persists across renders",
      },
    ]
  } else if (skillLower.includes("javascript") || skillLower.includes("typescript") || skillLower.includes("node")) {
    pool = [
      {
        question: "What is the difference between '==' and '===' in JavaScript?",
        options: ["'===' checks both value and type without coercion, while '==' performs type coercion", "'==' is used only for primitive numbers, while '===' is used for objects", "'===' creates a new reference in memory", "'==' throws a TypeError on mismatched types"],
        correct: "'===' checks both value and type without coercion, while '==' performs type coercion",
      },
      {
        question: "Which mechanism in the JavaScript runtime handles asynchronous callbacks and promises?",
        options: ["The Event Loop and Microtask Queue", "The Thread Allocation Manager", "The Garbage Collection Pipeline", "The Synchronous Call Stack exclusively"],
        correct: "The Event Loop and Microtask Queue",
      },
      {
        question: "In TypeScript, what is the purpose of the 'unknown' type compared to 'any'?",
        options: ["'unknown' requires type narrowing or verification before performing operations", "'unknown' disables all type checking just like 'any'", "'unknown' can only represent null and undefined values", "'unknown' is an alias for the void primitive type"],
        correct: "'unknown' requires type narrowing or verification before performing operations",
      },
      {
        question: "How does Promise.all() behave when one of the passed promises rejects?",
        options: ["It immediately rejects with the reason of the first rejected promise", "It waits for all other promises to resolve before rejecting", "It ignores the rejection and returns resolved values only", "It converts the rejection into an undefined value in the array"],
        correct: "It immediately rejects with the reason of the first rejected promise",
      },
      {
        question: "What is a JavaScript closure?",
        options: ["A function that retains access to its lexical scope even when executed outside that scope", "A function that immediately terminates script execution", "A syntax error that occurs when a bracket is not closed", "An object that is immutable and cannot be modified"],
        correct: "A function that retains access to its lexical scope even when executed outside that scope",
      },
    ]
  } else if (skillLower.includes("sql") || skillLower.includes("postgres") || skillLower.includes("database")) {
    pool = [
      {
        question: "What is the primary difference between WHERE and HAVING clauses in SQL?",
        options: ["WHERE filters rows before aggregation, while HAVING filters aggregated groups", "WHERE can only be used with numbers, while HAVING is for strings", "HAVING is executed before the FROM clause", "WHERE requires an index, while HAVING does not"],
        correct: "WHERE filters rows before aggregation, while HAVING filters aggregated groups",
      },
      {
        question: "Which index type is the default and most widely used in PostgreSQL for equality and range queries?",
        options: ["B-tree index", "Hash index", "GIN index", "BRIN index"],
        correct: "B-tree index",
      },
      {
        question: "What does the ACID 'I' stand for in database management systems?",
        options: ["Isolation", "Integrity", "Indexing", "Iteration"],
        correct: "Isolation",
      },
      {
        question: "What happens during a LEFT JOIN if there is no match in the right table?",
        options: ["NULL values are returned for all columns of the right table", "The row from the left table is omitted from results", "A foreign key constraint violation error is thrown", "The query aborts and rolls back the transaction"],
        correct: "NULL values are returned for all columns of the right table",
      },
      {
        question: "Which command removes all rows from a table quickly without logging individual row deletions?",
        options: ["TRUNCATE TABLE", "DELETE FROM table", "DROP TABLE", "REMOVE ALL"],
        correct: "TRUNCATE TABLE",
      },
    ]
  } else if (skillLower.includes("python")) {
    pool = [
      {
        question: "In Python, what is the key difference between a list and a tuple?",
        options: ["Lists are mutable whereas tuples are immutable", "Tuples can only store integers whereas lists store any type", "Lists use parenthesis () and tuples use brackets []", "Tuples cannot be indexed or sliced"],
        correct: "Lists are mutable whereas tuples are immutable",
      },
      {
        question: "What is a Python decorator?",
        options: ["A function that takes another function and extends its behavior without modifying it", "A CSS style applied to Python GUI applications", "A built-in class used exclusively for memory management", "A method to declare constant variables in a module"],
        correct: "A function that takes another function and extends its behavior without modifying it",
      },
      {
        question: "Which built-in Python function returns an iterator that yields pairs of (index, item)?",
        options: ["enumerate()", "zip()", "range()", "map()"],
        correct: "enumerate()",
      },
      {
        question: "What does the 'with' statement ensure when working with file objects in Python?",
        options: ["The file is automatically closed when the block exits, even if an exception occurs", "The file is encrypted while being read or written", "Multiple threads can write to the file simultaneously without locking", "The file content is loaded entirely into GPU memory"],
        correct: "The file is automatically closed when the block exits, even if an exception occurs",
      },
      {
        question: "What is the output of bool([]) in Python?",
        options: ["False", "True", "None", "TypeError"],
        correct: "False",
      },
    ]
  } else {
    pool = [
      {
        question: `When applying best practices in "${skill}", which approach is most effective for ensuring maintainability and correctness?`,
        options: [
          `Following standard patterns, modular architecture, and writing automated unit tests`,
          `Writing all logic in a single monolithic script to minimize file lookups`,
          `Skipping documentation and code reviews to prioritize speed over quality`,
          `Hardcoding configuration values directly inside application components`,
        ],
        correct: `Following standard patterns, modular architecture, and writing automated unit tests`,
      },
      {
        question: `In production environments, how should errors and unexpected exceptions be handled when working with "${skill}"?`,
        options: [
          `Log detailed contextual errors, alert monitoring systems, and gracefully degrade user experience`,
          `Silently catch all errors with empty catch blocks without logging`,
          `Immediately crash the entire host machine whenever an error occurs`,
          `Expose raw database credentials and stack traces directly to end users`,
        ],
        correct: `Log detailed contextual errors, alert monitoring systems, and gracefully degrade user experience`,
      },
      {
        question: `What is the recommended strategy for managing performance and resource efficiency in "${skill}"?`,
        options: [
          `Profiling bottlenecks, using appropriate data structures, and caching expensive operations`,
          `Executing all computation synchronously on the main thread`,
          `Increasing network polling intervals to once every 10 milliseconds`,
          `Disabling garbage collection and memory reclamation`,
        ],
        correct: `Profiling bottlenecks, using appropriate data structures, and caching expensive operations`,
      },
      {
        question: `When collaborating with team members on a project involving "${skill}", which practice best preserves version history and stability?`,
        options: [
          `Using version control (e.g. Git) with feature branches and pull request reviews`,
          `Sharing code by emailing ZIP archives back and forth`,
          `Committing broken code directly to the production branch without testing`,
          `Disabling code linters and formatting standards across the team`,
        ],
        correct: `Using version control (e.g. Git) with feature branches and pull request reviews`,
      },
      {
        question: `Which fundamental principle of software engineering is most critical when scaling solutions in "${skill}"?`,
        options: [
          `Separation of concerns, clean interfaces, and low coupling between modules`,
          `Tight coupling of UI components directly to raw database storage layers`,
          `Duplicating code across multiple locations instead of abstracting reusable functions`,
          `Ignoring security patches and dependency updates`,
        ],
        correct: `Separation of concerns, clean interfaces, and low coupling between modules`,
      },
    ]
  }

  const selected: GeneratedAssessmentQuestion[] = []
  for (let i = 0; i < count; i++) {
    const item = pool[i % pool.length]!
    selected.push({
      question: count > pool.length && i >= pool.length ? `${item.question} (Q${i + 1})` : item.question,
      options: [...item.options],
      correct: item.correct,
      points: Math.max(1, Math.round(maxPoints / count)),
    })
  }

  return normalizePoints(selected, maxPoints)
}

export async function generateSkillQuestions(
  skill: string,
  count: number,
  maxPoints: number
): Promise<GeneratedAssessmentQuestion[]> {
  try {
    const raw = await requestQuestions(skill, count, false)
    return parseAndValidateQuestions(raw, count, maxPoints)
  } catch (firstError) {
    try {
      const raw = await requestQuestions(skill, count, true)
      return parseAndValidateQuestions(raw, count, maxPoints)
    } catch (secondError: any) {
      console.warn(
        `[Assessment Generator] AI generation for '${skill}' failed after retries (${secondError?.message}). Using curated assessment questions.`
      )
      return getFallbackQuestions(skill, count, maxPoints)
    }
  }
}
