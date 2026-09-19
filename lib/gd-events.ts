// Real-time delivery for GD invites and room/lobby updates, using Server-Sent
// Events (native browser + Next.js Route Handler support — zero new
// dependencies). A per-user list of open SSE "controllers" is kept in memory;
// publishing an event writes it directly into every open stream that user has.
//
// Note (same trade-off already accepted by lib/rate-limit.ts in this codebase):
// this only works within a single running Node process. If this app is ever
// scaled to multiple server instances, this needs to move to a shared broker
// (Redis pub/sub, etc). For a single Render web service instance, this is correct.

type Subscriber = {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
}

const subscribersByUserId = new Map<string, Set<Subscriber>>()

export function subscribe(userId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder()
  const sub: Subscriber = { controller, encoder }
  if (!subscribersByUserId.has(userId)) subscribersByUserId.set(userId, new Set())
  subscribersByUserId.get(userId)!.add(sub)
  return () => {
    subscribersByUserId.get(userId)?.delete(sub)
    if (subscribersByUserId.get(userId)?.size === 0) subscribersByUserId.delete(userId)
  }
}

export function publishToUser(userId: string, eventName: string, data: unknown) {
  const subs = subscribersByUserId.get(userId)
  if (!subs || subs.size === 0) return false
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
  for (const sub of subs) {
    try {
      sub.controller.enqueue(sub.encoder.encode(payload))
    } catch {
      // Dead connection — will be cleaned up by its own SSE close handler.
    }
  }
  return true
}

export function publishToUsers(userIds: string[], eventName: string, data: unknown) {
  for (const id of userIds) publishToUser(id, eventName, data)
}

export function isUserOnline(userId: string) {
  return (subscribersByUserId.get(userId)?.size ?? 0) > 0
}
