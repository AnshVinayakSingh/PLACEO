import { NextResponse } from 'next/server'
import { callGeminiForJSON } from '@/lib/gemini-interview'

export type InterviewTrack = 'hr' | 'technical' | 'communication' | 'behavioral'

export interface InterviewQuestion {
  id: string
  track: InterviewTrack
  roundName?: string
  skill?: string
  level: number
  question: string
  context?: string
  expectedKeyPoints: string[]
  timeLimitSeconds: number
  modelAnswer: string
}

interface GenerateRequest {
  track: InterviewTrack
  jobDescription?: string
  resumeText?: string
  level: number
  questionCount: number
}

const TECH_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express',
  'Python', 'Java', 'C++', 'C#', 'SQL', 'PostgreSQL', 'MongoDB',
  'Git', 'Docker', 'Kubernetes', 'AWS', 'REST API', 'GraphQL',
  'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems',
  'Computer Networks', 'System Design', 'HTML', 'CSS', 'Tailwind',
  'Redux', 'Spring Boot', 'Django', 'Flask', 'Machine Learning',
]

function extractSkills(text: string): string[] {
  const found = new Set<string>()
  const lower = (text || '').toLowerCase()
  for (const skill of TECH_SKILLS) {
    const sLower = skill.toLowerCase()
    if (sLower === 'c++') {
      if (lower.includes('c++') || lower.includes('cpp')) found.add('C++')
    } else if (sLower === 'c#') {
      if (lower.includes('c#') || lower.includes('csharp')) found.add('C#')
    } else {
      const escaped = sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i')
      if (pattern.test(lower)) {
        found.add(skill)
      }
    }
  }
  return Array.from(found)
}

