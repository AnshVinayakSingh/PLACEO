# PLACEO Real-Time Interview Architecture

The interview simulator uses Gemini Live as the conversational engine instead of a pre-generated question list.

## Runtime flow

1. `/api/interview-simulator/session` creates the signed interview session.
2. The pre-call lobby obtains camera + microphone permissions.
3. `/api/interview-simulator/live-token` creates a constrained ephemeral Live token using the existing `GEMINI_API_KEY`.
4. The browser opens a Live API WebSocket using the short-lived token.
5. Microphone PCM is streamed continuously at 16 kHz.
6. Low-rate JPEG camera frames are streamed as multimodal context.
7. Gemini Live performs VAD, native audio generation, transcription, interruption handling, affective dialogue and proactive response behavior.
8. Session-resumption handles are retained and used to reconnect after server-side connection resets.
9. MediaPipe + object detection independently monitor interview integrity. Gemini is not the source of truth for cheating decisions.
10. The transcript is assembled from live input/output transcription and passed to the existing strict evaluation endpoint.

## Important design choice

There is no fixed interview question list in the live call path. The model decides the next conversational move from the current transcript, resume, job description, track, difficulty and candidate behavior.
