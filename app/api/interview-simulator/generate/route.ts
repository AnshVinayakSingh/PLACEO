import { NextResponse } from 'next/server'

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
  const lower = text.toLowerCase()
  for (const skill of TECH_SKILLS) {
    const pattern = new RegExp(`\\b${skill.toLowerCase()}\\b`, 'i')
    if (pattern.test(lower)) {
      found.add(skill)
    }
  }
  return Array.from(found)
}

function getTimeLimitForLevel(level: number): number {
  switch (level) {
    case 0: return 90 // Relaxed, slow pace
    case 1: return 75
    case 2: return 60 // Standard corporate pace
    case 3: return 45 // Pressure starts
    case 4: return 35 // Intense
    case 5: return 25 // Rapid fire
    default: return 60
  }
}

const HR_QUESTIONS_BANK = [
  {
    question: "Tell me about yourself and walk me through your engineering background.",
    points: ["Clear summary of education", "Key technical projects", "Career aspiration aligned with the role"],
    model: "I am a computer science student passionate about software engineering. Over the past few years, I have built full-stack applications, honed my problem-solving skills in data structures, and completed internships where I collaborated with engineering teams to deploy production features."
  },
  {
    question: "Why do you want to join our company specifically, and what makes you interested in this role?",
    points: ["Knowledge of company domain", "Alignment with tech stack", "Genuine interest in product impact"],
    model: "I have been following your team's innovations in scaling high-throughput systems. The role directly matches my hands-on experience in building performant services and offers the mentorship to grow into a strong engineer."
  },
  {
    question: "Can you describe a challenging project you worked on and how you handled unexpected setbacks?",
    points: ["STAR method (Situation, Task, Action, Result)", "Technical hurdle solved", "Key learnings"],
    model: "In my capstone project, our database queries lagged under concurrent requests. I profiled slow queries, implemented Redis caching, and indexed frequently queried foreign keys, reducing response latency by 65%."
  },
  {
    question: "Where do you see yourself in the next 2 to 3 years within our engineering organization?",
    points: ["Technical depth", "Ownership of modules", "Mentorship & leadership growth"],
    model: "In 2 to 3 years, I envision myself owning key core backend services, mentoring junior interns, and contributing to architectural decisions that ensure high system reliability."
  },
  {
    question: "How do you handle disagreements with teammates on architectural decisions or code reviews?",
    points: ["Objective discussion based on data", "Avoiding ego", "Willingness to compromise for best outcome"],
    model: "I believe code reviews are about code quality, not ego. I benchmark both approaches or reference official documentation. If there is a trade-off between readability and micro-optimizations, I prioritize maintainability unless latency is a blocker."
  },
  {
    question: "What is your proudest non-academic accomplishment or extracurricular leadership role?",
    points: ["Leadership or teamwork", "Initiative taken", "Impact created"],
    model: "I led the technical club in our college, organizing a 24-hour hackathon with over 400 participants. Managing sponsors, mentorship, and logistics taught me crisis management and deadline discipline."
  },
  {
    question: "If you are assigned a legacy codebase with very little documentation, how would you approach it?",
    points: ["Reading unit tests", "Tracing entry points", "Documenting as you learn", "Asking targeted questions"],
    model: "I start by running existing unit tests to understand expected behaviors, tracing API entry points, and writing notes. When I get stuck, I batch my questions for senior developers with context rather than interrupting repeatedly."
  },
  {
    question: "What are your salary expectations, and are you open to relocation or hybrid work?",
    points: ["Professional tone", "Market alignment", "Flexibility"],
    model: "My primary priority is joining a high-growth engineering team where I can create real impact. I am open to standard industry compensation packages for this role and fully open to relocation or hybrid schedules."
  },
  {
    question: "How do you stay updated with emerging technologies and engineering practices?",
    points: ["Tech blogs/podcasts", "Open source repositories", "Building pet projects"],
    model: "I regularly follow tech engineering blogs like Uber and Netflix engineering, read Hacker News, and build small proof-of-concept repositories to test new libraries."
  },
  {
    question: "Do you have any questions for us about the team, tech stack, or engineering culture?",
    points: ["Inquisitive mind", "Asking about engineering challenges", "Demonstrating interest"],
    model: "Yes! What does a typical sprint cycle look like for an engineer in this team, and what is the biggest technical challenge the team is solving this quarter?"
  },
  {
    question: "Describe a situation where you had to learn an entirely new technology stack in a very short timeline.",
    points: ["Adaptability", "Learning strategy", "Successful implementation"],
    model: "During an internship, the team needed a microservice built with Go, which I had never used. I spent the weekend reading documentation, built a small CRUD service, and delivered the assigned endpoint ahead of the sprint review."
  },
  {
    question: "What are your greatest technical strengths and one area where you are actively improving?",
    points: ["Self-awareness", "Specific strength with evidence", "Proactive steps taken for improvement"],
    model: "My strength is clean, structured code and debugging under pressure. An area I am actively improving is distributed system observability, which I am practicing through Dockerized Prometheus and Grafana dashboards."
  }
]

