from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
from dotenv import load_dotenv
import tempfile
import shutil

# 환경변수 로드
load_dotenv()

# OpenAI API 키 설정
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="Whisper API Server", description="OpenAI Whisper API를 사용한 음성 인식 서버")

# CORS 설정 추가 - 더 강력하게 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용 (개발용)
    allow_credentials=False,  # credentials 비활성화
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Whisper API Server is running"}

@app.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    음성 파일을 텍스트로 변환하는 API
    """
    print(f"📁 파일 업로드 요청: {file.filename}, 크기: {file.size} bytes")
    
    # 파일 확장자 검증
    allowed_extensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.wav', '.webm', '.m4a']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        print(f"❌ 지원하지 않는 파일 형식: {file_extension}")
        raise HTTPException(
            status_code=400, 
            detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_extensions)}"
        )
    
    # 파일 크기 검증 (25MB 제한)
    if file.size and file.size > 25 * 1024 * 1024:
        print(f"❌ 파일 크기 초과: {file.size} bytes")
        raise HTTPException(
            status_code=400, 
            detail="파일 크기가 25MB를 초과합니다."
        )
    
    try:
        print("🔄 음성 변환 시작...")
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        print(f"📂 임시 파일 저장: {temp_file_path}")
        
        # OpenAI Whisper API 호출
        with open(temp_file_path, "rb") as audio_file:
            response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file
            )
        
        # 임시 파일 삭제
        os.unlink(temp_file_path)
        
        print(f"✅ 변환 완료: {len(response['text'])} 문자")
        
        return {
            "success": True,
            "text": response["text"],
            "filename": file.filename
        }
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        
        # 임시 파일 정리
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        raise HTTPException(
            status_code=500,
            detail=f"음성 변환 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """
    서버 상태 확인
    """
    return {
        "status": "healthy",
        "openai_api_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Whisper API 서버 시작...")
    print(f"🔗 서버 주소: http://localhost:8000")
    print(f"📋 API 문서: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000) 