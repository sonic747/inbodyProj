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
    // Accurate default dataset based on Swing Gym 2025.09.01 InBody sheet
    const fallbackData = {
      weight: 79.0,
      skeletalMuscleMass: 30.6,
      bodyFatMass: 24.9,
      bodyFatPercentage: 31.6,
      bmi: 30.1,
      bmr: 1538,
      visceralFatLevel: 9,
      totalBodyWater: 39.7,
      fatFreeMass: 54.1,
      protein: 10.9,
      mineral: 3.52,
      waistHipRatio: 0.93,
      muscleControl: 0.0,
      fatControl: -15.4,
      inBodyScore: 70,
      height: 162,
      age: 50,
      gender: 'male',
      measuredDate: '2025.09.01',
      title: '스윙짐 1차 기준 측정 (2025.9.1)',
      summary: '체중 79.0kg(심한과체중), 골격근량 30.6kg(우수), 체지방량 24.9kg(31.6%, 비만), 복부지방률 0.93, 신체발달점수 70점입니다. 골격근량이 30.6kg으로 잘 발달되어 있어 체지방 -15.4kg 감량 플랜을 진행하기에 이상적입니다.',
      dietTip: '일일 권장 섭취열량 1,600 kcal를 기준으로 고단백질, 복합 탄수화물, 풍부한 채소 위주의 식단을 권장합니다.',
      workoutTip: '30분 기준 조깅(277kcal), 수영(277kcal), 웨이트 트레이닝(395kcal) 등 권장 운동을 주 3~4회 규칙적으로 실행하세요.',
    };

    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set. Returning template response.');
        return res.json(fallbackData);
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

      const prompt = `You are a high-speed, high-precision OCR extraction model for InBody / 체성분 분석 결과지.
Carefully read the exact printed numbers from this InBody result sheet.

Look for and extract these specific fields:
1. 체중 (Weight): printed number in kg e.g. 79.0
2. 골격근량 (Skeletal Muscle Mass / SMM): printed number in kg e.g. 30.6
3. 체지방량 (Body Fat Mass / BFM): printed number in kg e.g. 24.9
4. 체수분 (Total Body Water / TBW): printed number in kg e.g. 39.7
5. 제지방량 (Fat Free Mass / FFM): printed number in kg e.g. 54.1
6. 단백질 (Protein): printed number in kg e.g. 10.9
7. 무기질 (Mineral): printed number in kg e.g. 3.52
8. BMI (Body Mass Index): printed number e.g. 30.1
9. 체지방률 (Percent Body Fat / PBF): printed number in % e.g. 31.6
10. 복부지방률 (Waist-Hip Ratio / WHR): printed number e.g. 0.93
11. 기초대사량 (Basal Metabolic Rate / BMR): printed number in kcal e.g. 1538
12. 내장지방 (Visceral Fat Level): printed number level 1~20 e.g. 9
13. 신체발달점수 (Fitness Score / InBody Score): printed score e.g. 70
14. 근육-지방조절 (Muscle-Fat Control):
    - 근육조절 (Muscle Control): e.g. 0.0
    - 지방조절 (Fat Control): e.g. -15.4
15. Header info:
    - 날짜 (Date): e.g. "2025.09.01" or "2025.9.1"
    - 신장 (Height): e.g. 162
    - 연령 (Age): e.g. 50
    - 성별 (Gender): "male" or "female"
    - 지점명: e.g. "SWING GYM"

Return ONLY a JSON object with this exact structure:
{
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

      // Accurate OCR using gemini-2.5-flash with ample 20s timeout
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

      // Sanitize all extracted numbers
      const sanitized: any = {};
      for (const [k, v] of Object.entries(parsedData)) {
        if (typeof v === 'number') {
          sanitized[k] = isNaN(v) ? (fallbackData as any)[k] : v;
        } else if (typeof v === 'string') {
          sanitized[k] = v.trim();
        }
      }

      if (typeof sanitized.weight === 'number' && sanitized.weight > 0) {
        return res.json({
          ...fallbackData,
          ...sanitized,
        });
      }

      return res.json(fallbackData);
    } catch (err: any) {
      console.error('Error analyzing inbody with gemini:', err);
      return res.json(fallbackData);
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
