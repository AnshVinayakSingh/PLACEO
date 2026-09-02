import { connectDB } from '@/lib/db'
import { CompanyQuestions, type ICachedQuestion, type QuestionDifficulty } from '@/models/CompanyQuestions'
import { QuestionIndex } from '@/models/QuestionIndex'
import { PRESET_COMPANIES } from '@/lib/coding-hub-companies'

const GITHUB_OWNER = 'liquidslr'
const GITHUB_REPO = 'leetcode-company-wise-problems'
const GITHUB_BRANCH = 'main'
// "5. All.csv" is the all-time question list inside each company's folder.
const ALL_TIME_FILE = '5. All.csv'

// Re-fetch a company from GitHub at most this often; otherwise serve from Mongo cache.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type CodingHubQuestion = {
  title: string
  slug: string
  difficulty: QuestionDifficulty
  link: string
  platform: string
  tags: string[]
  topic: string
  frequency: number
  alsoAskedAt: string[]
}

// A rough priority order so, say, "Dynamic Programming" wins over "Array" when
// a question has both tags — the more specific/interesting topic bucket shows up.
const TOPIC_PRIORITY = [
  'Dynamic Programming',
  'Backtracking',
  'Graph',
  'Tree',
  'Binary Search Tree',
  'Trie',
  'Union Find',
  'Heap (Priority Queue)',
  'Binary Search',
  'Greedy',
  'Sliding Window',
  'Two Pointers',
  'Linked List',
  'Stack',
  'Queue',
  'Bit Manipulation',
  'Math',
  'Sorting',
  'Hash Table',
  'String',
  'Matrix',
  'Array',
]

function primaryTopic(tags: string[]): string {
  if (tags.length === 0) return 'Other'
  for (const preferred of TOPIC_PRIORITY) {
    if (tags.includes(preferred)) return preferred
  }
  return tags[0]
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function rawCsvUrl(folder: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodeURIComponent(
    folder,
  )}/${encodeURIComponent(ALL_TIME_FILE)}`
}

/** Small quote-aware CSV line splitter (handles the quoted "Tag, Tag" column). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields.map((f) => f.trim())
}

function parseCsv(csvText: string): ICachedQuestion[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const questions: ICachedQuestion[] = []
  const seenSlugs = new Set<string>()

  for (const line of lines) {
    const cols = parseCsvLine(line)
    if (cols.length < 5) continue
    const [difficultyRaw, title, , frequencyRaw, link, tagsRaw] = cols
    const difficulty = difficultyRaw.toUpperCase()
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) continue // skip stray header rows
    if (!title || !link) continue

    const slug = slugify(title)
    if (seenSlugs.has(slug)) continue // de-dupe within the same file
    seenSlugs.add(slug)

    questions.push({
      title,
      slug,
      difficulty: difficulty as QuestionDifficulty,
      link,
      platform: 'LeetCode',
      tags: (tagsRaw || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      frequency: Number.parseFloat(frequencyRaw) || 0,
    })
  }

  // Highest-frequency (most commonly asked) first.
  questions.sort((a, b) => b.frequency - a.frequency)
  return questions
}

/** Try the given folder name, then a few common casing variants. */
async function fetchCsvTryingVariants(companyName: string, folderHint?: string): Promise<{ text: string; folder: string } | null> {
  const candidates = Array.from(
    new Set(
      [
        folderHint,
        companyName,
        companyName.trim(),
        companyName
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
          .join(' '),
        companyName.trim().toLowerCase(),
        companyName.trim().toUpperCase(),
      ].filter(Boolean) as string[],
    ),
  )

  for (const candidate of candidates) {
    try {
      const res = await fetch(rawCsvUrl(candidate), { next: { revalidate: false } })
      if (res.ok) {
        const text = await res.text()
        if (text && text.trim().length > 0) {
          return { text, folder: candidate }
        }
      }
    } catch {
      // network hiccup on this candidate — try the next one
    }
  }
  return null
}

/**
 * Fetches (or serves from cache) a company's full DSA question list, and
 * enriches each question with which OTHER companies it's also been cached
 * under (from the shared reverse index), so "also asked at" grows over time
 * as more companies get looked up across all users.
 */
export async function getCompanyQuestions(
  companyNameRaw: string,
): Promise<{ company: string; questions: CodingHubQuestion[]; found: boolean }> {
  const companyName = companyNameRaw.trim()
  const companySlug = companyName.toLowerCase()
  await connectDB()

  const preset = PRESET_COMPANIES.find((c) => c.name.toLowerCase() === companySlug)

  let cached = await CompanyQuestions.findOne({ companySlug })
  const isStale = !cached || Date.now() - new Date(cached.fetchedAt).getTime() > CACHE_TTL_MS

  if (isStale) {
    const result = await fetchCsvTryingVariants(companyName, preset?.folderHint)
    if (result) {
      const questions = parseCsv(result.text)
      cached = await CompanyQuestions.findOneAndUpdate(
        { companySlug },
        {
          company: preset?.name || companyName,
          companySlug,
          sourceFolder: result.folder,
          questions,
          fetchedAt: new Date(),
          notFound: false,
        },
        { upsert: true, new: true },
      )

      // Grow the shared cross-company index in the background-ish (awaited, but cheap: bulk upsert).
      if (questions.length > 0) {
        const displayName = preset?.name || companyName
        const ops = questions.map((q) => ({
          updateOne: {
            filter: { slug: q.slug },
            update: {
              $setOnInsert: { title: q.title, link: q.link, difficulty: q.difficulty },
              $addToSet: { companies: displayName },
            },
            upsert: true,
          },
        }))
        await QuestionIndex.bulkWrite(ops, { ordered: false }).catch(() => {})
      }
    } else if (!cached) {
      // Nothing upstream and nothing cached — remember the miss so we don't hammer GitHub repeatedly.
      cached = await CompanyQuestions.findOneAndUpdate(
        { companySlug },
        { company: preset?.name || companyName, companySlug, questions: [], fetchedAt: new Date(), notFound: true },
        { upsert: true, new: true },
      )
    }
  }

  if (!cached || cached.notFound || cached.questions.length === 0) {
    return { company: preset?.name || companyName, questions: [], found: false }
  }

  // Look up "also asked at" for each question from the shared index.
  const slugs = cached.questions.map((q) => q.slug)
  const indexDocs = await QuestionIndex.find({ slug: { $in: slugs } }).lean()
  const alsoAskedMap = new Map<string, string[]>()
  for (const doc of indexDocs) {
    alsoAskedMap.set(
      doc.slug,
      (doc.companies || []).filter((c: string) => c.toLowerCase() !== cached!.companySlug),
    )
  }

  const questions: CodingHubQuestion[] = cached.questions.map((q) => ({
    title: q.title,
    slug: q.slug,
    difficulty: q.difficulty,
    link: q.link,
    platform: q.platform,
    tags: q.tags,
    topic: primaryTopic(q.tags),
    frequency: q.frequency,
    alsoAskedAt: alsoAskedMap.get(q.slug) || [],
  }))

  return { company: cached.company, questions, found: true }
}

/** Fallback search link (GFG) for companies we genuinely have no data for — never fabricated questions. */
export function fallbackSearchLink(companyName: string): string {
  return `https://www.geeksforgeeks.org/?s=${encodeURIComponent(companyName + ' interview experience')}`
}
