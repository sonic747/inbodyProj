import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS & Preflight Middleware (Essential for mobile in-app webviews like KakaoTalk / Safari)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SwingGym InBody Analytics API' });
  });

  // API Route: Analyze InBody Image using Gemini Vision OCR (support both POST and OPTIONS safely)
  app.options('/api/analyze-inbody', (req, res) => {
    res.status(204).end();
  });

  app.post('/api/analyze-inbody', async (req, res) => {
    const startTime = Date.now();
    const serverLogs: Array<{ step: string; timestamp: string; details?: any }> = [];
    const addLog = (step: string, details?: any) => {
      const entry = { step, timestamp: new Date().toISOString().slice(11, 23), details };
      serverLogs.push(entry);
      console.log(`[OCR Server] ${entry.timestamp} - ${step}`, details ? JSON.stringify(details).slice(0, 200) : '');
    };

    addLog('Request received', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.slice(0, 100),
        'origin': req.headers['origin'] || req.headers['referer'] || 'same-origin',
      },
    });

    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        addLog('Missing imageBase64 in request body');
        return res.status(400).json({
          error: '분석할 이미지 데이터가 전달되지 않았습니다.',
          isValidInBody: false,
          _debug: { serverLogs, elapsedMs: Date.now() - startTime },
        });
      }

      addLog('Image payload received', { payloadLength: imageBase64.length });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        addLog('GEMINI_API_KEY is missing in process.env');
        return res.status(500).json({
          isValidInBody: false,
          error: 'AI API 키(GEMINI_API_KEY)가 서버 환경변수에 설정되어 있지 않습니다.',
          _debug: { serverLogs, elapsedMs: Date.now() - startTime, apiKeyConfigured: false },
        });
      }

      addLog('Gemini client initialized');
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
      addLog('Base64 cleaned', { mimeType, cleanLength: cleanBase64.length });

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

      try {
        let responseText = '';
        let successfulModel = '';
    const modelsToTry = [
      { name: 'gemini-2.5-flash', thinking: false },
      { name: 'gemini-3.7-flash', thinking: false },
      { name: 'gemini-3.6-flash', thinking: false },
      { name: 'gemini-flash-latest', thinking: false },
    ];
    const modelAttempts: Array<{ model: string; ok: boolean; error?: string }> = [];
    let lastErr: any = null;

    for (const { name: modelName, thinking } of modelsToTry) {
      addLog(`Attempting model ${modelName}`);
      try {
        const config: any = {
          responseMimeType: 'application/json',
          temperature: 0.1,
        };

        if (thinking) {
          config.thinkingConfig = { thinkingLevel: 'LOW' };
        }

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
          config,
        });

        responseText = response?.text || '';
        if (responseText && responseText.length > 5) {
          successfulModel = modelName;
          modelAttempts.push({ model: modelName, ok: true });
          addLog(`Model ${modelName} succeeded`, { responseLength: responseText.length });
          break;
        } else {
          modelAttempts.push({ model: modelName, ok: false, error: 'Empty text returned' });
          addLog(`Model ${modelName} returned empty text`);
        }
      } catch (mErr: any) {
        const errMsg = mErr?.message || String(mErr);
        addLog(`Model ${modelName} failed`, { error: errMsg });
        modelAttempts.push({ model: modelName, ok: false, error: errMsg });
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
          addLog('JSON parsed successfully', { keys: Object.keys(parsedData) });
        } catch {
          addLog('JSON.parse failed on cleanJson, trying regex substring match', { snippet: responseText.slice(0, 200) });
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0]);
              addLog('Regex matched JSON parsed successfully');
            } catch (err: any) {
              addLog('Regex JSON parse also failed', { err: String(err) });
              parsedData = {};
            }
          }
        }

        // Check if the AI explicitly determined this is NOT a valid InBody sheet
        if (parsedData.isValidInBody === false) {
          addLog('AI determined isValidInBody=false', { reason: parsedData.error });
          return res.json({
            isValidInBody: false,
            error:
              parsedData.error ||
              '인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 선명하게 보이도록 다시 촬영하거나 선택해주세요.',
            _debug: {
              serverLogs,
              successfulModel,
              modelAttempts,
              rawResponseText: responseText.slice(0, 1000),
              parsedData,
              elapsedMs: Date.now() - startTime,
            },
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

        // If weight wasn't found directly, attempt regex extraction from responseText
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

        addLog('Extracted core numbers', { weight, smm, bfm, pbf, height });

        // Rejection rule: If neither weight, smm, bfm, nor pbf was detected at all, this is likely an unrelated picture
        if (!weight && !smm && !bfm && !pbf) {
          addLog('All core metrics undefined, rejecting as invalid InBody');
          return res.json({
            isValidInBody: false,
            error: '인바디 결과지의 체중 및 체성분 수치를 인식할 수 없습니다. 밝은 조명에서 표 전체가 나오도록 다시 촬영해주세요.',
            _debug: {
              serverLogs,
              successfulModel,
              modelAttempts,
              rawResponseText: responseText.slice(0, 1000),
              parsedData,
              elapsedMs: Date.now() - startTime,
            },
          });
        }

        // If weight is missing but smm/pbf are present, estimate reasonable baseline
        if (!weight || weight < 20 || weight > 300) {
          weight = smm ? +(smm / 0.40).toFixed(1) : 70.0;
        }

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
          title: parsedData.title || `스윙짐 인바디 정밀 측정 (${parsedData.measuredDate || '최신'})`,
          summary: parsedData.summary || `체중 ${weight}kg, 골격근량 ${smmVal}kg, 체지방률 ${pbfVal}%로 측정되었습니다.`,
          dietTip: parsedData.dietTip || `기초대사량 ${bmrVal} kcal에 맞춘 영양 식단 관리를 권장합니다.`,
          workoutTip: parsedData.workoutTip || `골격근량 ${smmVal}kg 유지를 위한 근력 및 유산소 운동 루틴을 추천합니다.`,
          _debug: {
            serverLogs,
            successfulModel,
            modelAttempts,
            rawResponseText: responseText.slice(0, 1000),
            parsedData,
            elapsedMs: Date.now() - startTime,
          },
        };

        addLog('Returning sanitized result successfully', { elapsedMs: Date.now() - startTime });
        return res.json(sanitized);
      } catch (geminiErr: any) {
        addLog('Gemini OCR API error caught', { error: geminiErr?.message || String(geminiErr), stack: geminiErr?.stack });
        console.warn('Gemini OCR API error:', geminiErr);
        return res.status(500).json({
          isValidInBody: false,
          error: 'AI 인바디 분석 중 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          _debug: {
            serverLogs,
            errorMsg: geminiErr?.message || String(geminiErr),
            stack: geminiErr?.stack,
            elapsedMs: Date.now() - startTime,
          },
        });
      }
    } catch (err: any) {
      addLog('Server top-level error caught', { error: err?.message || String(err) });
      console.error('Error analyzing inbody:', err);
      return res.status(500).json({
        isValidInBody: false,
        error: '서버 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        _debug: {
          serverLogs,
          errorMsg: err?.message || String(err),
          elapsedMs: Date.now() - startTime,
        },
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
