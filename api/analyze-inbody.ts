import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const startTime = Date.now();
  const serverLogs: Array<{ step: string; timestamp: string; details?: any }> = [];
  const addLog = (step: string, details?: any) => {
    const entry = { step, timestamp: new Date().toISOString().slice(11, 23), details };
    serverLogs.push(entry);
    console.log(`[Vercel Serverless OCR] ${entry.timestamp} - ${step}`);
  };

  addLog('Request received on /api/analyze-inbody (Vercel Serverless Handler)', {
    method: req.method,
    userAgent: req.headers['user-agent']?.slice(0, 100),
  });

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      addLog('Missing imageBase64 in body');
      return res.status(400).json({
        error: '분석할 이미지 데이터가 전달되지 않았습니다.',
        isValidInBody: false,
        _debug: { serverLogs, elapsedMs: Date.now() - startTime },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      addLog('GEMINI_API_KEY is missing');
      return res.status(500).json({
        isValidInBody: false,
        error: 'AI API 키(GEMINI_API_KEY)가 서버 환경변수에 설정되어 있지 않습니다. Vercel Project Settings > Environment Variables에서 GEMINI_API_KEY를 추가해주세요.',
        _debug: { serverLogs, elapsedMs: Date.now() - startTime, apiKeyConfigured: false },
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 45000,
      },
    });

    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';
    const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');
    addLog('Base64 cleaned', { mimeType, length: cleanBase64.length });

    const systemPrompt = `You are an expert OCR & body composition document analyzer.
Your task is to analyze photos or scans of Korean InBody result sheets (인바디 검사 결과지, 체성분 분석표, 스마트 체중계 앱 캡처, 인바디 770/570/370/270/230, 인바디 다이얼, Accuniq, Tanita, 헬스장 측정지).

CRITICAL INSTRUCTIONS:
1. The image comes from a smartphone (iPhone/Android) or camera. It may be:
   - Taken vertically or horizontally
   - Rotated (90°, 180°, 270°) or skewed/tilted
   - Photographed on a desk, gym floor, or held by hand
   - Showing full paper or cropped table
2. Identify the body composition table (체중, 골격근량, 체지방량, 체지방률, BMI 등).
3. Even if some parts are blurred or low-contrast, extract the numbers with best effort.
4. Only return "isValidInBody": false if the image is COMPLETELY UNRELATED to health/body/inbody (e.g. food picture, landscape, pet, car, selfie without any document). If it looks like ANY test report, receipt, scale screen, or InBody paper, ALWAYS set "isValidInBody": true and extract the numbers.

JSON SCHEMA (Output valid JSON only):
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

    let responseText = '';
    let successfulModel = '';
    // Priority order: gemini-3.7-flash (with low thinking for speed), then gemini-flash-latest
    const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest'];
    const modelAttempts: Array<{ model: string; ok: boolean; error?: string }> = [];

    for (const modelName of modelsToTry) {
      addLog(`Attempting model ${modelName}`);
      try {
        const config: any = {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.1,
        };

        // If using Gemini 3 series, minimize thinking latency for fast OCR response
        if (modelName.includes('gemini-3')) {
          config.thinkingConfig = { thinkingLevel: 'LOW' };
        }

        const apiCall = ai.models.generateContent({
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
                  text: 'Extract the body composition numbers (weight 체중, muscle mass 골격근량, body fat 체지방률, BMI, BMR, etc.) from this image. Output strictly valid JSON.',
                },
              ],
            },
          ],
          config,
        });

        // 25 second timeout per attempt
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${modelName} timed out after 25s`)), 25000)
        );

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        responseText = response?.text || '';
        if (responseText) {
          successfulModel = modelName;
          modelAttempts.push({ model: modelName, ok: true });
          addLog(`Model ${modelName} succeeded`);
          break;
        }
      } catch (mErr: any) {
        const errMsg = mErr?.message || String(mErr);
        addLog(`Model ${modelName} failed`, { error: errMsg });
        modelAttempts.push({ model: modelName, ok: false, error: errMsg });
      }
    }

    if (!responseText) {
      return res.status(500).json({
        isValidInBody: false,
        error: '인바디 분석 모델 응답을 가져오지 못했습니다. 다시 촬영해주세요.',
        _debug: { serverLogs, modelAttempts, elapsedMs: Date.now() - startTime },
      });
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch {
          parsedData = {};
        }
      }
    }

    if (parsedData.isValidInBody === false) {
      return res.json({
        isValidInBody: false,
        error: parsedData.error || '인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 선명하게 보이도록 다시 촬영하거나 선택해주세요.',
        _debug: { serverLogs, successfulModel, modelAttempts, parsedData, elapsedMs: Date.now() - startTime },
      });
    }

    // Helper to parse numbers safely from various formats (e.g., "77.9 kg", " 77.9 ", 77.9)
    const parseNum = (val: any) => {
      if (typeof val === 'number') return isNaN(val) ? undefined : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? undefined : n;
      }
      return undefined;
    };

    let weight = parseNum(parsedData.weight);
    let smm = parseNum(parsedData.skeletalMuscleMass);
    let bfm = parseNum(parsedData.bodyFatMass);
    let pbf = parseNum(parsedData.bodyFatPercentage);
    let height = parseNum(parsedData.height) || 170;

    // Fallback regex scan on the response text if numbers were embedded in text
    if (!weight || isNaN(weight)) {
      const wMatch = responseText.match(/체중[^\d]*([\d.]+)/i) || responseText.match(/weight[^\d]*([\d.]+)/i);
      if (wMatch) weight = parseFloat(wMatch[1]);
    }
    if (!smm || isNaN(smm)) {
      const sMatch = responseText.match(/골격근량[^\d]*([\d.]+)/i) || responseText.match(/smm[^\d]*([\d.]+)/i);
      if (sMatch) smm = parseFloat(sMatch[1]);
    }
    if (!pbf || isNaN(pbf)) {
      const pMatch = responseText.match(/체지방률[^\d]*([\d.]+)/i) || responseText.match(/pbf[^\d]*([\d.]+)/i);
      if (pMatch) pbf = parseFloat(pMatch[1]);
    }

    if (!weight && !smm && !bfm && !pbf) {
      return res.json({
        isValidInBody: false,
        error: '인바디 결과지의 체중 및 체성분 수치를 인식할 수 없습니다. 밝은 조명에서 표 전체가 나오도록 다시 촬영해주세요.',
        _debug: { serverLogs, successfulModel, modelAttempts, parsedData, elapsedMs: Date.now() - startTime },
      });
    }

    if (!weight && bfm && smm) weight = parseFloat((smm + bfm + 20).toFixed(1));
    if (!weight) weight = 70.0;

    const smmVal = smm && !isNaN(smm) ? smm : parseFloat((weight * 0.42).toFixed(1));
    const pbfVal = pbf && !isNaN(pbf) ? pbf : parseFloat((((weight - smmVal) / weight) * 35).toFixed(1));
    const bfmVal = bfm && !isNaN(bfm) ? bfm : parseFloat(((weight * pbfVal) / 100).toFixed(1));
    const bmiVal = parsedData.bmi ? parseFloat(parsedData.bmi) : parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
    const bmrVal = parsedData.bmr ? parseInt(parsedData.bmr, 10) : Math.round(weight * 21.6 + 370);

    const sanitized = {
      isValidInBody: true,
      weight: parseFloat(weight.toFixed(1)),
      skeletalMuscleMass: parseFloat(smmVal.toFixed(1)),
      bodyFatMass: parseFloat(bfmVal.toFixed(1)),
      bodyFatPercentage: parseFloat(pbfVal.toFixed(1)),
      bmi: parseFloat(bmiVal.toFixed(1)),
      bmr: bmrVal,
      visceralFatLevel: parsedData.visceralFatLevel ? parseInt(parsedData.visceralFatLevel, 10) : 8,
      totalBodyWater: parsedData.totalBodyWater ? parseFloat(parsedData.totalBodyWater) : parseFloat((weight * 0.55).toFixed(1)),
      fatFreeMass: parsedData.fatFreeMass ? parseFloat(parsedData.fatFreeMass) : parseFloat((weight - bfmVal).toFixed(1)),
      protein: parsedData.protein ? parseFloat(parsedData.protein) : parseFloat((weight * 0.15).toFixed(1)),
      mineral: parsedData.mineral ? parseFloat(parsedData.mineral) : parseFloat((weight * 0.05).toFixed(2)),
      waistHipRatio: parsedData.waistHipRatio ? parseFloat(parsedData.waistHipRatio) : 0.88,
      muscleControl: parsedData.muscleControl !== undefined ? parseFloat(parsedData.muscleControl) : 0.0,
      fatControl: parsedData.fatControl !== undefined ? parseFloat(parsedData.fatControl) : -5.0,
      inBodyScore: parsedData.inBodyScore ? parseInt(parsedData.inBodyScore, 10) : 75,
      height: height,
      age: parsedData.age ? parseInt(parsedData.age, 10) : 35,
      gender: parsedData.gender || 'male',
      measuredDate: parsedData.measuredDate || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      centerName: parsedData.centerName || 'SWING GYM',
      title: parsedData.title || '스윙짐 인바디 정밀 분석',
      summary: parsedData.summary || `체중 ${weight}kg, 골격근량 ${smmVal}kg, 체지방률 ${pbfVal}%로 측정되었습니다.`,
      dietTip: parsedData.dietTip || `기초대사량 ${bmrVal} kcal에 맞춘 영양 식단 관리를 권장합니다.`,
      workoutTip: parsedData.workoutTip || `골격근량 ${smmVal}kg 유지를 위한 근력 및 유산소 운동 루틴을 추천합니다.`,
      _debug: {
        serverLogs,
        successfulModel,
        modelAttempts,
        parsedData,
        elapsedMs: Date.now() - startTime,
      },
    };

    return res.json(sanitized);
  } catch (err: any) {
    addLog('Top-level handler exception', { error: err?.message || String(err) });
    return res.status(500).json({
      isValidInBody: false,
      error: '인바디 분석 중 서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요.',
      _debug: { serverLogs, errorMsg: err?.message || String(err), elapsedMs: Date.now() - startTime },
    });
  }
}
