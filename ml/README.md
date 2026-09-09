# PLACEO Proctor ML

The upgraded browser simulator uses local computer vision so the webcam does not need to be uploaded continuously:

- **MediaPipe Face Landmarker**: face presence, head pose and iris-aware gaze signals.
- **COCO-SSD**: common object classes including person, cell phone, laptop and book.
- **Two-strike engine**: a single noisy frame does not disqualify a candidate. A signal must persist across several inspections before a warning/strike.
- **Optional YOLO11 fine-tuning**: `train_proctor.py` can train a custom detector on a consented, labelled webcam dataset when you want stronger detection for your own environment.

A visual flag is an integrity signal, not proof of intent. Validate false positives/false negatives before using the system for any real high-stakes assessment.
