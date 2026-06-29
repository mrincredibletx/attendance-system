import pandas as pd
import requests
import os
import sys
from pathlib import Path

API_URL = "http://127.0.0.1:8000"

def bulk_enroll(excel_path: str, photos_folder: str):
    # Excel read karo
    df = pd.read_excel(excel_path)
    print(f"Total students found: {len(df)}")
    print(f"Columns: {list(df.columns)}\n")

    success = 0
    failed = 0
    skipped = 0

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        enrollment_no = str(row.get("enrollment_no", "")).strip()
        department = str(row.get("department", "")).strip()
        section = str(row.get("section", "")).strip()
        email = str(row.get("email", "")).strip()
        contact = str(row.get("contact_no", "")).strip()
        role = str(row.get("role", "student")).strip()

        if not name:
            print(f"  ⚠ Skipping — naam nahi mila")
            skipped += 1
            continue

        # Photo dhundho — multiple formats try karo
        photo_path = None
        photos_dir = Path(photos_folder)

        possible_names = [
            f"{enrollment_no}.jpg",
            f"{enrollment_no}.png",
            f"{name}.jpg",
            f"{name}.png",
            f"{enrollment_no}_{name}.jpg",
            f"{enrollment_no}_{name}.png",
            f"{name}_{enrollment_no}.jpg",
        ]

        for fname in possible_names:
            candidate = photos_dir / fname
            if candidate.exists():
                photo_path = candidate
                break

        if not photo_path:
            print(f"  ✗ {name} ({enrollment_no}) — photo nahi mili, skipping")
            skipped += 1
            continue

        # API call karo
        try:
            with open(photo_path, "rb") as f:
                res = requests.post(
                    f"{API_URL}/enroll",
                    params={
                        "name": name,
                        "role": role,
                        "roll_number": enrollment_no,
                        "department": department,
                        "section": section,
                        "email": email,
                        "contact": contact,
                    },
                    files={"file": (photo_path.name, f, "image/jpeg")}
                )
            data = res.json()
            if data.get("status") == "success":
                print(f"  ✓ {name} ({enrollment_no}) — enrolled!")
                success += 1
            else:
                print(f"  ✗ {name} ({enrollment_no}) — {data.get('message')}")
                failed += 1
        except Exception as e:
            print(f"  ✗ {name} — Error: {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"✓ Success  : {success}")
    print(f"✗ Failed   : {failed}")
    print(f"⚠ Skipped  : {skipped}")
    print(f"{'='*40}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python enrollment/bulk_enroll.py <excel_file> <photos_folder>")
        print("Example: python enrollment/bulk_enroll.py data/students.xlsx data/photos/")
        sys.exit(1)

    excel_file = sys.argv[1]
    photos_dir = sys.argv[2]

    if not os.path.exists(excel_file):
        print(f"Excel file nahi mili: {excel_file}")
        sys.exit(1)

    if not os.path.exists(photos_dir):
        print(f"Photos folder nahi mila: {photos_dir}")
        sys.exit(1)

    bulk_enroll(excel_file, photos_dir)