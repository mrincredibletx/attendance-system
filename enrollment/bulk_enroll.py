import pandas as pd
import numpy as np
import insightface
import json
import sys
import os
from pathlib import Path
from PIL import Image
from api.database import SessionLocal
from api.models import Person

# InsightFace load karo
app_ai = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app_ai.prepare(ctx_id=-1, det_size=(640, 640))

def name_to_folder(name: str, folders: list) -> Path | None:
    """Excel name se folder match karo — flexible matching"""
    name_clean = name.strip().lower().replace(" ", "-")
    for folder in folders:
        folder_clean = folder.name.lower()
        if folder_clean == name_clean:
            return folder
        # Partial match bhi try karo
        name_parts = set(name.strip().lower().split())
        folder_parts = set(folder.name.lower().replace("-", " ").split())
        if name_parts == folder_parts:
            return folder
    return None

def get_embedding_from_photos(photo_folder: Path) -> np.ndarray | None:
    """Folder ke saare photos se average embedding nikalo"""
    embeddings = []
    photos = list(photo_folder.glob("*.jpg")) + \
             list(photo_folder.glob("*.jpeg")) + \
             list(photo_folder.glob("*.png"))

    if not photos:
        return None

    for photo_path in photos:
        try:
            img = np.array(Image.open(photo_path).convert("RGB"))
            faces = app_ai.get(img)
            if faces:
                embeddings.append(faces[0].normed_embedding)
        except Exception as e:
            print(f"    ⚠ {photo_path.name} skip: {e}")

    if not embeddings:
        return None

    avg = np.mean(embeddings, axis=0)
    avg = avg / np.linalg.norm(avg)  # normalize
    return avg

def bulk_enroll(excel_path: str, photos_root: str):
    df = pd.read_excel(excel_path)
    photos_dir = Path(photos_root)
    folders = [f for f in photos_dir.iterdir() if f.is_dir()]

    print(f"Total students in Excel : {len(df)}")
    print(f"Total photo folders     : {len(folders)}")
    print(f"{'='*45}\n")

    db = SessionLocal()
    success, failed, skipped, duplicate = 0, 0, 0, 0

    for _, row in df.iterrows():
        name          = str(row.get("name", "")).strip()
        enrollment_no = str(row.get("enrollment_no", "")).strip()
        department    = str(row.get("department", "")).strip()
        section       = str(row.get("section", "")).strip()
        email         = str(row.get("email", "")).strip()
        contact       = str(row.get("contact_no", "")).strip()
        role          = str(row.get("role", "student")).strip().lower()

        print(f"Processing: {name} ({enrollment_no})")

        # Already enrolled check
        existing = db.query(Person).filter(
            Person.enrollment_no == enrollment_no
        ).first()
        if existing:
            print(f"  ⚠ Already enrolled — skip\n")
            duplicate += 1
            continue

        # Photo folder dhundo
        folder = name_to_folder(name, folders)
        if not folder:
            print(f"  ✗ Photo folder nahi mila — skip\n")
            skipped += 1
            continue

        # Embedding nikalo
        print(f"  📸 {folder.name} — photos processing...")
        embedding = get_embedding_from_photos(folder)
        if embedding is None:
            print(f"  ✗ Koi face detect nahi hua — skip\n")
            failed += 1
            continue

        # DB mein save karo
        person = Person(
            name=name,
            role=role,
            enrollment_no=enrollment_no,
            department=department,
            section=section,
            email=email,
            contact=contact,
            embedding=json.dumps(embedding.tolist())
        )
        db.add(person)
        db.commit()
        print(f"  ✓ Enrolled successfully!\n")
        success += 1

    db.close()

    print(f"{'='*45}")
    print(f"✓ Success   : {success}")
    print(f"⚠ Duplicate : {duplicate}")
    print(f"✗ No photo  : {skipped}")
    print(f"✗ No face   : {failed}")
    print(f"{'='*45}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python enrollment/bulk_enroll.py <excel> <photos_folder>")
        sys.exit(1)
    bulk_enroll(sys.argv[1], sys.argv[2])