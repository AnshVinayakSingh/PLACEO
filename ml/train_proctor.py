"""Optional local fine-tuning pipeline for PLACEO's visual proctor.

A real custom detector needs labelled images captured under the target webcam,
lighting and background conditions. This script intentionally does not claim a
custom model has already been trained.

Example:
    python train_proctor.py --data data.yaml --epochs 40 --model yolo11n.pt
"""
from __future__ import annotations
import argparse
from pathlib import Path
from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True)
    parser.add_argument('--epochs', type=int, default=40)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--batch', type=int, default=8)
    parser.add_argument('--model', default='yolo11n.pt')
    parser.add_argument('--name', default='placeo-proctor')
    args = parser.parse_args()

    data = Path(args.data).resolve()
    if not data.exists():
        raise SystemExit(f'Dataset config not found: {data}')

    model = YOLO(args.model)
    model.train(
        data=str(data), epochs=args.epochs, imgsz=args.imgsz, batch=args.batch,
        project='runs/proctor', name=args.name, patience=10, cos_lr=True,
        cache=False, pretrained=True,
    )
    print('Training complete. Inspect validation metrics before deployment.')


if __name__ == '__main__':
    main()
