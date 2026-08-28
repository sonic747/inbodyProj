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
      // Remove any whitespace or newline from base64
      cleanBase64 = cleanBase64.replace(/\s+/g, '');

      const systemPrompt = `You are a high-precision OCR and document analysis engine specialized in body composition sheets (InBody / 체성분 분석 결과지 / 인바디 검사지 / InBody 770, 570, 370, 270, 230, InBody Dial, Accuniq, Tanita, SWING GYM printout, smart scale reports).

CRITICAL RULES:
1. INSPECT THE IMAGE CAREFULLY.
   - If the image is NOT a body composition report (e.g. it is a person's selfie, landscape, food, animal, car, random object, plain background with no body metrics, or completely unreadable blur):
     YOU MUST RETURN:
     {
       "isValidInBody": false,
       "invalidReason": "인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 포함된 결과지를 선명하게 촬영하거나 선택해주세요."
     }
   - DO NOT hallucinate numbers for unrelated images.

2. IF THE IMAGE IS A VALID INBODY / BODY COMPOSITION REPORT:
   - Extract the EXACT, REAL numerical values visible in THIS SPECIFIC image.
   - Look for:
     * 체중 (Weight in kg)
     * 골격근량 (Skeletal Muscle Mass / SMM in kg)
     * 체지방량 (Body Fat Mass in kg)
     * 체지방률 (Percent Body Fat / PBF in %)
     * BMI (Body Mass Index)
     * 기초대사량 (BMR in kcal)
     * 내장지방레벨 (Visceral Fat Level, integer 1-20)
     * 체수분 (Total Body Water / TBW in L or kg)
     * 제지방량 (Fat Free Mass / FFM in kg)
     * 단백질 (Protein in kg)
     * 무기질 (Mineral in kg)
     * 복부지방률 (Waist-Hip Ratio / WHR)
     * 근육조절 (Muscle Control in kg, e.g. 0.0 or +2.1)
     * 지방조절 (Fat Control in kg, e.g. -14.1)
     * 신체발달점수 / 인바디점수 (InBody Score / Fitness Score, integer 0-100)
     * 신장 (Height in cm)
     * 연령 (Age)
     * 성별 (Gender: "male" or "female")
     * 검사일시 / 측정일자 (Measured Date, e.g. "2026.06.23" or "YYYY.MM.DD")
     * 검사기관 / 센터명 (Center Name, e.g. "SWING GYM" or whatever printed)
   - If any secondary field is unreadable on the sheet, calculate it mathematically from the primary extracted metrics:
     * Fat Free Mass = Weight - Body Fat Mass
     * BMI = Weight / ((Height/100)^2)
     * BMR = 370 + (21.6 * Fat Free Mass)
   - Write a professional clinical summary in Korean based on the ACTUAL extracted numbers.

3. Return ONLY a valid JSON object matching this schema:
{
  "isValidInBody": true,
  "weight": <number>,
  "skeletalMuscleMass": <number>,
  "bodyFatMass": <number>,
  "bodyFatPercentage": <number>,
  "bmi": <number>,
  "bmr": <number>,
  "visceralFatLevel": <number>,
  "totalBodyWater": <number>,
  "fatFreeMass": <number>,
  "protein": <number>,
  "mineral": <number>,
  "waistHipRatio": <number>,
  "muscleControl": <number>,
  "fatControl": <number>,
  "inBodyScore": <number>,
  "height": <number>,
  "age": <number>,
  "gender": <"male" | "female">,
  "measuredDate": <string "YYYY.MM.DD">,
  "centerName": <string>,
  "title": <string>,
  "summary": <string in Korean analyzing this person's actual numbers>,
  "dietTip": <string in Korean customized for their actual BMR & body fat>,
  "workoutTip": <string in Korean customized for their actual muscle & fat>
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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

        const responseText = response.text || '{}';
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

        if (parsedData.isValidInBody === false) {
          return res.json({
            isValidInBody: false,
            error: parsedData.invalidReason || '인바디 결과지 양식이 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 포함된 결과지를 촬영해주세요.',
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

        // If weight or key metrics are completely missing, it's not a valid InBody
        if (!weight || weight < 15 || weight > 300) {
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
        const smmVal = smm !== undefined ? smm : +(weight * 0.4).toFixed(1);
        const ffmVal = parseNum(parsedData.fatFreeMass) || +(weight - bodyFatMassVal).toFixed(1);
        const tbwVal = parseNum(parsedData.totalBodyWater) || +(ffmVal * 0.73).toFixed(1);
        const proteinVal = parseNum(parsedData.protein) || +(ffmVal * 0.2).toFixed(1);
        const mineralVal = parseNum(parsedData.mineral) || +(ffmVal * 0.065).toFixed(2);
        const bmrVal = parseNum(parsedData.bmr) || Math.round(370 + 21.6 * ffmVal);
        const visceralVal = parseNum(parsedData.visceralFatLevel) || (pbfVal > 30 ? 9 : pbfVal > 25 ? 7 : 5);
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
        console.error('Gemini OCR API error:', geminiErr);
        return res.status(500).json({
          isValidInBody: false,
          error: 'AI 인바디 분석 중 오류가 발생했습니다. (' + (geminiErr?.message || '네트워크 오류') + ')',
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
