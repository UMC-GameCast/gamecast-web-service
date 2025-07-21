import React, { useState } from "react";

// AssemblyAI API KEY는 환경변수나 백엔드 프록시로 처리하는 것이 안전하지만, 데모 목적상 프론트에서 직접 호출 예시를 작성합니다.
// 실제 서비스에서는 백엔드에서 AssemblyAI와 통신하는 것이 안전합니다.

const ASSEMBLY_API_KEY = "YOUR_ASSEMBLYAI_API_KEY"; // 실제 키로 교체 필요
const ASSEMBLY_API_URL = "https://api.assemblyai.com/v2";

const AssemblyAITestPage: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utterances, setUtterances] = useState<any[]>([]);

  // 1. 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setUtterances([]);
      setError(null);
    }
  };

  // 2. AssemblyAI 업로드 및 트랜스크립트 요청
  const handleSubmit = async () => {
    if (!audioFile) return;
    setIsLoading(true);
    setError(null);
    setUtterances([]);
    try {
      // (1) AssemblyAI에 파일 업로드
      const uploadRes = await fetch(`${ASSEMBLY_API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: ASSEMBLY_API_KEY,
        },
        body: audioFile,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.upload_url) throw new Error("업로드 실패");

      // (2) 트랜스크립트 생성 요청 (화자 분리)
      const transcriptRes = await fetch(`${ASSEMBLY_API_URL}/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ASSEMBLY_API_KEY,
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          speaker_labels: true,
          speakers_expected: 4, // 4명 대화로 가정
        }),
      });
      const transcriptData = await transcriptRes.json();
      if (!transcriptData.id) throw new Error("트랜스크립트 요청 실패");

      // (3) 트랜스크립트 완료까지 폴링
      let status = transcriptData.status;
      let transcriptId = transcriptData.id;
      let resultData = null;
      for (let i = 0; i < 60; i++) { // 최대 60초 대기
        const res = await fetch(`${ASSEMBLY_API_URL}/transcript/${transcriptId}`, {
          headers: { Authorization: ASSEMBLY_API_KEY },
        });
        resultData = await res.json();
        if (resultData.status === "completed") break;
        if (resultData.status === "failed") throw new Error("트랜스크립트 실패");
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!resultData || resultData.status !== "completed") throw new Error("시간 초과");
      setUtterances(resultData.utterances || []);
    } catch (e: any) {
      setError(e.message || "오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>AssemblyAI 화자 분리 자막 추출 데모</h2>
      <input type="file" accept="audio/*,video/*" onChange={handleFileChange} />
      <button onClick={handleSubmit} disabled={!audioFile || isLoading} style={{ marginLeft: 8 }}>
        {isLoading ? "처리 중..." : "자막 추출"}
      </button>
      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      <div style={{ marginTop: 24 }}>
        <h3>자막 결과 (화자별)</h3>
        <ul>
          {utterances.map((u, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              <b>[{u.speaker}]</b> ({(u.start / 1000).toFixed(1)}s ~ {(u.end / 1000).toFixed(1)}s):<br />
              {u.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AssemblyAITestPage; 