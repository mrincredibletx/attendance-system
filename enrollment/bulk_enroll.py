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

app_ai = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app_ai.prepare(ctx_id=-1, det_size=(640, 640))

SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp'}

def extract_name_from_filename(filename: str) -> str:
    """
    'IMG-20251222-WA0135 (1) - Yashasvi Chhaliya.jpg'
    → 'Yashasvi Chhaliya'
    """
    stem = Path(filename).stem  # extension hata do
    if ' - ' in stem:
        return stem.split(' - ')[-1].strip()
    return stem.strip()

def name_match(excel_name: str, file_name: str) -> bool:
    """Flexible name matching — case insensitive, partial bhi"""
    excel_clean = excel_name.strip().lower()
    file_clean  = file_name.strip().lower()

    if excel_clean == file_clean:
        return True

    # Partial match — sabhi words match hon
    excel_parts = set(excel_clean.split())
    file_parts  = set(file_clean.split())
    if excel_parts == file_parts:
        return True

    # Excel name ke sabhi parts file name mein hon
    if all(part in file_clean for part in excel_clean.split()):
        return True

    return False

def get_photos_for_student(name: str, photos_dir: Path) -> list:
    """Student ke naam se match hone wali saari photos dhundo"""
    matched = []
    for f in photos_dir.iterdir():
        if f.suffix.lower() not in SUPPORTED:
            continue
        extracted = extract_name_from_filename(f.name)
        if name_match(name, extracted):
            matched.append(f)
    return matched

def get_embedding_from_photos(photo_files: list) -> np.ndarray | None:
    """Multiple photos se average embedding nikalo"""
    embeddings = []
    for photo_path in photo_files:
        try:
            img = np.array(Image.open(photo_path).convert("RGB"))
            faces = app_ai.get(img)
            if faces:
                embeddings.append(faces[0].normed_embedding)
                print(f"    ✓ {photo_path.name}")
            else:
                print(f"    ⚠ No face: {photo_path.name}")
        except Exception as e:
            print(f"    ✗ Error {photo_path.name}: {e}")

    if not embeddings:
        return None

    avg = np.mean(embeddings, axis=0)
    avg = avg / np.linalg.norm(avg)
    return avg

def bulk_enroll(excel_path: str, photos_root: str):
    df = pd.read_excel(excel_path)
    photos_dir = Path(photos_root)

    all_files = [f for f in photos_dir.iterdir() if f.suffix.lower() in SUPPORTED]
    print(f"Total students in Excel : {len(df)}")
    print(f"Total photo files found : {len(all_files)}")
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

        # Duplicate check
        existing = db.query(Person).filter(
            Person.enrollment_no == enrollment_no
        ).first()
        if existing:
            print(f"  ⚠ Already enrolled — skip\n")
            duplicate += 1
            continue

        # Photos dhundo
        photos = get_photos_for_student(name, photos_dir)
        if not photos:
            print(f"  ✗ Koi photo nahi mili — skip\n")
            skipped += 1
            continue

        print(f"  📸 {len(photos)} photo(s) mili:")

        # Embedding nikalo
        embedding = get_embedding_from_photos(photos)
        if embedding is None:
            print(f"  ✗ Koi face detect nahi hua — skip\n")
            failed += 1
            continue

        # DB save
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