const COMMUNICATION_ROUNDS = {
  round1: [
    {
      question: "Round 1 - Pronunciation & Articulation: Read this sentence clearly with steady pacing: \"The architectural synchronization of asynchronous microservices requires meticulous resilience and cryptographic precision.\"",
      points: ["Clear pronunciation of multisyllabic words", "Even breathing pace", "Crisp consonant articulation"],
      model: "Proper cadence, pausing slightly after microservices, pronouncing synchronization and asynchronous cleanly without mumbling."
    },
    {
      question: "Round 1 - Elevator Pitch: Give a concise 45-second professional self-introduction highlighting your core value proposition as a software engineer.",
      points: ["Structured opening", "Core technical strengths", "Clear confident cadence"],
      model: "Hello, I am a software engineer specializing in scalable web systems. With proficiency in full-stack JavaScript and strong fundamentals in data structures, I love converting complex problems into elegant, reliable applications."
    },
    {
      question: "Round 1 - Phonetic Clarity: Articulate this sentence with clear distinction between sounds: \"Particularly vulnerable distributed networks must thoroughly authenticate every authoritative query.\"",
      points: ["Distinct v vs w sounds", "Clean th enunciations", "Smooth vocal flow"],
      model: "Steady vocal projection, distinct emphasis on authoritative and vulnerable without rushing."
    }
  ],
  round2: [
    {
      question: "Round 2 - Jumbled Story: Unravel and narrate the following 4 events in logical sequential order: (A) The system successfully handled 100k requests during the flash sale. (B) The load testing revealed database connection timeouts. (C) The team noticed severe traffic spikes on Black Friday. (D) The engineering team provisioned read replicas and connection pooling.",
      points: ["Correct chronological sequence: B -> D -> C -> A", "Logical transition words like Initially, Consequently, Finally"],
      model: "The logical sequence is: Initially, when load testing was conducted, connection timeouts were identified (B). Consequently, the engineering team provisioned read replicas and connection pooling (D). Then, during Black Friday, severe traffic spikes arrived (C). Finally, the optimized system handled 100k requests smoothly (A)."
    },
    {
      question: "Round 2 - Narrative Reconstruction: Reorganize this incident into a coherent story: (A) Users received error 500 when checking out. (B) A faulty migration script was rolled back within 10 minutes. (C) An engineer pushed an untested database migration to production. (D) Post-mortem actions included mandatory staging tests.",
      points: ["Correct order: C -> A -> B -> D", "Clear storytelling with root cause, impact, resolution, and learning"],
      model: "First, an untested migration was pushed (C). This caused users to receive error 500 at checkout (A). Next, the team immediately rolled back the script in 10 minutes (B). Finally, the team mandated staging tests in the post-mortem (D)."
    },
    {
      question: "Round 2 - Storytelling Flow: Connect these 3 concepts into a concise 30-second coherent narrative: \"A forgotten semicolon\", \"A failed midnight deployment\", and \"An automated linter added to CI/CD\".",
      points: ["Logical bridge between problem, incident, and preventative fix", "Engaging and professional storytelling"],
      model: "Late one night, a forgotten semicolon triggered a failed midnight deployment right before release. Rather than blaming the developer, the team instituted an automated linter in the CI/CD pipeline, guaranteeing syntax errors are caught before code ever reaches production."
    }
  ],
  round3: [
    {
      question: "Round 3 - Grammar Test: Identify the parts of speech for the words \"swiftly\" and \"resilience\" in this sentence: \"The team swiftly restored system resilience after the outage.\" Then convert the sentence into Passive Voice.",
      points: ["swiftly = Adverb", "resilience = Abstract Noun", "Passive voice: System resilience was swiftly restored by the team after the outage."],
      model: "Swiftly is an adverb modifying restored, and resilience is a noun functioning as direct object. In passive voice: System resilience was swiftly restored by the team after the outage."
    },
    {
      question: "Round 3 - Direct to Indirect Speech: Convert this quote into correct indirect speech: The engineering manager said, \"We will deploy the update tomorrow if the regression tests pass today.\"",
      points: ["Tense shift (will -> would, pass -> passed)", "Time indicator changes (tomorrow -> the next day, today -> that day)"],
      model: "The engineering manager said that they would deploy the update the next day if the regression tests passed that day."
    },
    {
      question: "Round 3 - Active vs Passive & Subject-Verb Agreement: Correct the error in this sentence and explain why: \"Neither the lead architect nor the backend developers was able to reproduce the bug.\"",
      points: ["Error identification: was should be were", "Subject-verb agreement rule: with neither/nor, verb agrees with closer subject (developers)"],
      model: "The correction is: Neither the lead architect nor the backend developers were able to reproduce the bug. Under the rule of proximity with neither/nor, the verb must agree with the subject closest to it."
    }
  ]
}

