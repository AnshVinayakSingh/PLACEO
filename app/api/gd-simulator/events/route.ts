import { getSession } from '@/lib/auth'
import { subscribe } from '@/lib/gd-events'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Not logged in.', { status: 401 })

  const userId = session.userId
  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      unsubscribe = subscribe(userId, controller)
      // Initial comment line opens the stream immediately so EventSource fires
      // its onopen without waiting for the first real event.
      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
      // Periodic ping keeps intermediary proxies (and some browsers) from
      // treating this as an idle/dead connection and closing it.
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          if (keepAlive) clearInterval(keepAlive)
        }
      }, 25000)
    },
    cancel() {
      if (unsubscribe) unsubscribe()
      if (keepAlive) clearInterval(keepAlive)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
