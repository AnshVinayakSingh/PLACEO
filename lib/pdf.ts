let workerConfigured = false

/** Extracts all text content from a PDF File, page by page, in the browser. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  if (!workerConfigured) {
    // Bundle the worker from the installed package itself instead of pulling it from a
    // CDN. This guarantees the worker version always matches the installed pdfjs-dist
    // version (a mismatch here makes PDF parsing silently fail/hang), and it also removes
    // the dependency on an external CDN being reachable from the user's device.
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    workerConfigured = true
  }

  const arrayBuffer = await file.arrayBuffer()
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  } catch (err) {
    console.error('pdfjs getDocument failed:', err)
    throw new Error(
      'Could not open this PDF. It may be corrupted, password-protected, or in an unsupported format. Try re-exporting it or upload a .txt file instead.',
    )
  }

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
