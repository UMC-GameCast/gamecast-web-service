import socketio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import sys
import json
from typing import List, Dict
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main  # 기존 main.py의 main() 함수 사용
from video_renderer import VideoRenderer

app = FastAPI()

# Socket.IO 서버 생성
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
# FastAPI 앱에 Socket.IO 서버 마운트
socket_app = socketio.ASGIApp(sio, app)

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

# 비디오 렌더러 초기화
video_renderer = VideoRenderer()

@sio.event
async def connect(sid, environ):
    print(f"Socket.IO connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket.IO disconnected: {sid}")

@sio.on("join_room")
async def join_room(sid, data):
    room = data['room']
    sio.enter_room(sid, room)
    print(f"'{sid}' entered room '{room}'")
    # 방에 있는 다른 사람들에게 새로운 유저가 왔다고 알림 (자신 제외)
    await sio.emit("user_joined", {"sid": sid}, room=room, skip_sid=sid)

@sio.on("leave_room")
async def leave_room(sid, data):
    room = data['room']
    sio.leave_room(sid, room)
    print(f"'{sid}' left room '{room}'")
    # 방에 있는 다른 사람들에게 유저가 나갔다고 알림
    await sio.emit("user_left", {"sid": sid}, room=room)


@sio.on("webrtc_offer")
async def handle_offer(sid, data):
    room = data['room']
    offer = data['offer']
    target_sid = data['target_sid']
    print(f"Offer from {sid} to {target_sid}")
    await sio.emit("webrtc_offer", {"offer": offer, "sid": sid}, room=target_sid)

@sio.on("webrtc_answer")
async def handle_answer(sid, data):
    room = data['room']
    answer = data['answer']
    target_sid = data['target_sid']
    print(f"Answer from {sid} to {target_sid}")
    await sio.emit("webrtc_answer", {"answer": answer, "sid": sid}, room=target_sid)

@sio.on("webrtc_ice_candidate")
async def handle_ice_candidate(sid, data):
    room = data['room']
    candidate = data['candidate']
    target_sid = data['target_sid']
    await sio.emit("webrtc_ice_candidate", {"candidate": candidate, "sid": sid}, room=target_sid)


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

# 새로운 렌더링 API 엔드포인트들
@app.post("/render/")
async def render_video_with_subtitles(
    video_file: UploadFile = File(...),
    subtitle_data: str = None,  # JSON 문자열로 자막 데이터 전달
    output_filename: str = "rendered_video.mp4"
):
    """동영상과 자막을 합쳐서 렌더링"""
    try:
        # 비디오 파일 저장
        video_path = os.path.join(UPLOAD_DIR, video_file.filename)
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)
        
        # 자막 데이터 파싱
        if subtitle_data:
            segments = json.loads(subtitle_data)
        else:
            segments = []
        
        # 렌더링 실행
        output_path = video_renderer.render_video_with_subtitles(
            video_path, 
            segments, 
            output_filename
        )
        
        return {
            "status": "success",
            "output_path": output_path,
            "message": "렌더링이 완료되었습니다."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"렌더링 오류: {str(e)}")

@app.post("/render/custom/")
async def render_with_custom_styles(
    video_file: UploadFile = File(...),
    subtitle_data: str = None,
    output_filename: str = "custom_rendered_video.mp4",
    font_size: int = 24,
    font_color: str = "white",
    bg_color: str = "black@0.5"
):
    """커스텀 스타일로 렌더링"""
    try:
        # 비디오 파일 저장
        video_path = os.path.join(UPLOAD_DIR, video_file.filename)
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)
        
        # 자막 데이터 파싱
        if subtitle_data:
            segments = json.loads(subtitle_data)
        else:
            segments = []
        
        # 커스텀 렌더링 실행
        output_path = video_renderer.render_with_custom_styles(
            video_path,
            segments,
            output_filename,
            font_size,
            font_color,
            bg_color
        )
        
        return {
            "status": "success",
            "output_path": output_path,
            "message": "커스텀 렌더링이 완료되었습니다."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"렌더링 오류: {str(e)}")

@app.get("/render/status/{task_id}")
async def get_render_status(task_id: str):
    """렌더링 작업 상태 확인"""
    # 실제 구현에서는 작업 큐나 데이터베이스에서 상태 확인
    return {
        "task_id": task_id,
        "status": "completed",  # 또는 "processing", "failed"
        "progress": 100,
        "output_path": f"/download/rendered_{task_id}.mp4"
    }
