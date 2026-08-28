import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SwingGym InBody Analytics API' });
  });

  // API Route: Analyze InBody Image using Gemini Vision
  app.post('/api/analyze-inbody', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required', isValidInBody: false });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set.');
        return res.status(400).json({
          error: 'GEMINI_API_KEY missing',
          isValidInBody: false,
          message: '정확한 인바디 스캔을 위해 결과지 사진을 촬영하거나 업로드해주세요.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Parse data URL and mime type
      let mimeType = 'image/jpeg';
      let cleanBase64 = imageBase64;
      const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }

      const prompt = `You are a strict, high-precision OCR and document classification engine for InBody and body composition report sheets (체성분 분석 결과지 / 인바디 검사지).

First, evaluate whether the image is actually an InBody / Body Composition report sheet.
If the image is NOT an InBody sheet (e.g. landscape, random object, animal, selfie, general text document, car, food, screen screenshot of other apps, blurred unrecognizable photo), set "isValidInBody": false and stop.

If and only if it IS an InBody / 체성분 분석 결과지:
1. Set "isValidInBody": true
2. Extract the exact printed numbers from the sheet:
   - "weight": number (체중 in kg e.g. 79.0)
   - "skeletalMuscleMass": number (골격근량 in kg e.g. 30.6)
   - "bodyFatMass": number (체지방량 in kg e.g. 24.9)
   - "bodyFatPercentage": number (체지방률 in % e.g. 31.6)
   - "bmi": number (BMI e.g. 30.1)
   - "bmr": number (기초대사량 in kcal e.g. 1538)
   - "visceralFatLevel": number (내장지방 레벨 1~20 e.g. 9)
   - "totalBodyWater": number (체수분 in kg e.g. 39.7)
   - "fatFreeMass": number (제지방량 in kg e.g. 54.1)
   - "protein": number (단백질 in kg e.g. 10.9)
   - "mineral": number (무기질 in kg e.g. 3.52)
   - "waistHipRatio": number (복부지방률 e.g. 0.93)
   - "muscleControl": number (근육조절 in kg e.g. 0.0)
   - "fatControl": number (지방조절 in kg e.g. -15.4)
   - "inBodyScore": number (신체발달점수 / InBody Score e.g. 70)
   - "height": number (신장 in cm e.g. 162)
   - "age": number (연령 e.g. 50)
   - "gender": string ("male" | "female")
   - "measuredDate": string (측정일자 e.g. "2025.09.01")
   - "centerName": string (e.g. "SWING GYM")
   - "title": string (e.g. "스윙짐 인바디 정밀 측정")
   - "summary": string (Korean assessment of the exact body composition)
   - "dietTip": string (Korean nutrition tip)
   - "workoutTip": string (Korean exercise tip)

Return ONLY a valid JSON object matching this schema:
{
  "isValidInBody": boolean,
  "invalidReason": string (Korean reason if invalid, e.g. "인바디 결과지 형태가 인식되지 않았습니다. 인바디 검사 결과지 전체가 선명하게 나오도록 다시 촬영해주세요."),
  "weight": number,
  "skeletalMuscleMass": number,
  "bodyFatMass": number,
  "bodyFatPercentage": number,
  "bmi": number,
  "bmr": number,
  "visceralFatLevel": number,
  "totalBodyWater": number,
  "fatFreeMass": number,
  "protein": number,
  "mineral": number,
  "waistHipRatio": number,
  "muscleControl": number,
  "fatControl": number,
  "inBodyScore": number,
  "height": number,
  "age": number,
  "gender": string,
  "measuredDate": string,
  "centerName": string,
  "title": string,
  "summary": string,
  "dietTip": string,
  "workoutTip": string
}`;

      // Accurate OCR using gemini-2.5-flash with 20s timeout
      const generatePromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OCR Timeout')), 20000)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const text = response.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);

      if (parsedData.isValidInBody === false) {
        return res.json({
          isValidInBody: false,
          error: parsedData.invalidReason || '인바디 결과지 양식이 아닙니다. 정확한 인바디 결과지를 스캔해주세요.',
        });
      }

      // Sanitize extracted numbers
      const sanitized: any = { isValidInBody: true };
      for (const [k, v] of Object.entries(parsedData)) {
        if (typeof v === 'number') {
          sanitized[k] = isNaN(v) ? undefined : v;
        } else if (typeof v === 'string') {
          sanitized[k] = v.trim();
        } else if (typeof v === 'boolean') {
          sanitized[k] = v;
        }
      }

      // Check if core metrics were found
      if (
        typeof sanitized.weight === 'number' &&
        sanitized.weight > 20 &&
        sanitized.weight < 250 &&
        typeof sanitized.skeletalMuscleMass === 'number' &&
        typeof sanitized.bodyFatPercentage === 'number'
      ) {
        return res.json(sanitized);
      }

      // If weight or muscle couldn't be extracted, reject as non-inbody sheet
      return res.json({
        isValidInBody: false,
        error: '인바디 결과지의 주요 수치(체중, 골격근량, 체지방률)를 식별할 수 없습니다. 결과지 전체가 나오도록 다시 스캔해주세요.',
      });
    } catch (err: any) {
      console.error('Error analyzing inbody with gemini:', err);
      return res.status(500).json({
        isValidInBody: false,
        error: '인바디 분석 중 오류가 발생했습니다. 선명한 결과지 사진으로 다시 시도해주세요.',
      });
    }
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SwingGym InBody Server running on http://localhost:${PORT}`);
  });
}

startServer();
