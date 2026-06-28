import cv2
import insightface
import numpy as np
import json
import os

app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=-1, det_size=(640, 640))

EMBEDDINGS_FILE = "enrollment/enrolled_faces.json"

def load_enrolled():
    if os.path.exists(EMBEDDINGS_FILE):
        with open(EMBEDDINGS_FILE, "r") as f:
            data = json.load(f)
            # Convert lists back to numpy arrays
            return {k: np.array(v) for k, v in data.items()}
    return {}

def save_enrolled(enrolled):
    with open(EMBEDDINGS_FILE, "w") as f:
        json.dump({k: v.tolist() for k, v in enrolled.items()}, f)
    print(f"Saved to {EMBEDDINGS_FILE}")

def enroll_person(name: str, samples: int = 8):
    enrolled = load_enrolled()
    cap = cv2.VideoCapture(1)
    captured = []

    print(f"\nEnrolling: {name}")
    print(f"SPACE dabaao capture karne ke liye ({samples} samples chahiye)")
    print("Q dabaao cancel karne ke liye\n")

    while len(captured) < samples:
        ret, frame = cap.read()
        if not ret:
            break

        faces = app.get(frame)
        display = frame.copy()

        if faces:
            x1, y1, x2, y2 = map(int, faces[0].bbox)
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(display, f"Captured: {len(captured)}/{samples}",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(display, "Face nahi dikh raha...",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.imshow(f"Enrolling - {name}", display)
        key = cv2.waitKey(1)

        if key == ord(' ') and faces:
            emb = faces[0].normed_embedding
            captured.append(emb)
            print(f"  Sample {len(captured)}/{samples} captured ✓")
        elif key == ord('q'):
            print("Cancelled.")
            break

    cap.release()
    cv2.destroyAllWindows()

    if len(captured) >= 3:
        avg_embedding = np.mean(captured, axis=0)
        enrolled[name] = avg_embedding
        save_enrolled(enrolled)
        print(f"\n✓ {name} enrolled successfully! ({len(captured)} samples)")
    else:
        print("\n✗ Enough samples nahi mile, try again.")

if __name__ == "__main__":
    name = input("Person ka naam likho: ")
    enroll_person(name)