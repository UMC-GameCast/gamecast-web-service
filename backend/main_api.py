from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main  # 기존 main.py의 main() 함수 사용

app = FastAPI()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "input")
RESULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")

# CORS 허용 (프론트엔드 개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload/")
async def upload_file(files: list[UploadFile] = File(...)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    return {"filenames": [file.filename for file in files]}

@app.post("/process/")
def process_files():
    main.main()  # 기존 main.py의 main() 함수 실행
    return {"status": "processing finished"}

@app.get("/result/")
def list_results():
    files = [f for f in os.listdir(RESULT_DIR) if f.endswith(".mp4")]
    return {"files": files}

@app.get("/download/{filename}")
def download_file(filename: str):
    file_path = os.path.join(RESULT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4", filename=filename)
    return JSONResponse(status_code=404, content={"message": "File not found"})
