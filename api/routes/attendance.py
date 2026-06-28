# api/routes/attendance.py
from fastapi import APIRouter
from api.models import AttendanceLog
from api.database import get_db

router = APIRouter()

@router.get("/attendance/today")
def get_today(db=Depends(get_db)):
    today = date.today()
    logs = db.query(AttendanceLog).filter(
        func.date(AttendanceLog.timestamp) == today
    ).all()
    return logs

@router.get("/attendance/report/{roll_number}")
def get_report(roll_number: str, db=Depends(get_db)):
    person = db.query(Person).filter_by(roll_number=roll_number).first()
    logs = db.query(AttendanceLog).filter_by(person_id=person.id).all()
    percentage = (len(logs) / total_working_days) * 100
    return {"roll": roll_number, "logs": logs, "percentage": percentage}

@router.post("/enrollment/register")
async def register(name: str, roll: str, file: UploadFile):
    img = read_image(await file.read())
    success = fs.register_person(name, img)
    if success:
        save_to_db(name, roll, fs.known_embeddings[name])
    return {"status": "ok" if success else "no face detected"}