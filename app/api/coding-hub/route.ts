import { NextResponse } from 'next/server'
import { getCompanyQuestions, fallbackSearchLink } from '@/lib/coding-hub'
import { PRESET_COMPANIES } from '@/lib/coding-hub-companies'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get('company')?.trim()

  if (!company) {
    // No company given — just return the preset boxes for the grid.
    return NextResponse.json({
      companies: PRESET_COMPANIES.map((c) => ({ name: c.name, color: c.color })),
    })
  }

  if (company.length < 2) {
    return NextResponse.json({ error: 'Company name is too short.' }, { status: 400 })
  }

  try {
    const { company: resolvedName, questions, found } = await getCompanyQuestions(company)

    if (!found) {
      return NextResponse.json({
        company: resolvedName,
        found: false,
        questions: [],
        fallbackLink: fallbackSearchLink(company),
        message: `Abhi "${company}" ke liye curated DSA questions nahi mile. Naya try karo ya neeche diye link se GeeksforGeeks pe interview experiences dekh lo.`,
      })
    }

    return NextResponse.json({ company: resolvedName, found: true, questions, total: questions.length })
  } catch (err) {
    console.error('coding-hub API error:', err)
    return NextResponse.json(
      { error: 'Something went wrong while fetching questions. Please try again in a moment.' },
      { status: 500 },
    )
  }
}