function getTimeLimitForLevel(level: number): number {
  switch (level) {
    case 0: return 90
    case 1: return 75
    case 2: return 60
    case 3: return 45
    case 4: return 35
    case 5: return 25
    default: return 60
  }
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const HR_QUESTIONS_POOL = [
  {
    question: "Tell me about yourself, your technical journey in engineering, and what drives your interest in our company.",
    points: ["Clear summary of education", "Key technical projects built", "Career aspiration aligned with the company"],
    model: "I am a computer science student specializing in building scalable web systems. Over college, I developed fullstack applications, practiced data structures, and contributed to team projects."
  },
  {
    question: "Why did you choose software engineering as a career, and which technical project are you most proud of?",
    points: ["Inspiration for coding", "STAR project explanation", "Personal contribution and impact"],
    model: "I enjoy solving algorithmic challenges and seeing code impact users. My proudest project was an automated scheduling system that reduced latency by 45% using Redis caching."
  },
  {
    question: "What specific factors make you want to join our organization over other tech firms?",
    points: ["Knowledge of company domain", "Interest in technology stack", "Excitement about product scale"],
    model: "I have been following your engineering innovations in scaling real-time distributed systems. The role matches my hands-on experience and provides the mentorship to grow into a principal engineer."
  },
  {
    question: "Describe a situation where a project failed or fell behind schedule. How did you handle it?",
    points: ["STAR method", "Root cause analysis", "Honest ownership and learnings"],
    model: "In our hackathon, our database lagged under concurrent load. Rather than panicking, we profiled slow queries, added indexes, and prioritized MVP features to demo on time."
  },
  {
    question: "Where do you envision yourself 2 to 3 years from now in our engineering hierarchy?",
    points: ["Technical depth", "Module ownership", "Mentoring juniors and leadership"],
    model: "In 2 to 3 years, I see myself owning core backend services, improving system reliability, and mentoring incoming interns."
  },
  {
    question: "How do you resolve architectural or implementation disagreements with teammates during code reviews?",
    points: ["Data-driven discussion", "Avoiding ego", "Prioritizing readability and user experience"],
    model: "I focus on benchmarks and documentation rather than personal preference. I discuss tradeoffs openly and compromise for the best product outcome."
  },
  {
    question: "If assigned an undocumented legacy codebase with critical production bugs, what is your first 48-hour plan?",
    points: ["Reading existing unit tests", "Tracing API entry points", "Documenting as you learn", "Batching targeted questions"],
    model: "I start by running test suites, mapping API routes, and creating architecture diagrams. When stuck, I batch specific questions for senior developers with context."
  },
  {
    question: "What are your salary expectations and what is your preference regarding hybrid or on-site work?",
    points: ["Professional tone", "Market alignment", "Flexibility"],
    model: "My primary goal is joining a high-impact engineering team. I am open to standard campus placement packages and fully flexible for hybrid or relocation."
  },
  {
    question: "Tell me about a time you had to learn an unfamiliar language or framework under a tight deadline.",
    points: ["Fast learning strategy", "Hands-on proof of concept", "Delivering working code"],
    model: "During an internship, the team required Go for a microservice. I read the documentation, built a small CRUD service over the weekend, and shipped the assigned endpoint on schedule."
  },
  {
    question: "What are your two greatest technical strengths and one area where you are actively improving?",
    points: ["Self-awareness", "Specific strengths with examples", "Actionable improvement plan"],
    model: "My strengths are clean modular code and database optimization. An area I am improving is container orchestration with Kubernetes, which I practice through local minikube clusters."
  },
  {
    question: "How do you prioritize multiple competing project deadlines during semester exams or sprint crunches?",
    points: ["Eisenhower matrix / Impact vs Urgency", "Communicating blockers early", "Avoiding burnout"],
    model: "I prioritize tasks by business criticality, communicate timelines transparently to team leads, and break complex tasks into 2-hour focused blocks."
  },
  {
    question: "What is the biggest ethical or technical dilemma you have faced in software development?",
    points: ["Data privacy or security awareness", "Standing up for best practices", "Responsible disclosure"],
    model: "I noticed sensitive user tokens being logged in plain text in an open repository. I immediately rotated the credentials and implemented environment variables with restricted access."
  },
  {
    question: "Do you prefer building fast prototypes or writing heavily-tested production systems? How do you balance the two?",
    points: ["Understanding business context", "Test-driven development when needed", "Pragmatic balance"],
    model: "During discovery, fast prototyping validates ideas. But once in production, comprehensive unit and integration tests are essential to prevent costly regressions."
  },
  {
    question: "What questions do you have for our engineering team about our culture and architecture?",
    points: ["Inquisitive mindset", "Asking about sprint lifecycle", "Engineering challenges"],
    model: "What does a typical sprint deployment cycle look like here, and what is the biggest technical challenge the engineering team is tackling this quarter?"
  }
]

const COMMUNICATION_ROUNDS = {
  round1: [
    {
      question: "Round 1 - Pronunciation & Articulation: Read this sentence clearly with steady pacing: 'The architectural synchronization of asynchronous microservices requires meticulous resilience and cryptographic precision.'",
      points: ["Clear pronunciation of multisyllabic words", "Even breathing pace", "Crisp consonant articulation"],
      model: "Proper cadence, pausing slightly after microservices, pronouncing synchronization and asynchronous cleanly without mumbling."
    },
    {
      question: "Round 1 - Elevator Pitch: Give a concise 45-second professional self-introduction highlighting your core value proposition as a software engineer.",
      points: ["Structured opening", "Core technical strengths", "Clear confident cadence"],
      model: "Hello, I am a software engineer specializing in scalable web systems. With proficiency in full-stack JavaScript and strong fundamentals in data structures, I love converting complex problems into elegant, reliable applications."
    },
    {
      question: "Round 1 - Phonetic Clarity: Articulate this sentence with clear distinction between sounds: 'Particularly vulnerable distributed networks must thoroughly authenticate every authoritative query.'",
      points: ["Distinct v vs w sounds", "Clean th enunciations", "Smooth vocal flow"],
      model: "Steady vocal projection, distinct emphasis on authoritative and vulnerable without rushing."
    },
    {
      question: "Round 1 - Vocal Projection: Speak clearly as if presenting to senior executives: 'Our primary objective is decreasing system downtime to zero point zero one percent while doubling throughput.'",
      points: ["Authoritative tone", "Clear numerical pronunciation", "Professional cadence"],
      model: "Confident delivery, distinct pronunciation of decimal percentages, and unwavering pace."
    }
  ],
  round2: [
    {
      question: "Round 2 - Jumbled Story: Unravel and narrate the following 4 events in logical sequential order: (A) The system successfully handled 100k requests during the flash sale. (B) Load testing revealed database connection timeouts. (C) Severe traffic spikes hit on Black Friday. (D) The team provisioned read replicas and connection pooling.",
      points: ["Correct order: B -> D -> C -> A", "Logical transition words like Initially, Consequently, Finally"],
      model: "The logical sequence is: Initially, load testing revealed connection timeouts (B). Consequently, the team provisioned read replicas (D). Then, severe traffic arrived (C). Finally, the system handled 100k requests smoothly (A)."
    },
    {
      question: "Round 2 - Narrative Incident: Connect these 3 concepts into a coherent 30-second story: 'A forgotten semicolon in production', 'A 2 AM rollback', and 'A new automated CI/CD linter rule'.",
      points: ["Cause, consequence, and long-term fix", "Cohesive narrative structure"],
      model: "Late at night, a syntax bug slipped through and caused a 2 AM rollback. Instead of assigning blame, the engineering team added an automated pre-commit linter to guarantee syntax errors never enter main branch again."
    },
    {
      question: "Round 2 - Story Ordering: Reorder these steps logically: (A) User complaints spike on Twitter. (B) A faulty third-party payment gateway update is deployed. (C) Fallback payment provider is toggled on. (D) Payment failure rates drop back to zero.",
      points: ["Correct chronological order: B -> A -> C -> D", "Clear narrative explanation"],
      model: "First, a third-party gateway failed (B). Next, users tweeted complaints (A). Then the engineers toggled the fallback provider (C). Finally, transaction success returned to normal (D)."
    }
  ],
  round3: [
    {
      question: "Round 3 - Grammar Test: Identify the parts of speech for 'swiftly' and 'resilience' in this sentence: 'The team swiftly restored system resilience after the outage.' Then convert the sentence into Passive Voice.",
      points: ["swiftly = Adverb", "resilience = Noun", "Passive: System resilience was swiftly restored by the team after the outage."],
      model: "Swiftly is an adverb modifying restored, and resilience is an abstract noun. In passive voice: 'System resilience was swiftly restored by the team after the outage.'"
    },
    {
      question: "Round 3 - Direct to Indirect Speech: Convert this quote into correct indirect speech: The manager announced, 'We will release the beta update next week if automated tests pass.'",
      points: ["Tense shift will -> would, pass -> passed", "Time shift next week -> the following week"],
      model: "The manager announced that they would release the beta update the following week if automated tests passed."
    },
    {
      question: "Round 3 - Voice & Grammar: Convert this into Active Voice and identify the main verb: 'The database schema was redesigned by the backend engineers to eliminate redundant joins.'",
      points: ["Active voice: 'The backend engineers redesigned the database schema to eliminate redundant joins.'", "Main verb: redesigned"],
      model: "In active voice: 'The backend engineers redesigned the database schema to eliminate redundant joins.' The main transitive verb is redesigned."
    }
  ]
}

const BEHAVIORAL_QUESTIONS_POOL = [
  {
    question: "Imagine you are an hour away from a major production release and you discover an edge-case bug. What exact sequence of actions do you take?",
    points: ["Blast radius assessment", "Immediate proactive communication with engineering lead", "Proposing concrete rollback or feature flag options"],
    model: "I immediately assess the risk. If it impacts data integrity, I notify the team lead with two clear options: disable the feature via feature flag or delay release for a hotfix."
  },
  {
    question: "How do you react when a product manager alters the project requirements halfway through a two-week sprint?",
    points: ["Understanding business value", "Calculating engineering tradeoffs", "Transparent scope negotiation"],
    model: "I understand the business reason for the shift, calculate what sprint tickets must be deprioritized to accommodate the scope, and communicate this transparently."
  },
  {
    question: "Suppose a senior developer repeatedly leaves harsh or blunt comments on your pull requests. How do you address this professionally?",
    points: ["Decoupling feedback from ego", "Scheduling a 1-on-1 sync", "Seeking clarity on architectural guidelines"],
    model: "I schedule a short 10-minute sync to ask: 'I want to ensure my code adheres to our team conventions. Could you walk me through the key principles you want me to adopt?'"
  },
  {
    question: "What is your stance on overtime during production crunch periods versus maintaining sustainable work-life balance?",
    points: ["Commitment during genuine emergencies", "Preventing burnout", "Clear advance notice for planned leaves"],
    model: "During true release crunches or outages, I am fully committed to working extra hours. However, I believe sustainable pacing prevents bugs, and I always communicate planned leaves in advance."
  },
  {
    question: "Describe a time you were blocked by an external team that was unresponsive. How did you keep making progress?",
    points: ["Mocking API contracts", "Following up through established communication channels", "Escalating constructively"],
    model: "Rather than waiting idle, I created mock data contracts so my frontend work proceeded. Meanwhile, I posted in their Slack channel with context and timeline impact."
  },
  {
    question: "Have you ever made a mistake that affected a project or teammates? How did you take ownership?",
    points: ["Immediate admission without blaming others", "Prompt remediation", "Implementing safeguards"],
    model: "I once dropped a staging table during a schema migration test. I informed the team, restored the database from automated backup, and created a pre-migration verification script."
  }
]

const TECH_QUESTIONS_POOL: Record<string, { question: string; points: string[]; model: string }[]> = {
  java: [
    {
      question: "Explain the internal working of Java HashMap. What happens when two distinct keys produce the exact same hash code?",
      points: ["hashCode() & bucket indexing", "LinkedList collision chaining", "Treeify threshold to Red-Black Tree in Java 8+"],
      model: "HashMap hashes keys to bucket slots. On collision, entries form a linked list. If collisions exceed 8 entries, it converts to a Red-Black Tree for O(log n) search."
    },
    {
      question: "What is the key difference between String, StringBuilder, and StringBuffer in Java memory management?",
      points: ["String immutability in String Pool", "StringBuilder mutability (fast, non-thread-safe)", "StringBuffer synchronization"],
      model: "String is immutable in the string pool. StringBuilder is mutable for single-threaded loops, while StringBuffer is synchronized and thread-safe."
    },
    {
      question: "How does Garbage Collection work in Java? Contrast Minor GC in Young Generation with Major GC in Old Generation.",
      points: ["Eden, S0, S1, Tenured", "Generational hypothesis", "Mark and sweep"],
      model: "Objects are born in Eden. Surviving objects move through survivor spaces to Old Generation. Minor GC cleans short-lived objects quickly; Major GC cleans old objects."
    }
  ],
  python: [
    {
      question: "What is the Global Interpreter Lock (GIL) in CPython, and how does it impact multi-threaded CPU-bound programs?",
      points: ["Mutex preventing multiple threads from executing Python bytecodes", "Impact on CPU vs I/O bound", "Multiprocessing alternative"],
      model: "GIL allows only one thread to execute Python bytecode at a time, limiting multi-threaded CPU speedup. For CPU-bound tasks, we use the multiprocessing library instead."
    },
    {
      question: "Explain the difference between Python generators using 'yield' versus regular functions returning a list.",
      points: ["Lazy evaluation", "O(1) memory consumption", "next() iteration suspension"],
      model: "Generators evaluate items on demand with yield, keeping memory complexity at O(1), whereas returning a list creates the full array in RAM upfront."
    }
  ],
  react: [
    {
      question: "What triggers a re-render in React, and how does React's Virtual DOM reconciliation diffing algorithm optimize DOM updates?",
      points: ["State or prop changes", "Fiber tree reconciliation", "Key heuristic for O(n) updates"],
      model: "Re-renders occur on state or prop updates. React computes virtual DOM diffs using keys, applying minimal real DOM mutations in O(n) linear time."
    },
    {
      question: "Explain the purpose of React useEffect dependency arrays and how to prevent infinite render loops.",
      points: ["Side-effect synchronization", "Cleanup functions", "Stale closures vs infinite loops"],
      model: "useEffect synchronizes state with side effects. Omitting dependencies creates stale closures, while updating state in effect without proper deps causes infinite loops."
    }
  ],
  sql: [
    {
      question: "Explain ACID properties in database transactions and provide a concrete banking funds transfer example.",
      points: ["Atomicity", "Consistency", "Isolation", "Durability"],
      model: "In money transfer: Atomicity ensures debit and credit happen together or roll back. Consistency maintains balance rules. Isolation prevents dirty reads. Durability writes to disk."
    },
    {
      question: "What is the performance difference between Clustered and Non-Clustered Indexes in a relational database?",
      points: ["Physical row order in Clustered", "Non-clustered pointers to row address", "Impact on range queries vs lookups"],
      model: "A clustered index physically sorts table rows on disk (usually the Primary Key). A non-clustered index is a separate B-tree pointing to row locators."
    }
  ],
  dsa: [
    {
      question: "Explain how you would detect a cycle in a singly linked list with O(1) extra space complexity.",
      points: ["Floyd's Cycle-Finding Algorithm", "Slow and Fast pointers", "Meeting point proof"],
      model: "Use Floyd's tortoise and hare algorithm: move slow pointer by 1 step and fast pointer by 2 steps. If they ever collide, a cycle exists."
    },
    {
      question: "When would you choose a Breadth-First Search (BFS) over a Depth-First Search (DFS) on a graph?",
      points: ["Shortest path in unweighted graphs", "Level-by-level traversal", "Queue vs Stack/Recursion"],
      model: "BFS is optimal for finding the shortest path in unweighted graphs and exploring nearest neighbors, whereas DFS is suited for backtracking and topological sorting."
    },
    {
      question: "What is the difference between a Max-Heap and a Binary Search Tree (BST)? What is the lookup time for an arbitrary element?",
      points: ["Heap order property vs BST order property", "Heap arbitrary lookup O(n)", "BST arbitrary lookup O(log n)"],
      model: "A Heap ensures parent >= children (O(1) find max, O(n) find arbitrary). A BST maintains left < parent < right, enabling O(log n) lookup for any key."
    }
  ]
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  0: 'Beginner: simple vocabulary, slow/patient pace, very encouraging, no follow-up pressure.',
  1: 'Easy: friendly conversational HR pace, standard placement-style questions.',
  2: 'Standard: typical corporate interview tone, formal, verifies depth with normal follow-ups.',
  3: 'Pressure: probes claims on the resume with pointed follow-ups, tests composure.',
  4: 'Intense: fast-paced, direct cross-examination, challenges vague answers immediately.',
  5: 'Extreme: rapid-fire, short sharp questions, minimal small talk, tests instant recall/logic.',
}

interface AIQuestionItem {
  question: string
  expectedKeyPoints: string[]
  modelAnswer: string
  skill?: string
  roundName?: string
}

/**
 * Ask Gemini to write a genuinely fresh, resume/JD-aware question set for this track.
 * Returns null (never throws) if the AI call fails for any reason, so the caller can
 * fall back to the static question banks below and the feature never hard-breaks.
 */
async function generateQuestionsWithAI(
  track: InterviewTrack,
  jobDescription: string,
  resumeText: string,
  level: number,
  questionCount: number,
  detectedSkills: string[]
): Promise<AIQuestionItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const trackInstructions: Record<InterviewTrack, string> = {
    hr: `Write HR-round interview questions (career journey, motivation for this company/role, strengths/weaknesses, conflict handling, prioritization, ethics, salary/logistics). Personalize at least half the questions using specifics visible in the resume/job description (named projects, companies, skills) rather than generic phrasing. Every question needs "expectedKeyPoints" (2-4 short bullet points an evaluator should listen for) and a concise "modelAnswer" (2-3 sentences).`,
    technical: `Write SHORT, spoken-aloud technical/logic questions (NOT long coding problems) that verify each skill actually listed in the resume/job description. For every distinct skill found (e.g. React, Python, SQL, DSA, DBMS, OS, Networks), ask at least 2-3 short conceptual or logic questions about it, tagged with "skill". If very few skills were detected, cover core CS fundamentals (Data Structures, DBMS, OS, Networks) instead. Every question needs "expectedKeyPoints" (2-4 technical points to verify) and a concise, technically correct "modelAnswer".`,
    communication: `Write a communication-skills test with exactly three rounds, tagged via "roundName": "Round 1: Articulation & Pronunciation" (a sentence to read aloud clearly, tricky to pronounce), "Round 2: Jumbled Incident Story" (3-4 out-of-order workplace events the candidate must reorder and narrate logically), and "Round 3: Grammar & Voice Test" (parts of speech / active-passive / direct-indirect conversion tasks). Split questionCount roughly evenly across the three rounds. Every question needs "expectedKeyPoints" describing exactly what a correct response looks like, and a "modelAnswer".`,
    behavioral: `Write behavioral/situational interview questions (pressure scenarios, teamwork conflict, deadline changes, mistakes and ownership, work-life balance, dealing with difficult colleagues). Every question needs "expectedKeyPoints" and a concise "modelAnswer".`,
  }

  const systemInstruction = `You are an expert interview-question writer for a placement-prep platform aimed at engineering students. You always output ONLY valid JSON matching the requested schema — no markdown, no commentary, no code fences.`

  const userPrompt = `Generate exactly ${questionCount} interview questions for a "${track}" round.

Difficulty/pace level ${level}/5: ${LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS[2]}

${trackInstructions[track]}

Candidate's resume text:
"""${resumeText || '(not provided)'}"""

Target job description:
"""${jobDescription || '(not provided)'}"""

Detected resume/JD skills to prioritize for a technical round: ${detectedSkills.join(', ') || 'none detected — use core CS fundamentals'}

Return ONLY this JSON shape:
{
  "questions": [
    { "question": "string", "expectedKeyPoints": ["string", "string"], "modelAnswer": "string", "skill": "string (technical track only, omit otherwise)", "roundName": "string (communication track only, omit otherwise)" }
  ]
}
Make sure the "questions" array has exactly ${questionCount} items. Never repeat the same question twice in the array. Do not add any extra keys.`

  const result = await callGeminiForJSON<{ questions: AIQuestionItem[] }>(apiKey, systemInstruction, userPrompt, {
    temperature: 0.9,
    maxOutputTokens: 4096,
  })

  if (!result.ok) return null
  const items = result.data?.questions
  if (!Array.isArray(items) || items.length === 0) return null
  return items.filter((q) => q && typeof q.question === 'string' && q.question.trim().length > 0)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest
    const { track = 'hr', jobDescription = '', resumeText = '', level = 2, questionCount = 10 } = body

    const detectedSkills = extractSkills(`${jobDescription} ${resumeText}`)
    const effectiveSkills = detectedSkills.length > 0 ? detectedSkills : ['Data Structures', 'Java', 'Python', 'SQL', 'React', 'Algorithms']
    const timeLimit = getTimeLimitForLevel(level)

    const questions: InterviewQuestion[] = []

    // ── PRIMARY PATH: real AI-generated, resume/JD-aware questions ──────────────
    const aiItems = await generateQuestionsWithAI(track, jobDescription, resumeText, level, questionCount, detectedSkills)
    if (aiItems && aiItems.length > 0) {
      for (let i = 0; i < questionCount; i++) {
        const item = aiItems[i % aiItems.length]
        questions.push({
          id: `${track}-ai-${Date.now()}-${i + 1}`,
          track,
          level,
          question: item.question,
          skill: item.skill,
          roundName: item.roundName,
          expectedKeyPoints: Array.isArray(item.expectedKeyPoints) && item.expectedKeyPoints.length > 0
            ? item.expectedKeyPoints
            : ['Clarity of explanation', 'Relevant technical/behavioral substance'],
          timeLimitSeconds: item.roundName?.includes('Jumbled') ? timeLimit + 15 : timeLimit,
          modelAnswer: item.modelAnswer || 'A clear, structured, specific answer grounded in real experience.',
        })
      }

      return NextResponse.json({
        success: true,
        track,
        level,
        totalQuestions: questions.length,
        detectedSkills,
        source: 'ai',
        questions,
      })
    }

    // ── FALLBACK PATH: static question banks (used only if Gemini is unavailable,
    // unconfigured, or rate-limited — keeps the feature working live, never blank) ──
    if (track === 'hr') {
      const shuffled = shuffle(HR_QUESTIONS_POOL)
      for (let i = 0; i < questionCount; i++) {
        const item = shuffled[i % shuffled.length]
        questions.push({
          id: `hr-${Date.now()}-${i + 1}`,
          track: 'hr',
          level,
          question: item.question,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: item.model,
        })
      }
    } else if (track === 'technical') {
      const allTechItems: { question: string; points: string[]; model: string; skill: string }[] = []
      for (const skill of effectiveSkills) {
        const sLower = skill.toLowerCase()
        let matchingKey = 'dsa'
        if (sLower.includes('java') && !sLower.includes('script')) matchingKey = 'java'
        else if (sLower.includes('python')) matchingKey = 'python'
        else if (sLower.includes('react') || sLower.includes('next') || sLower.includes('script')) matchingKey = 'react'
        else if (sLower.includes('sql') || sLower.includes('dbms') || sLower.includes('mongo')) matchingKey = 'sql'

        const bank = TECH_QUESTIONS_POOL[matchingKey] || TECH_QUESTIONS_POOL.dsa
        for (const q of bank) {
          allTechItems.push({ ...q, skill })
        }
      }

      const shuffledTech = shuffle(allTechItems)
      for (let i = 0; i < questionCount; i++) {
        const item = shuffledTech[i % shuffledTech.length]
        questions.push({
          id: `tech-${Date.now()}-${i + 1}`,
          track: 'technical',
          skill: item.skill,
          level,
          question: item.question,
          context: `Target Skill: ${item.skill}`,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: item.model,
        })
      }
    } else if (track === 'communication') {
      const r1 = shuffle(COMMUNICATION_ROUNDS.round1)
      const r2 = shuffle(COMMUNICATION_ROUNDS.round2)
      const r3 = shuffle(COMMUNICATION_ROUNDS.round3)

      const r1Count = Math.max(2, Math.floor(questionCount / 3))
      const r2Count = Math.max(2, Math.floor(questionCount / 3))
      const r3Count = questionCount - r1Count - r2Count

      for (let i = 0; i < r1Count; i++) {
        const item = r1[i % r1.length]
        questions.push({
          id: `comm-r1-${Date.now()}-${i + 1}`,
          track: 'communication',
          roundName: 'Round 1: Articulation & Pronunciation',
          level,
          question: item.question,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: item.model,
        })
      }
      for (let i = 0; i < r2Count; i++) {
        const item = r2[i % r2.length]
        questions.push({
          id: `comm-r2-${Date.now()}-${i + 1}`,
          track: 'communication',
          roundName: 'Round 2: Jumbled Incident Story',
          level,
          question: item.question,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit + 15,
          modelAnswer: item.model,
        })
      }
      for (let i = 0; i < r3Count; i++) {
        const item = r3[i % r3.length]
        questions.push({
          id: `comm-r3-${Date.now()}-${i + 1}`,
          track: 'communication',
          roundName: 'Round 3: Grammar & Voice Test',
          level,
          question: item.question,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: item.model,
        })
      }
    } else if (track === 'behavioral') {
      const shuffledBeh = shuffle(BEHAVIORAL_QUESTIONS_POOL)
      for (let i = 0; i < questionCount; i++) {
        const item = shuffledBeh[i % shuffledBeh.length]
        questions.push({
          id: `beh-${Date.now()}-${i + 1}`,
          track: 'behavioral',
          level,
          question: item.question,
          expectedKeyPoints: item.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: item.model,
        })
      }
    }

    return NextResponse.json({
      success: true,
      track,
      level,
      totalQuestions: questions.length,
      detectedSkills,
      source: 'fallback-bank',
      questions,
    })
  } catch (err: unknown) {
    console.error('Failed to generate interview questions:', err)
    return NextResponse.json(
      { error: 'Could not generate interview questions. Please try again.' },
      { status: 500 }
    )
  }
}
