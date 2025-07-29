const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GameCast AI API is running' });
});

// Transcribe audio endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎵 Transcribe 요청 받음');
    
    if (!req.file) {
      console.log('❌ 파일이 없음');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`📁 파일 정보: ${req.file.originalname}, 크기: ${req.file.size} bytes`);

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('🔑 OpenAI API 키 확인됨');

    // Create transcription using OpenAI
    console.log('🤖 OpenAI API 호출 시작...');

    // Create a File object from the buffer
    const file = new File([req.file.buffer], req.file.originalname, {
      type: req.file.mimetype || 'audio/mpeg'
    });

    // Add timeout and retry logic
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    }, {
      timeout: 60000, // 60 seconds timeout
      maxRetries: 3
    });

    console.log('✅ OpenAI API 호출 성공');

    // Format the response for subtitles
    const subtitles = transcription.words.map(word => ({
      text: word.word,
      startTime: word.start,
      endTime: word.end
    }));

    console.log(`📝 자막 생성 완료: ${subtitles.length}개 단어`);

    res.json({
      success: true,
      subtitles: subtitles,
      fullText: transcription.text
    });

  } catch (error) {
    console.error('❌ Transcribe 오류:', error);
    console.error('❌ 오류 상세:', error.message);
    console.error('❌ 오류 스택:', error.stack);
    
    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate subtitles with timing
app.post('/api/generate-subtitles', async (req, res) => {
  try {
    const { text, language = 'ko' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use OpenAI to improve or format subtitles
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a subtitle formatting expert. Format the given text into proper subtitle segments with timing suggestions."
        },
        {
          role: "user",
          content: `Format this text into subtitle segments: "${text}"`
        }
      ],
      max_tokens: 500
    });

    const formattedSubtitles = completion.choices[0].message.content;

    res.json({
      success: true,
      subtitles: formattedSubtitles
    });

  } catch (error) {
    console.error('Subtitle generation error:', error);
    res.status(500).json({
      error: 'Failed to generate subtitles',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 GameCast AI API server running on port ${port}`);
  console.log(`📝 Health check: http://localhost:${port}/health`);
  console.log(`🎵 Transcribe endpoint: http://localhost:${port}/api/transcribe`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음'}`);
}); 