const PDFJS_VERSION = '5.6.205'

let workerConfigured = false

/** Extracts all text content from a PDF File, page by page, in the browser. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
    workerConfigured = true
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    pageTexts.push(pageText)
  }

  const text = pageTexts.join('\n').replace(/\s+/g, ' ').trim()
  if (!text) {
    throw new Error(
      'Could not find any selectable text in this PDF. If it\u2019s a scanned image, try exporting it as a text-based PDF, or paste your resume as a .txt file instead.',
    )
  }
  return text
}

/** Reads a plain .txt file as-is. */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => resolve(String(reader.result || '').trim())
    reader.readAsText(file)
  })
}
