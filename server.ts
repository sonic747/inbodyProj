import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SwingGym InBody Analytics API' });
  });

  // API Route: Analyze InBody Image using Gemini Vision OCR
  app.post('/api/analyze-inbody', async (req, res) => {
    // Helper to generate a reliable InBody baseline record if API is not set or network fails
    const generateFallbackRecord = (note?: string) => ({
      isValidInBody: true,
      isFallback: true,
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
      measuredDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      centerName: 'SWING GYM',
      title: '스윙짐 인바디 정밀 측정',
      summary: '체중 79.0kg, 골격근량 30.6kg, 체지방률 31.6%로 측정되었습니다. 골격근량이 양호하며 체지방 감량 관리가 권장됩니다.',
      dietTip: '일일 권장 섭취열량 1,600 kcal를 기준으로 고단백질, 복합 탄수화물, 풍부한 채소 위주의 식단을 권장합니다.',
      workoutTip: '근력 운동(스쿼트, 데드리프트, 머신 운동) 주 3회 및 유산소 30분을 권장합니다.',
      note,
    });

    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: '분석할 이미지 데이터가 전달되지 않았습니다.', isValidInBody: false });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('GEMINI_API_KEY is missing in process.env');
        return res.status(500).json({
          isValidInBody: false,
          error: 'AI API 키(GEMINI_API_KEY)가 설정되어 있지 않습니다. 설정 메뉴에서 API 키를 확인해주세요.',
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
        const rawMime = match[1].toLowerCase();
        if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(rawMime)) {
          mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
        } else {
          mimeType = 'image/jpeg';
        }
        cleanBase64 = match[2];
      }
      cleanBase64 = cleanBase64.replace(/\s+/g, '');

      const systemPrompt = `You are a high-precision OCR and document analysis AI specialized in Korean body composition analysis sheets (InBody / 체성분 분석 결과지 / 인바디 검사지 / InBody 770, 570, 370, 270, 230, InBody Dial, Accuniq, Tanita, SWING GYM printouts, smart scale app screenshots).

CRITICAL TASK:
Step 1. Determine if this image is a genuine InBody / body composition result sheet.
- A valid image contains body composition tables, metrics like 체중 (Weight), 골격근량 (Skeletal Muscle Mass), 체지방량 (Body Fat Mass), 체지방률 (Percent Body Fat), BMI, etc.
- If the image is NOT a body composition report (e.g. it is a person's selfie, food, landscape, scenery, animal, car, receipt, document with no body metrics, or completely illegible/blank image):
  YOU MUST RETURN ONLY:
  {
    "isValidInBody": false,
    "error": "인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 선명하게 보이도록 다시 촬영하거나 선택해주세요."
  }

Step 2. If it IS a valid InBody / body composition sheet:
- Extract the EXACT, REAL numbers printed in THIS image. NEVER invent fake numbers.
- Header fields:
  * height: 신장 (cm, number)
  * age: 연령 (number)
  * gender: 성별 ("male" or "female")
  * measuredDate: 측정일자 / 검사일시 (string in "YYYY.MM.DD" format, e.g. "2026.06.23")
  * centerName: 검사기관 / 센터명 (e.g. "SWING GYM" or the text printed on top/bottom)
- Core body composition fields:
  * weight: 체중 (kg, number)
  * skeletalMuscleMass: 골격근량 / SMM (kg, number)
  * bodyFatMass: 체지방량 (kg, number)
  * bodyFatPercentage: 체지방률 / PBF (%, number)
  * bmi: BMI (number)
  * bmr: 기초대사량 (kcal, number)
  * visceralFatLevel: 내장지방레벨 (1~20 integer)
  * totalBodyWater: 체수분 (L or kg, number)
  * fatFreeMass: 제지방량 (kg, number)
  * protein: 단백질 (kg, number)
  * mineral: 무기질 (kg, number)
  * waistHipRatio: 복부지방률 / WHR (number)
  * muscleControl: 근육조절 (kg, number)
  * fatControl: 지방조절 (kg, number)
  * inBodyScore: 인바디점수 / 신체발달점수 (0~100 integer)

- If some secondary fields are missing or not printed on the sheet, compute them mathematically:
  * fatFreeMass = weight - bodyFatMass
  * bmi = weight / ((height/100)^2)
  * bmr = 370 + (21.6 * fatFreeMass)
  * visceralFatLevel = bodyFatPercentage > 30 ? 8 : (bodyFatPercentage > 25 ? 7 : 5)

- Analysis comments:
  * title: descriptive title like "스윙짐 인바디 정밀 측정 (YYYY.MM.DD)"
  * summary: concise professional clinical summary in Korean reflecting the person's exact numbers
  * dietTip: personalized nutritional advice based on their BMR and body fat
  * workoutTip: targeted exercise recommendation based on their muscle mass and fat control

Return ONLY valid JSON matching this schema:
{
  "isValidInBody": true,
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
  "gender": "male" | "female",
  "measuredDate": string,
  "centerName": string,
  "title": string,
  "summary": string,
  "dietTip": string,
  "workoutTip": string
}`;

      try {
        let responseText = '';
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastErr: any = null;

        for (const modelName of modelsToTry) {
          try {
            const response: any = await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64,
                      },
                    },
                    {
                      text: systemPrompt,
                    },
                  ],
                },
              ],
              config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            });
            responseText = response.text || '';
            if (responseText) break;
          } catch (mErr: any) {
            console.warn(`Model ${modelName} failed:`, mErr?.message);
            lastErr = mErr;
          }
        }

        if (!responseText && lastErr) {
          throw lastErr;
        }

        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsedData: any = {};
        try {
          parsedData = JSON.parse(cleanJson);
        } catch {
          console.warn('Failed to parse Gemini JSON output:', responseText);
          return res.status(422).json({
            isValidInBody: false,
            error: '인바디 결과지 텍스트를 판독할 수 없습니다. 글자가 선명하게 보이도록 다시 촬영해주세요.',
          });
        }

        // Check if the AI determined this is not a valid InBody sheet
        if (parsedData.isValidInBody === false) {
          return res.json({
            isValidInBody: false,
            error:
              parsedData.error ||
              '인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 선명하게 보이도록 다시 촬영하거나 선택해주세요.',
          });
        }

        // Helper to parse numbers safely
        const parseNum = (val: any) => {
          if (typeof val === 'number') return isNaN(val) ? undefined : val;
          if (typeof val === 'string') {
            const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? undefined : n;
          }
          return undefined;
        };

        const weight = parseNum(parsedData.weight);
        const smm = parseNum(parsedData.skeletalMuscleMass);
        const bfm = parseNum(parsedData.bodyFatMass);
        const pbf = parseNum(parsedData.bodyFatPercentage);

        // If core metrics are completely missing or out of plausible human range, treat as invalid
        if (!weight || weight < 20 || weight > 300) {
          return res.json({
            isValidInBody: false,
            error: '인바디 결과지의 체중 및 체성분 수치를 인식할 수 없습니다. 밝은 조명에서 표 전체가 나오도록 다시 촬영해주세요.',
          });
        }

        const height = parseNum(parsedData.height) || 170;
        const heightM = height / 100;
        const bmi = parseNum(parsedData.bmi) || +(weight / (heightM * heightM)).toFixed(1);
        const bodyFatMassVal = bfm !== undefined ? bfm : (pbf ? +(weight * (pbf / 100)).toFixed(1) : +(weight * 0.25).toFixed(1));
        const pbfVal = pbf !== undefined ? pbf : (bodyFatMassVal ? +((bodyFatMassVal / weight) * 100).toFixed(1) : 25.0);
        const smmVal = smm !== undefined ? smm : +(weight * 0.40).toFixed(1);
        const ffmVal = parseNum(parsedData.fatFreeMass) || +(weight - bodyFatMassVal).toFixed(1);
        const tbwVal = parseNum(parsedData.totalBodyWater) || +(ffmVal * 0.73).toFixed(1);
        const proteinVal = parseNum(parsedData.protein) || +(ffmVal * 0.2).toFixed(1);
        const mineralVal = parseNum(parsedData.mineral) || +(ffmVal * 0.065).toFixed(2);
        const bmrVal = parseNum(parsedData.bmr) || Math.round(370 + 21.6 * ffmVal);
        const visceralVal = parseNum(parsedData.visceralFatLevel) || (pbfVal > 30 ? 8 : pbfVal > 25 ? 7 : 5);
        const scoreVal = parseNum(parsedData.inBodyScore) || Math.min(95, Math.max(50, Math.round(80 - (pbfVal - 20) * 1.2 + (smmVal / weight - 0.4) * 40)));

        const sanitized = {
          isValidInBody: true,
          weight,
          skeletalMuscleMass: smmVal,
          bodyFatMass: bodyFatMassVal,
          bodyFatPercentage: pbfVal,
          bmi,
          bmr: bmrVal,
          visceralFatLevel: visceralVal,
          totalBodyWater: tbwVal,
          fatFreeMass: ffmVal,
          protein: proteinVal,
          mineral: mineralVal,
          waistHipRatio: parseNum(parsedData.waistHipRatio) || 0.88,
          muscleControl: parseNum(parsedData.muscleControl) || 0.0,
          fatControl: parseNum(parsedData.fatControl) || (pbfVal > 22 ? -+(bodyFatMassVal - weight * 0.18).toFixed(1) : 0.0),
          inBodyScore: scoreVal,
          height,
          age: parseNum(parsedData.age) || 35,
          gender: parsedData.gender === 'female' ? 'female' : 'male',
          measuredDate: parsedData.measuredDate || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
          centerName: parsedData.centerName || 'SWING GYM',
          title: parsedData.title || `스윙짐 인바디 정밀 측정 (${parsedData.measuredDate || new Date().toISOString().slice(0, 10).replace(/-/g, '.')})`,
          summary: parsedData.summary || `체중 ${weight}kg, 골격근량 ${smmVal}kg, 체지방률 ${pbfVal}%로 측정되었습니다.`,
          dietTip: parsedData.dietTip || `기초대사량 ${bmrVal} kcal에 맞춘 균형 잡힌 영양 식단을 권장합니다.`,
          workoutTip: parsedData.workoutTip || `골격근량 유지와 체지방 관리를 위해 주 3~4회 운동을 권장합니다.`,
        };

        return res.json(sanitized);
      } catch (geminiErr: any) {
        console.warn('Gemini OCR API error:', geminiErr);
        return res.status(500).json({
          isValidInBody: false,
          error: 'AI 인바디 분석 중 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }
    } catch (err: any) {
      console.error('Error analyzing inbody:', err);
      return res.status(500).json({
        isValidInBody: false,
        error: '서버 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
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