const BEHAVIORAL_QUESTIONS_BANK = [
  {
    question: "Imagine you are working on a critical release with a strict deadline tonight, and you discover a subtle edge-case bug. What exact steps would you take?",
    points: ["Risk assessment", "Communicating proactively to lead", "Proposing mitigation options"],
    model: "I would immediately assess the severity and blast radius. If it risks data corruption, I notify the lead with two options: deploy a feature flag disabling the specific feature, or postpone the release with a hotfix."
  },
  {
    question: "How do you react when a client or product manager changes the feature requirements right in the middle of a sprint?",
    points: ["Empathy towards business needs", "Evaluating trade-offs and impact on sprint timeline", "Collaborative negotiation"],
    model: "I acknowledge the business rationale behind the shift. Then, I calculate the engineering trade-offs: what current sprint tickets need to be deprioritized to accommodate the new scope, and communicate this transparently."
  },
  {
    question: "Suppose you notice a senior colleague constantly rejecting your pull requests with vague feedback like \"re-write this\". How do you resolve this professionally?",
    points: ["One-on-one conversation", "Asking for specific coding standards or guidelines", "Seeking constructive alignment without hostility"],
    model: "I would set up a quick 10-minute sync to ask: I noticed your comments and want to ensure my code aligns with team standards. Could you walk me through the specific principles you would like me to follow?"
  },
  {
    question: "What is your philosophy on work-life balance, overtime during crunch periods, and taking planned leaves?",
    points: ["Professional commitment during genuine crunch", "Value of sustainable pace", "Clear advance communication on leaves"],
    model: "During genuine release crunches or production incidents, I am fully committed to putting in extra hours. At the same time, I believe sustainable pace prevents burnout, and I always communicate planned leaves well in advance."
  },
  {
    question: "Tell me about a time you received harsh or critical feedback on your work. How did you process and apply it?",
    points: ["Separating feedback from personal ego", "Extracting actionable learnings", "Demonstrating measurable improvement"],
    model: "During my first internship, my manager pointed out that my commit messages were messy and my PRs were too large. I adopted Conventional Commits and split all future work into atomic pull requests."
  },
  {
    question: "How would you handle a situation where you are blocked by another team that is slow to respond to your API requests?",
    points: ["Mocking APIs to maintain forward progress", "Following up through established channels", "Escalating constructively only if necessary"],
    model: "Instead of sitting idle, I create mock API contracts so our frontend or service development continues unimpeded, while following up on their Slack channel with context."
  }
]

