import React, { useState } from "react";

const HighlightPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setUploaded(false);
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    await fetch("http://localhost:8000/upload/", {
      method: "POST",
      body: formData,
    });
    setUploaded(true);
  };

  const handleProcess = async () => {
    setProcessing(true);
    await fetch("http://localhost:8000/process/", { method: "POST" });
    setProcessing(false);
    fetchResults();
  };

  const fetchResults = async () => {
    const res = await fetch("http://localhost:8000/result/");
    const data = await res.json();
    setResults(data.files);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>하이라이트 영상 자동 생성기</h2>
      <input type="file" multiple accept="video/mp4" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={files.length === 0} style={{ marginLeft: 8 }}>
        업로드
      </button>
      {uploaded && (
        <button onClick={handleProcess} style={{ marginLeft: 8 }}>
          {processing ? "처리 중..." : "하이라이트 추출 시작"}
        </button>
      )}
      <div style={{ marginTop: 24 }}>
        <h3>결과 영상 다운로드</h3>
        <ul>
          {results.map((file) => (
            <li key={file}>
              <a href={`http://localhost:8000/download/${file}`} target="_blank" rel="noopener noreferrer">
                {file}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default HighlightPage;
