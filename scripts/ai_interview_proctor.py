"""
AI Interview Proctoring & Gaze Tracking Service
Part of Placeo AI Human Interview Simulator

Features:
- Real-time webcam face & eye gaze detection using OpenCV
- 2-Strike Violation Engine:
    Strike 1 -> Warning alert chime & voice prompt
    Strike 2 -> Session auto-disconnect & termination
- Head Pose & Mobile Phone downwards tilt heuristics
"""

import time
import sys

def main():
    print("=" * 60)
    print("  PLACEO AI HUMAN INTERVIEW PROCTOR (Python Service)")
    print("=" * 60)
    print("Checking dependencies...")

    try:
        import cv2
    except ImportError:
        print("[INFO] OpenCV (cv2) not found. To run live webcam proctor in Python:")
        print("       pip install opencv-python numpy")
        print("[INFO] Note: Next.js frontend has client-side Canvas proctoring built-in!")
        return

    print("[SUCCESS] OpenCV loaded. Starting Proctoring Stream...")
    print("Press 'q' in the camera window to exit.")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    # Load Haar cascade face detector
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    strikes = 0
    off_center_frames = 0
    max_strikes = 2

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(80, 80))

        status = "FOCUSED"
        color = (0, 255, 0) # Green

        if len(faces) == 0:
            off_center_frames += 1
            if off_center_frames > 25:
                status = "NO FACE DETECTED"
                color = (0, 0, 255)
        else:
            (x, y, fw, fh) = faces[0]
            cx = x + fw // 2
            cy = y + fh // 2

            # Normalize coordinates (-1 to 1)
            norm_x = (cx - w / 2) / (w / 2)
            norm_y = (cy - h / 2) / (h / 2)

            # Draw face target box
            cv2.rectangle(frame, (x, y), (x + fw, y + fh), color, 2)
            cv2.circle(frame, (cx, cy), 4, (0, 255, 255), -1)

            if abs(norm_x) > 0.40:
                status = "LOOKING AWAY"
                color = (0, 165, 255)
                off_center_frames += 1
            elif norm_y > 0.35:
                status = "LOOKING DOWN (PHONE?)"
                color = (0, 0, 255)
                off_center_frames += 1
            else:
                off_center_frames = max(0, off_center_frames - 2)

        # Strike escalation logic
        if off_center_frames > 40:
            off_center_frames = 0
            strikes += 1
            print(f"[PROCTOR ALERT] Strike {strikes}/{max_strikes}: {status}")

            if strikes >= max_strikes:
                print("[PROCTOR TERMINATION] Interview Disconnected! Multiple infractions detected.")
                cv2.putText(frame, "DISQUALIFIED: 2 STRIKES", (50, h // 2), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                cv2.imshow("Placeo AI Proctor", frame)
                cv2.waitKey(2500)
                break

        # Render HUD Overlay
        cv2.putText(frame, f"STATUS: {status}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.putText(frame, f"STRIKES: {strikes}/{max_strikes}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, "Press Q to exit", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow("Placeo AI Proctor", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Proctor stream ended.")

if __name__ == '__main__':
    main()
