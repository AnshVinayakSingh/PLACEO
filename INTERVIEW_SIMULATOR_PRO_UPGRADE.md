# PLACEO — Professional Interview Simulator Upgrade

This upgrade turns the interview simulator into a security-aware adaptive live interview system while preserving the existing PLACEO application.

## Architecture

1. **Authenticated interview session**
   - A short-lived signed session is created before the interview starts.
   - The session is stored in an HttpOnly, SameSite=Strict cookie.
   - The browser cannot choose a different track/persona/level after the session is issued.

2. **Adaptive Gemini interviewer**
   - The first question is generated from the candidate context.
   - Gemini Live handles the live spoken conversation.
   - The interviewer is instructed to answer candidate questions, clarify assumptions, challenge vague claims, probe trade-offs, and adapt difficulty.
   - There is no hard-coded live question sequence.

3. **Native real-time audio path**
   - The existing GEMINI_API_KEY remains server-side.
   - A constrained, short-lived Gemini Live token is minted by the server.
   - The browser connects to Gemini using the ephemeral token.

4. **Local proctoring ensemble**
   - MediaPipe Face Landmarker for face count, head pose and gaze signals.
   - COCO-SSD for common prohibited objects and extra-person detection.
   - Repeated evidence is required before a strike.
   - Strike 1 warns; strike 2 ends the interview.

5. **Browser integrity layer**
   - Fullscreen exit detection.
   - Tab visibility changes.
   - Camera/microphone track termination.
   - Copy/paste/context-menu audit events.
   - Window focus/blur telemetry.

6. **Server audit trail**
   - Integrity events are persisted to MongoDB per interview session.
   - Evaluation does not trust the browser's claimed violation count; it derives the count from the server audit trail.
   - No raw webcam/video recording is persisted by this feature.

7. **Security hardening**
   - Rate limiting on interview generation, Live token minting, turns, clarification and evaluation.
   - Security headers including Permissions-Policy, frame denial, MIME sniffing protection, referrer policy and production HSTS.
   - Server-side validation of the interview session.

## Environment

Keep the existing PLACEO environment variables. The simulator reuses `GEMINI_API_KEY`, `JWT_SECRET`, and `MONGODB_URI`.

For production, use HTTPS. Browser camera/microphone access is restricted to secure contexts.

## ML training path

`ml/train_proctor.py` remains an optional fine-tuning path for a custom YOLO proctor model. A genuinely trained custom model requires a labelled dataset; the repository therefore does not pretend that a custom model was trained without training data.

Recommended custom classes:

- person_extra
- phone
- tablet
- notes
- book
- second_screen
- prohibited_device

The browser-side ensemble is the immediate runtime path; custom training can be added later without replacing the interview engine.

## Important limitation

Client-side proctoring is an integrity signal, not a mathematically tamper-proof anti-cheat system. A production assessment platform that needs high-assurance proctoring normally moves capture/analysis to controlled infrastructure or a managed proctoring provider. This implementation intentionally avoids claiming otherwise.