function getTechQuestionsForSkill(skill: string, level: number) {
  const s = skill.toLowerCase()

  if (s.includes('java') && !s.includes('script')) {
    return [
      {
        question: "Explain the internal working of Java HashMap. What happens when two distinct keys generate the exact same hash code?",
        points: ["Hashing with hashCode() & equals()", "Bucket indexing", "Collision handling via LinkedList and TreeNode conversion in Java 8+"],
        model: "HashMap calculates the hash code and maps to bucket index. On collision, entries are stored in a linked list. If collisions exceed TREEIFY_THRESHOLD (8 entries), it converts to a Red-Black Tree for O(log n) lookup."
      },
      {
        question: "What is the key difference between String, StringBuilder, and StringBuffer in Java memory management?",
        points: ["String immutability in String Constant Pool", "StringBuilder mutability (non-thread-safe)", "StringBuffer synchronized thread-safety"],
        model: "String is immutable in the string pool. StringBuilder is mutable and faster for single-threaded loops, while StringBuffer is synchronized and thread-safe."
      },
      {
        question: "How does Garbage Collection work in Java (Generational hypothesis: Young vs Old Generation)?",
        points: ["Eden, Survivor (S0/S1), Tenured", "Minor GC vs Major GC", "Mark and Sweep algorithm"],
        model: "Objects are allocated in Eden. Surviving objects migrate between S0 and S1 before promotion to Old Generation. Minor GC cleans young space fast, while Full GC inspects tenured space."
      }
    ]
  }

  if (s.includes('python')) {
    return [
      {
        question: "What is the Global Interpreter Lock (GIL) in CPython, and how does it impact multi-threaded CPU-bound programs?",
        points: ["Mutex preventing multiple threads from executing Python bytecodes simultaneously", "Impact on CPU-bound vs I/O bound", "Alternative: multiprocessing module"],
        model: "GIL is a mutex protecting Python object memory. It allows only one native thread to execute Python bytecode at a time. Hence, multi-threading does not speed up CPU-bound tasks; we use multiprocessing instead."
      },
      {
        question: "Explain the difference between Python generators using \"yield\" versus normal functions returning a list.",
        points: ["Memory efficiency (lazy evaluation)", "Iterators vs holding full array in RAM", "next() execution suspension"],
        model: "A generator produces items lazily on-demand using yield, keeping memory complexity at O(1), whereas returning a full list creates the entire array in memory upfront."
      }
    ]
  }

  if (s.includes('react') || s.includes('next')) {
    return [
      {
        question: "What triggers a re-render in a React component, and how does React Virtual DOM reconciliation diffing algorithm optimize updates?",
        points: ["State or prop changes", "Parent re-rendering", "Reconciliation using keys and tree diffing (O(n))"],
        model: "Re-renders are triggered by state changes (useState), prop updates, or context changes. React uses fiber reconciliation with element keys to compute minimal DOM mutations in O(n) time."
      },
      {
        question: "Explain the rules of React useEffect and why you must properly specify the dependency array.",
        points: ["Lifecycle synchronization", "Infinite render loops prevention", "Cleanup function for subscriptions/intervals"],
        model: "useEffect synchronizes side effects with state. Omitting dependencies creates stale closures, while passing unstable references causes infinite re-render loops."
      }
    ]
  }

  if (s.includes('sql') || s.includes('dbms') || s.includes('mongo')) {
    return [
      {
        question: "Explain ACID properties in database transactions and provide a concrete banking example.",
        points: ["Atomicity (All-or-Nothing)", "Consistency (Valid invariants)", "Isolation (Concurrent safety)", "Durability (Committed to disk)"],
        model: "In a fund transfer: Atomicity ensures debit and credit happen together or roll back. Consistency maintains account balances >= 0. Isolation prevents concurrent reads of intermediate balances. Durability guarantees committed money stays saved after crash."
      },
      {
        question: "What is the difference between Clustered and Non-Clustered Indexes in a relational database?",
        points: ["Physical row ordering (1 clustered per table)", "Non-clustered pointers to row address", "Performance impact on range queries vs point lookups"],
        model: "A clustered index physically sorts table data on disk (usually Primary Key). A non-clustered index creates a separate B-tree structure pointing to row pointers."
      }
    ]
  }

  return [
    {
      question: `In ${skill}, how would you analyze the time and space complexity trade-offs for searching and sorting operations?`,
      points: ["Big-O notation", "Array/List vs Hash-based lookups (O(n) vs O(1))", "Memory overhead"],
      model: "We evaluate worst-case Big-O notation. Hash tables offer O(1) average lookup at the expense of O(n) memory, while balanced trees provide guaranteed O(log n) without hash collisions."
    },
    {
      question: `Can you explain a practical use case where you chose a specific design pattern or architectural approach in ${skill}?`,
      points: ["Concrete problem solved", "Why alternative was rejected", "Measurable engineering outcome"],
      model: "I implemented a singleton connection pool and factory pattern to decouple business logic from provider drivers, ensuring clean modularity and zero resource leakage."
    }
  ]
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest
    const { track = 'hr', jobDescription = '', resumeText = '', level = 2, questionCount = 10 } = body

    const detectedSkills = extractSkills(`${jobDescription} ${resumeText}`)
    const effectiveSkills = detectedSkills.length > 0 ? detectedSkills : ['Data Structures', 'JavaScript', 'SQL', 'Algorithms', 'React', 'Problem Solving']
    const timeLimit = getTimeLimitForLevel(level)

    const questions: InterviewQuestion[] = []

    if (track === 'hr') {
      const bank = [...HR_QUESTIONS_BANK]
      for (let i = 0; i < questionCount; i++) {
        const template = bank[i % bank.length]
        let qText = template.question
        if (level >= 4 && i % 2 === 1) {
          qText = `[Rapid-Fire] ${qText} Be specific and concise.`
        }
        questions.push({
          id: `hr-${i + 1}`,
          track: 'hr',
          level,
          question: qText,
          expectedKeyPoints: template.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: template.model,
        })
      }
    } else if (track === 'technical') {
      let skillIndex = 0
      for (let i = 0; i < questionCount; i++) {
        const skill = effectiveSkills[skillIndex % effectiveSkills.length]
        skillIndex++

        const techQuestionsForSkill = getTechQuestionsForSkill(skill, level)
        const chosen = techQuestionsForSkill[i % techQuestionsForSkill.length]

        questions.push({
          id: `tech-${i + 1}`,
          track: 'technical',
          skill,
          level,
          question: chosen.question,
          context: `Target Skill: ${skill}`,
          expectedKeyPoints: chosen.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: chosen.model,
        })
      }
    } else if (track === 'communication') {
      const r1Count = Math.max(2, Math.floor(questionCount / 3))
      const r2Count = Math.max(2, Math.floor(questionCount / 3))
      const r3Count = questionCount - r1Count - r2Count

      for (let i = 0; i < r1Count; i++) {
        const t = COMMUNICATION_ROUNDS.round1[i % COMMUNICATION_ROUNDS.round1.length]
        questions.push({
          id: `comm-r1-${i + 1}`,
          track: 'communication',
          roundName: 'Round 1: Pronunciation & Articulation',
          level,
          question: t.question,
          expectedKeyPoints: t.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: t.model,
        })
      }
      for (let i = 0; i < r2Count; i++) {
        const t = COMMUNICATION_ROUNDS.round2[i % COMMUNICATION_ROUNDS.round2.length]
        questions.push({
          id: `comm-r2-${i + 1}`,
          track: 'communication',
          roundName: 'Round 2: Jumbled Story & Logic Flow',
          level,
          question: t.question,
          expectedKeyPoints: t.points,
          timeLimitSeconds: timeLimit + 15,
          modelAnswer: t.model,
        })
      }
      for (let i = 0; i < r3Count; i++) {
        const t = COMMUNICATION_ROUNDS.round3[i % COMMUNICATION_ROUNDS.round3.length]
        questions.push({
          id: `comm-r3-${i + 1}`,
          track: 'communication',
          roundName: 'Round 3: Grammar & Sentence Structure',
          level,
          question: t.question,
          expectedKeyPoints: t.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: t.model,
        })
      }
    } else if (track === 'behavioral') {
      const bank = [...BEHAVIORAL_QUESTIONS_BANK]
      for (let i = 0; i < questionCount; i++) {
        const template = bank[i % bank.length]
        questions.push({
          id: `beh-${i + 1}`,
          track: 'behavioral',
          level,
          question: template.question,
          expectedKeyPoints: template.points,
          timeLimitSeconds: timeLimit,
          modelAnswer: template.model,
        })
      }
    }

    return NextResponse.json({
      success: true,
      track,
      level,
      totalQuestions: questions.length,
      detectedSkills,
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
