# PLACEO Interview Simulator — Live AI Upgrade

## What changed

- Gemini Live API is now the primary interviewer engine.
- Microphone audio is streamed as 16-bit PCM to Gemini Live over a short-lived ephemeral token.
- Candidate speech receives live transcription; interviewer audio is native Gemini audio.
- The interviewer dynamically adapts questions from the candidate's answer, resume, JD, track and difficulty. There is no fixed question bank in the live path.
- Candidate clarification/cross-questions are treated as normal conversation.
- Female/male interviewer personas use the existing photorealistic avatar assets and different Gemini voices.
- The proctor combines MediaPipe face/iris landmarks with browser-local COCO object detection.
- Repeated downward gaze, repeated gaze-away, missing face, multiple people, phones/laptops/books/tablets/remotes trigger the two-strike engine.
- Strike 1 warns; Strike 2 disconnects the call.
- An optional YOLO11 Python fine-tuning pipeline is included under `ml/` for custom labelled webcam data.

## Existing Gemini key

The simulator reuses the project's existing server-side `GEMINI_API_KEY`. No second Gemini key is required.

## Important

The Live API is currently a preview capability and requires a key/account with access. If the Live token cannot be created, the UI reports the failure rather than silently pretending the live interviewer is active.

The browser proctor emits integrity signals. It should not be represented as infallible proof of cheating; camera angle, lighting and accessibility conditions can produce false positives.
