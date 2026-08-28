import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InBodyRecord } from '../types';

interface ScanViewProps {
  onBack: () => void;
  onScanComplete: (record: InBodyRecord) => void;
  onOpenManualEntry: () => void;
}

const SAMPLE_SHEET_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9hmzBvqflxt8choX4PIXX1VQIWB6S2ThMebaQvRsx06HMVZwg0KQW5gDV3wu1ib5Lkg2m-4hxFC0NStqxRRiT-CzomjyjJyV3V05pzlUSDjpnRY7CRpUsREh6_LXGYxLLNpfTMa5T9g-5HcH5QKtRscm7MgoDGUl59JOK9ArZY1NTkOgAkPWo7ff_JMZfipdNVGSCV_3dtxXSLnGnXeeGNQ-U-Seyu6VTv7CNjpwx4XWxiS4xkck-dQ';

export const ScanView: React.FC<ScanViewProps> = ({
  onBack,
  onScanComplete,
  onOpenManualEntry,
}) => {
  const mainContainerRef = useRef<HTMLElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Dynamic input keys to guarantee fresh photo upload every single time
  const [fileInputKey, setFileInputKey] = useState<number>(() => Date.now());
  const [cameraInputKey, setCameraInputKey] = useState<number>(() => Date.now() + 1);

  // Camera & Device State
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraLabel, setCameraLabel] = useState('카메라 연결 중...');

  // Photo & Preview State (User inspects photo BEFORE running AI OCR)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [originalFullImage, setOriginalFullImage] = useState<string | null>(null);
  const [isCroppedView, setIsCroppedView] = useState(true);
  const [imageMeta, setImageMeta] = useState<{ width?: number; height?: number }>({});

  // Scan & Progress State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('인바디 결과지를 프레임 안에 맞춰주세요.');
  const [scannedResult, setScannedResult] = useState<InBodyRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showSamplePicker, setShowSamplePicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);

  // Live OCR Debugging & Diagnostics State
  interface DebugLogItem {
    id: string;
    time: string;
    type: 'info' | 'warn' | 'error' | 'success';
    title: string;
    detail?: any;
  }
  const [debugLogs, setDebugLogs] = useState<DebugLogItem[]>(() => [
    {
      id: 'init-1',
      time: new Date().toTimeString().slice(0, 8),
      type: 'info',
      title: 'OCR 디버그 로거 초기화 완료',
      detail: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight} (dpr: ${window.devicePixelRatio || 1})`,
        createImageBitmapSupported: typeof createImageBitmap !== 'undefined',
      },
    },
  ]);
  const [serverDebug, setServerDebug] = useState<any>(null);
  const [showDebugDrawer, setShowDebugDrawer] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const addDebugLog = useCallback(
    (type: 'info' | 'warn' | 'error' | 'success', title: string, detail?: any) => {
      const item: DebugLogItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: new Date().toTimeString().slice(0, 8),
        type,
        title,
        detail,
      };
      setDebugLogs((prev) => [item, ...prev.slice(0, 49)]);
      console.log(`[OCR Debug ${type.toUpperCase()}] ${item.time} - ${title}`, detail || '');
    },
    []
  );

  // Safely stop video stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start Camera with robust fallback strategy
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCurrentStream();
    setCameraError(null);
    setCameraLabel('카메라 연결 시도 중...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('현재 브라우저 환경에서 실시간 비디오 스트림이 지원되지 않습니다.');
      setCameraLabel('카메라 미지원');
      return;
    }

    let stream: MediaStream | null = null;

    // 1st attempt: ideal facing mode
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing === 'environment' ? { ideal: 'environment' } : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch {
      // 2nd attempt: generic facing
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
          },
          audio: false,
        });
      } catch {
        // 3rd attempt: any video stream (e.g. PC webcam)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err: any) {
          console.warn('Camera stream error:', err);
          const isPermissionDenied =
            err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
          setCameraError(
            isPermissionDenied
              ? '카메라 권한이 차단되었습니다. 브라우저 설정에서 카메라를 허용하거나 아래 [카메라 촬영] 버튼을 눌러주세요.'
              : '실시간 카메라 화면을 불러올 수 없습니다. 아래 [카메라 촬영] 또는 [갤러리] 버튼을 이용해주세요.'
          );
          setCameraLabel('카메라 접근 제한');
          return;
        }
      }
    }

    if (!stream) return;

    streamRef.current = stream;

    // Attach stream to video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Video play error:', playErr);
      }
    }

    setCameraActive(true);

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const trackSettings = videoTrack.getSettings?.() || {};
      const trackCaps = (videoTrack.getCapabilities?.() as any) || {};

      setTorchSupported(!!trackCaps.torch);
      const isEnv = trackSettings.facingMode === 'environment' || facing === 'environment';
      setCameraLabel(isEnv ? '후면 카메라 활성' : '전면/웹캠 활성');
    }
  }, [stopCurrentStream]);

  // Lifecycle: start on mount or facing change (only when not in preview/result)
  useEffect(() => {
    if (!previewImage && !scannedResult) {
      startCamera(cameraFacing);
    }

    return () => {
      stopCurrentStream();
    };
  }, [cameraFacing, previewImage, scannedResult, startCamera, stopCurrentStream]);

  // Handle Flashlight / Torch toggle
  const toggleFlash = async () => {
    const nextState = !flashOn;
    setFlashOn(nextState);

    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && torchSupported) {
        try {
          await (videoTrack as any).applyConstraints({
            advanced: [{ torch: nextState }],
          });
        } catch (err) {
          console.warn('Flashlight constraint error:', err);
        }
      }
    }
  };

  // Toggle between front/webcam and rear camera
  const toggleCameraFacing = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
  };

  // Helper: Compress and normalize smartphone photo into standard JPEG base64 & extract dimensions with EXIF orientation correction
  const compressImageFile = async (file: File): Promise<{ base64: string; width: number; height: number }> => {
    const maxDimension = 2400;
    addDebugLog('info', '이미지 압축 및 정규화 시작', {
      fileName: file.name,
      fileSizeKB: (file.size / 1024).toFixed(1) + ' KB',
      fileType: file.type,
    });

    // Method 1: Modern createImageBitmap with native EXIF orientation correction (iOS Safari, Android Chrome)
    if (typeof createImageBitmap !== 'undefined') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
        let width = bitmap.width;
        let height = bitmap.height;
        const origWidth = width;
        const origHeight = height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.92);
          if (typeof bitmap.close === 'function') bitmap.close();
          addDebugLog('success', 'createImageBitmap(EXIF보정) 변환 완료', {
            original: `${origWidth}x${origHeight}`,
            resized: `${width}x${height}`,
            payloadKB: (compressed.length / 1024).toFixed(1) + ' KB',
          });
          return { base64: compressed, width: origWidth, height: origHeight };
        }
      } catch (bitmapErr: any) {
        addDebugLog('warn', 'createImageBitmap 실패, Image Loader로 폴백', { error: String(bitmapErr?.message || bitmapErr) });
        console.warn('createImageBitmap with orientation failed, falling back to standard loader:', bitmapErr);
      }
    }

    // Method 2: Standard Image loading fallback
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const origWidth = width;
        const origHeight = height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.92);
          addDebugLog('success', 'Standard Image Canvas 변환 완료', {
            original: `${origWidth}x${origHeight}`,
            resized: `${width}x${height}`,
            payloadKB: (compressed.length / 1024).toFixed(1) + ' KB',
          });
          resolve({ base64: compressed, width: origWidth, height: origHeight });
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            const rawBase64 = (e.target?.result as string) || '';
            addDebugLog('warn', 'Canvas Context 불가, FileReader 직접 로드', { lengthKB: (rawBase64.length / 1024).toFixed(1) });
            resolve({
              base64: rawBase64,
              width: origWidth,
              height: origHeight,
            });
          };
          reader.onerror = () => {
            addDebugLog('error', 'FileReader 에러 발생');
            resolve({ base64: '', width: 0, height: 0 });
          };
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        addDebugLog('error', 'Image element 로드 실패, FileReader 시도');
        const reader = new FileReader();
        reader.onload = (e) =>
          resolve({ base64: (e.target?.result as string) || '', width: 0, height: 0 });
        reader.onerror = () => resolve({ base64: '', width: 0, height: 0 });
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  // Safe Native Camera & Gallery Triggers that guarantee fresh photo capture
  const openNativeCamera = () => {
    addDebugLog('info', '스마트폰 네이티브 카메라 트리거');
    setCameraInputKey(Date.now());
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 50);
    }
  };

  const openGallery = () => {
    addDebugLog('info', '스마트폰 갤러리 파일 선택기 트리거');
    setFileInputKey(Date.now());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
    }
  };

  // Helper to crop image to InBody aspect ratio (e.g. 1 : 1.35)
  const cropImageToInBodyRatio = (
    imageSrc: string
  ): Promise<{ croppedBase64: string; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const targetRatio = 1 / 1.35; // Standard InBody paper vertical aspect ratio

        let cropW = origW;
        let cropH = Math.round(origW / targetRatio);

        if (cropH > origH) {
          cropH = origH;
          cropW = Math.round(origH * targetRatio);
        }

        const cropX = Math.max(0, Math.round((origW - cropW) / 2));
        const cropY = Math.max(0, Math.round((origH - cropH) / 2));

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          resolve({
            croppedBase64: canvas.toDataURL('image/jpeg', 0.92),
            width: cropW,
            height: cropH,
          });
          return;
        }
        resolve({ croppedBase64: imageSrc, width: origW, height: origH });
      };
      img.onerror = () => {
        resolve({ croppedBase64: imageSrc, width: 0, height: 0 });
      };
      img.src = imageSrc;
    });
  };

  // Handle Smartphone Camera / Gallery file upload -> Enters Preview Mode for verification!
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addDebugLog('info', '사용자가 사진을 선택/촬영함', { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });
    setScanError(null);
    stopCurrentStream();

    try {
      const result = await compressImageFile(file);
      if (!result.base64) {
        addDebugLog('error', '이미지 Base64 변환 결과 비어있음');
        setScanError('이미지 파일을 읽을 수 없습니다. 다시 촬영해주세요.');
        return;
      }

      setOriginalFullImage(result.base64);
      // Default to FULL original image so no InBody tables or metrics are cut off
      setPreviewImage(result.base64);
      setImageMeta({
        width: result.width,
        height: result.height,
      });
      setIsCroppedView(false);
      setShowSamplePicker(false);
      addDebugLog('success', '미리보기 화면 진입 (전체 이미지 모드)', { width: result.width, height: result.height });
    } catch (err) {
      addDebugLog('error', '이미지 처리 예외 발생', { err: String(err) });
      console.warn('Image processing error:', err);
      setScanError('이미지 처리 중 문제가 발생했습니다. 다른 사진으로 시도해주세요.');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Capture live video frame -> CROPS PRECISELY to the Blue Alignment Reticle Frame!
  const captureCameraFrame = () => {
    if (
      videoRef.current &&
      mainContainerRef.current &&
      reticleRef.current &&
      cameraActive &&
      videoRef.current.videoWidth > 100
    ) {
      try {
        const video = videoRef.current;
        const container = mainContainerRef.current;
        const reticle = reticleRef.current;

        const containerRect = container.getBoundingClientRect();
        const reticleRect = reticle.getBoundingClientRect();

        const cWidth = containerRect.width;
        const cHeight = containerRect.height;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        // The video is styled with "object-cover absolute inset-0 w-full h-full"
        const scale = Math.max(cWidth / vWidth, cHeight / vHeight);
        const renderedWidth = vWidth * scale;
        const renderedHeight = vHeight * scale;

        const offsetX = (cWidth - renderedWidth) / 2;
        const offsetY = (cHeight - renderedHeight) / 2;

        // Position of the blue reticle frame relative to container
        const rLeft = reticleRect.left - containerRect.left;
        const rTop = reticleRect.top - containerRect.top;
        const rWidth = reticleRect.width;
        const rHeight = reticleRect.height;

        // Position of reticle relative to the rendered video coordinate space
        const cropXOnRendered = rLeft - offsetX;
        const cropYOnRendered = rTop - offsetY;

        // Map back into native video pixel coordinates
        let sx = cropXOnRendered / scale;
        let sy = cropYOnRendered / scale;
        let sWidth = rWidth / scale;
        let sHeight = rHeight / scale;

        // Add a gentle 2% margin so edges of the InBody result sheet are not accidentally clipped
        const padX = sWidth * 0.02;
        const padY = sHeight * 0.02;
        sx = Math.max(0, sx - padX);
        sy = Math.max(0, sy - padY);
        sWidth = Math.min(vWidth - sx, sWidth + padX * 2);
        sHeight = Math.min(vHeight - sy, sHeight + padY * 2);

        // Render full image for toggle fallback
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = vWidth;
        fullCanvas.height = vHeight;
        const fullCtx = fullCanvas.getContext('2d');
        let fullBase64 = '';
        if (fullCtx) {
          fullCtx.drawImage(video, 0, 0, vWidth, vHeight);
          fullBase64 = fullCanvas.toDataURL('image/jpeg', 0.88);
          setOriginalFullImage(fullBase64);
        }

        // Render CROPPED frame canvas (exactly the blue guide box)
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.round(sWidth);
        cropCanvas.height = Math.round(sHeight);
        const cropCtx = cropCanvas.getContext('2d');

        if (cropCtx) {
          cropCtx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, cropCanvas.width, cropCanvas.height);
          const croppedBase64 = cropCanvas.toDataURL('image/jpeg', 0.94);
          stopCurrentStream();
          setPreviewImage(croppedBase64);
          setIsCroppedView(true);
          setImageMeta({ width: cropCanvas.width, height: cropCanvas.height });
          addDebugLog('success', '실시간 비디오 프레임 가이드 영역 캡처 성공', {
            cropSize: `${cropCanvas.width}x${cropCanvas.height}`,
            payloadKB: (croppedBase64.length / 1024).toFixed(1) + ' KB',
          });
          return;
        }
      } catch (e) {
        addDebugLog('warn', '실시간 프레임 크롭 실패, 네이티브 카메라 오픈', { error: String(e) });
        console.warn('Live frame crop error:', e);
      }
    }

    // If live camera stream is not available or failed, open native smartphone camera
    openNativeCamera();
  };

  // AI & OCR Scan Analysis (Starts when user presses the Start OCR button in preview)
  const triggerScanAnalysis = async (customImageBase64?: string, presetData?: any) => {
    const imageToAnalyze = customImageBase64 || previewImage;

    if (!imageToAnalyze && !presetData) {
      addDebugLog('error', '분석할 이미지 없음');
      setScanError('분석할 인바디 결과지 이미지가 없습니다. 사진을 먼저 촬영해주세요.');
      return;
    }

    setIsScanning(true);
    setScannedResult(null);
    setScanError(null);
    setIsEditingMetrics(false);
    setScanProgress(15);
    setScanStatusText('🔍 AI가 인바디 결과지의 표와 수치를 분석하고 있습니다...');

    addDebugLog('info', 'AI OCR 분석 요청 개시', {
      hasPreset: !!presetData,
      imageLengthKB: imageToAnalyze ? (imageToAnalyze.length / 1024).toFixed(1) + ' KB' : '0 KB',
      isCroppedView,
    });

    // Simulated animated progress phases to ensure clear feedback during the 8-12s analysis
    let progressTimer: NodeJS.Timeout | null = null;
    let step = 0;
    const steps = [
      { p: 30, text: '🔍 AI가 인바디 결과지의 표와 수치를 분석하고 있습니다...' },
      { p: 55, text: '⚡ 체중, 골격근량, 체지방률 지표 정밀 OCR 판독 중...' },
      { p: 75, text: '🧠 Gemini Vision AI 체성분 지표 교차 검증 중...' },
      { p: 90, text: '✨ 인바디 정밀 분석 리포트 생성 중...' },
    ];

    progressTimer = setInterval(() => {
      if (step < steps.length) {
        setScanProgress(steps[step].p);
        setScanStatusText(steps[step].text);
        step++;
      }
    }, 2200);

    try {
      if (presetData) {
        setTimeout(() => {
          if (progressTimer) clearInterval(progressTimer);
          const record = createRecordFromParsed(presetData);
          setScanProgress(100);
          setIsScanning(false);
          setScannedResult(record);
          addDebugLog('success', '프리셋 인바디 데이터 적용 완료', { weight: record.weight, smm: record.skeletalMuscleMass });
        }, 600);
        return;
      }

      if (imageToAnalyze) {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000);

          const endpointUrl = `${window.location.origin}/api/analyze-inbody`;
          addDebugLog('info', `POST ${endpointUrl} 서버 요청 발송`, {
            origin: window.location.origin,
            timeout: '55s',
            payloadSizeKB: (imageToAnalyze.length / 1024).toFixed(1) + ' KB',
          });

          const res = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ imageBase64: imageToAnalyze }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (progressTimer) clearInterval(progressTimer);

          const elapsed = Date.now() - startTime;
          const rawResponseText = await res.text().catch(() => '');
          let parsed: any = {};

          try {
            parsed = JSON.parse(rawResponseText);
          } catch (jsonErr: any) {
            addDebugLog('error', `서버 응답 JSON 파싱 실패 (HTTP ${res.status})`, {
              status: res.status,
              statusText: res.statusText,
              rawSnippet: rawResponseText.slice(0, 300),
              jsonErr: String(jsonErr),
            });
          }

          if (parsed._debug) {
            setServerDebug(parsed._debug);
          }

          addDebugLog(
            res.ok && parsed.isValidInBody !== false && typeof parsed.weight === 'number'
              ? 'success'
              : 'warn',
            `서버 응답 수신 (HTTP ${res.status}, ${elapsed}ms)`,
            {
              status: res.status,
              isValidInBody: parsed.isValidInBody,
              extractedWeight: parsed.weight,
              extractedSmm: parsed.skeletalMuscleMass,
              extractedPbf: parsed.bodyFatPercentage,
              usedModel: parsed._debug?.successfulModel,
              error: parsed.error || (res.status === 405 ? 'HTTP 405 Method Not Allowed' : undefined),
            }
          );

          if (res.ok && parsed && parsed.isValidInBody !== false && typeof parsed.weight === 'number' && parsed.weight > 0) {
            setScanProgress(100);
            const record = createRecordFromParsed(parsed, imageToAnalyze);
            setIsScanning(false);
            setScannedResult(record);
            addDebugLog('success', '인바디 수치 정상 인식 및 화면 렌더링 완료', {
              recordSummary: `${record.measuredDate} | 체중: ${record.weight}kg | 골격근: ${record.skeletalMuscleMass}kg | 체지방: ${record.bodyFatPercentage}%`,
            });
            return;
          }

          // If the AI flagged it as not a valid InBody sheet or OCR failed to read metrics:
          setIsScanning(false);
          let errorMsg = parsed?.error;
          if (!errorMsg) {
            if (res.status === 405) {
              const currentOrigin = window.location.origin;
              if (currentOrigin.includes('vercel.app')) {
                errorMsg =
                  'Vercel 배포 환경에서 API 라우트(/api/analyze-inbody)가 구성되지 않아 405 에러가 발생했습니다. AI Studio 원본 주소에서 접속하시거나 Vercel 설정을 확인해주세요.';
              } else {
                errorMsg = '모바일 웹뷰에서 API 접근이 제한되었습니다 (HTTP 405). 잠시 후 다시 시도해주세요.';
              }
            } else if (res.status === 500) {
              errorMsg = '서버 AI 분석 중 일시적 오류가 발생했습니다. 다시 시도해주세요.';
            } else {
              errorMsg = '인바디 결과지가 인식되지 않았습니다. 체중, 골격근량, 체지방률 표가 선명하게 보이도록 다시 촬영하거나 선택해주세요.';
            }
          }

          addDebugLog('error', '인바디 검증/인식 실패 (모달 노출)', {
            httpStatus: res.status,
            errorMsg,
            serverDebugData: parsed._debug,
          });
          setScanError(errorMsg);
          return;
        } catch (fetchErr: any) {
          console.warn('OCR fetch error or timeout:', fetchErr);
          if (progressTimer) clearInterval(progressTimer);
          setIsScanning(false);
          addDebugLog('error', '네트워크 통신 오류 / 타임아웃 발생', {
            name: fetchErr?.name,
            message: fetchErr?.message,
          });
          setScanError(
            fetchErr?.name === 'AbortError'
              ? '인바디 분석 응답 시간(55초)이 초과되었습니다. 사진을 다시 첨부하거나 직접 수치를 입력해주세요.'
              : '인바디 분석 중 통신 지연이 발생했습니다. 다시 촬영하시거나 직접 수치를 입력해주세요.'
          );
          return;
        }
      }

      if (progressTimer) clearInterval(progressTimer);
      setIsScanning(false);
      setScanError('인바디 결과지 이미지를 촬영하거나 업로드해주세요.');
    } catch (outerErr: any) {
      if (progressTimer) clearInterval(progressTimer);
      setIsScanning(false);
      addDebugLog('error', '최상위 스캔 에러 발생', { err: String(outerErr) });
      setScanError('인바디 결과지 양식이 아닙니다. 정확한 인바디 결과지를 스캔해주세요.');
    }
  };

  const createRecordFromParsed = (data: any, imageUrl?: string): InBodyRecord => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const weight = data.weight !== undefined && !isNaN(Number(data.weight)) ? Number(data.weight) : 70.0;
    const pbf = data.bodyFatPercentage !== undefined && !isNaN(Number(data.bodyFatPercentage)) ? Number(data.bodyFatPercentage) : 25.0;
    const bfm = data.bodyFatMass !== undefined && !isNaN(Number(data.bodyFatMass)) ? Number(data.bodyFatMass) : +(weight * (pbf / 100)).toFixed(1);
    const smm = data.skeletalMuscleMass !== undefined && !isNaN(Number(data.skeletalMuscleMass)) ? Number(data.skeletalMuscleMass) : +(weight * 0.42).toFixed(1);
    const height = data.height !== undefined && !isNaN(Number(data.height)) ? Number(data.height) : 170;
    const heightM = height / 100;
    const bmi = data.bmi !== undefined && !isNaN(Number(data.bmi)) ? Number(data.bmi) : +(weight / (heightM * heightM)).toFixed(1);
    const ffm = data.fatFreeMass !== undefined && !isNaN(Number(data.fatFreeMass)) ? Number(data.fatFreeMass) : +(weight - bfm).toFixed(1);
    const bmr = data.bmr !== undefined && !isNaN(Number(data.bmr)) ? Number(data.bmr) : Math.round(370 + 21.6 * ffm);
    const visceral = data.visceralFatLevel !== undefined && !isNaN(Number(data.visceralFatLevel)) ? Number(data.visceralFatLevel) : (pbf > 30 ? 9 : pbf > 25 ? 7 : 5);
    const tbw = data.totalBodyWater !== undefined && !isNaN(Number(data.totalBodyWater)) ? Number(data.totalBodyWater) : +(ffm * 0.73).toFixed(1);
    const protein = data.protein !== undefined && !isNaN(Number(data.protein)) ? Number(data.protein) : +(ffm * 0.2).toFixed(1);
    const mineral = data.mineral !== undefined && !isNaN(Number(data.mineral)) ? Number(data.mineral) : +(ffm * 0.065).toFixed(2);
    const whr = data.waistHipRatio !== undefined && !isNaN(Number(data.waistHipRatio)) ? Number(data.waistHipRatio) : 0.88;
    const muscleCtrl = data.muscleControl !== undefined && !isNaN(Number(data.muscleControl)) ? Number(data.muscleControl) : 0.0;
    const fatCtrl = data.fatControl !== undefined && !isNaN(Number(data.fatControl)) ? Number(data.fatControl) : (pbf > 22 ? -+(bfm - weight * 0.18).toFixed(1) : 0.0);
    const score = data.inBodyScore !== undefined && !isNaN(Number(data.inBodyScore)) ? Number(data.inBodyScore) : Math.min(95, Math.max(50, Math.round(80 - (pbf - 20) * 1.2 + (smm / weight - 0.4) * 40)));

    // Date normalization
    let dateStr = `${yyyy}-${mm}-${dd}`;
    let displayDateStr = `${yyyy}.${mm}.${dd}`;
    if (data.measuredDate) {
      const clean = String(data.measuredDate).replace(/년|월/g, '.').replace(/일/g, '').replace(/[^0-9.]/g, '');
      const parts = clean.split('.').filter(Boolean);
      if (parts.length >= 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
        displayDateStr = `${y}.${m}.${d}`;
      } else {
        dateStr = String(data.measuredDate).replace(/\./g, '-');
        displayDateStr = String(data.measuredDate);
      }
    }

    return {
      id: `rec-${Date.now()}`,
      date: dateStr,
      displayDate: displayDateStr,
      title: data.title || `스윙짐 인바디 정밀 측정 (${displayDateStr})`,
      weight,
      weightDelta: 0,
      skeletalMuscleMass: smm,
      skeletalMuscleDelta: 0,
      bodyFatMass: bfm,
      bodyFatMassDelta: 0,
      bodyFatPercentage: pbf,
      bodyFatPercentageDelta: 0,
      bmi,
      bmr,
      visceralFatLevel: visceral,
      totalBodyWater: tbw,
      fatFreeMass: ffm,
      protein,
      mineral,
      waistHipRatio: whr,
      muscleControl: muscleCtrl,
      fatControl: fatCtrl,
      inBodyScore: score,
      height: data.height || 162,
      age: data.age || 50,
      gender: data.gender || 'male',
      centerName: data.centerName || 'SWING GYM',
      imageUrl: imageUrl || SAMPLE_SHEET_BG,
      notes: '스윙짐 AI 정밀 스캐너를 통해 자동 추출된 인바디 리포트입니다.',
      aiFeedback: {
        evaluation: (pbf <= 20 ? 'excellent' : pbf <= 28 ? 'good' : pbf <= 33 ? 'average' : 'attention') as 'excellent' | 'good' | 'average' | 'attention',
        summary:
          data.summary ||
          `체중 ${weight}kg, 골격근량 ${smm}kg, 체지방량 ${bfm}kg(체지방률 ${pbf}%), 복부지방률 ${whr}입니다. 골격근량이 튼튼하여 체지방 ${Math.abs(fatCtrl)}kg 감량 관리가 권장됩니다.`,
        dietTip:
          data.dietTip ||
          `기초대사량 ${bmr} kcal를 고려하여 하루 1,600 kcal 균형 잡힌 고단백 영양 식단을 권장합니다.`,
        workoutTip:
          data.workoutTip ||
          `골격근량 유지를 위해 스쿼트, 데드리프트 등 주 3~4회 근력 운동과 유산소 운동 병행을 추천합니다.`,
      },
    };
  };

  const handleUpdateScannedMetric = (field: keyof InBodyRecord, value: string) => {
    if (!scannedResult) return;
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;

    setScannedResult((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: numVal };

      // Auto-recalculate BMI and BodyFatMass if Weight or PBF changes
      if (field === 'weight' || field === 'bodyFatPercentage') {
        const w = field === 'weight' ? numVal : updated.weight;
        const pbf = field === 'bodyFatPercentage' ? numVal : updated.bodyFatPercentage;
        const bfm = +(w * (pbf / 100)).toFixed(1);
        const heightM = (updated.height || 162) / 100;
        const bmi = +(w / (heightM * heightM)).toFixed(1);
        const ffm = +(w - bfm).toFixed(1);

        return {
          ...updated,
          bodyFatMass: bfm,
          bmi,
          fatFreeMass: ffm,
        };
      }
      return updated;
    });
  };

  // Retake photo or reset preview
  const handleRetakePhoto = () => {
    setPreviewImage(null);
    setOriginalFullImage(null);
    setIsCroppedView(true);
    setImageMeta({});
    setScannedResult(null);
    setScanError(null);
    setIsScanning(false);
    setScanProgress(0);
    setScanStatusText('인바디 결과지를 프레임 안에 맞춰주세요.');
    startCamera(cameraFacing);
  };

  // Sample Preset InBody Sheets for Fast Instant Testing
  const samplePresets = [
    {
      id: 'p1',
      name: '체중 79.0kg / 골격근 30.6kg (표준 샘플)',
      data: {
        weight: 79.0,
        skeletalMuscleMass: 30.6,
        bodyFatMass: 24.9,
        bodyFatPercentage: 31.6,
        bmi: 30.1,
        bmr: 1538,
        visceralFatLevel: 9,
        totalBodyWater: 39.7,
        protein: 10.9,
        mineral: 3.52,
        waistHipRatio: 0.93,
        fatControl: -15.4,
        inBodyScore: 70,
        title: '정밀 스캔 분석 (2025.09.01)',
      },
    },
    {
      id: 'p2',
      name: '체중 73.2kg / 골격근 33.5kg (운동인 샘플)',
      data: {
        weight: 73.2,
        skeletalMuscleMass: 33.5,
        bodyFatMass: 13.8,
        bodyFatPercentage: 18.9,
        bmi: 24.2,
        bmr: 1690,
        visceralFatLevel: 5,
        totalBodyWater: 43.5,
        protein: 11.8,
        mineral: 4.1,
        waistHipRatio: 0.84,
        fatControl: -2.0,
        inBodyScore: 86,
        title: '정밀 스캔 분석 (InBody 770)',
      },
    },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] md:h-[760px] md:max-w-2xl md:mx-auto bg-[#0A0B0E] overflow-hidden flex flex-col justify-between md:rounded-3xl md:border md:border-[#2A2D35] md:shadow-2xl">
      {/* Hidden File Inputs with dynamic keys ensuring fresh camera/photo capture */}
      <input
        key={`file-${fileInputKey}`}
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        key={`cam-${cameraInputKey}`}
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Screen Flashlight Effect */}
      {flashOn && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none z-30 transition-opacity duration-200" />
      )}

      {/* Header Bar */}
      <header className="relative z-20 flex justify-between items-center px-4 py-3 bg-[#0A0B0E]/85 backdrop-blur-md border-b border-[#2A2D35]/60 shrink-0">
        <button
          onClick={previewImage && !scannedResult ? handleRetakePhoto : onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#12141C] border border-[#2A2D35] text-[#E2E4E9] hover:bg-[#1A1D26] active:scale-95 transition-all shadow-md"
          title={previewImage && !scannedResult ? '다시 촬영' : '뒤로 가기'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {previewImage && !scannedResult ? 'arrow_back' : 'arrow_back'}
          </span>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#E2E4E9]">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
            <span>
              {scannedResult
                ? '인바디 분석 완료'
                : previewImage
                ? '결과지 프레임 영역 확인'
                : 'AI 인바디 스마트 스캐너'}
            </span>
          </div>
          <span className="text-[10px] text-[#9CA3AF] font-mono">
            {previewImage ? (isCroppedView ? '프레임 맞춤 영역' : '원본 전체 사진') : cameraLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Live Debug Logs Button */}
          <button
            onClick={() => setShowDebugDrawer(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1E222D] border border-[#3B82F6]/50 text-[#60A5FA] hover:bg-[#262B39] active:scale-95 transition-all shadow-md text-xs font-bold"
            title="실시간 OCR 디버그 로그 및 기기 상태 확인"
          >
            <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">terminal</span>
            <span className="hidden sm:inline">디버그</span>
            <span className="px-1.5 py-0.2 bg-[#3B82F6] text-white text-[10px] rounded-full font-mono">
              {debugLogs.length}
            </span>
          </button>

          {!previewImage && !scannedResult && (
            <>
              {/* Flash Toggle */}
              <button
                onClick={toggleFlash}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all shadow-md active:scale-95 ${
                  flashOn
                    ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-amber-500/30'
                    : 'bg-[#12141C] text-[#E2E4E9] border-[#2A2D35] hover:bg-[#1A1D26]'
                }`}
                title="플래시 조명 토글"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {flashOn ? 'flash_on' : 'flash_off'}
                </span>
              </button>

              {/* Camera Switch */}
              <button
                onClick={toggleCameraFacing}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#12141C] border border-[#2A2D35] text-[#E2E4E9] hover:bg-[#1A1D26] active:scale-95 transition-all shadow-md"
                title="전면/후면/웹캠 전환"
              >
                <span className="material-symbols-outlined text-[18px]">cameraswitch</span>
              </button>
            </>
          )}

          {/* Help Guide */}
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#12141C] border border-[#2A2D35] text-[#E2E4E9] hover:bg-[#1A1D26] active:scale-95 transition-all shadow-md"
            title="스캔 도움말"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
          </button>
        </div>
      </header>

      {/* Main Surface Area */}
      <main
        ref={mainContainerRef}
        className="relative flex-1 w-full bg-[#050608] flex items-center justify-center overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* VIEW 1: Live Viewfinder / Camera Screen (Before taking photo)            */}
        {/* ========================================================================= */}
        {!previewImage && !scannedResult && (
          <>
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Fallback background when camera is off/permission pending */}
            {!cameraActive && (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center opacity-30 mix-blend-luminosity"
                style={{
                  backgroundImage: `url('${SAMPLE_SHEET_BG}')`,
                }}
              />
            )}

            {/* Camera Permission / Error Notification banner */}
            {cameraError && (
              <div className="absolute top-12 z-20 px-4 w-full max-w-sm">
                <div className="bg-[#12141C]/95 border border-[#F59E0B]/50 p-4 rounded-2xl backdrop-blur-md shadow-2xl text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-[#F59E0B] font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px]">videocam_off</span>
                    <span>카메라 안내</span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={openNativeCamera}
                      className="w-full py-2.5 px-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      스마트폰 카메라로 바로 촬영
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={openGallery}
                        className="flex-1 py-2 px-3 bg-[#1E222D] hover:bg-[#262B39] text-[#60A5FA] font-bold text-xs rounded-xl transition-all border border-[#2A2D35] active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">photo_library</span>
                        갤러리 사진 선택
                      </button>
                      <button
                        onClick={() => startCamera(cameraFacing)}
                        className="flex-1 py-2 px-3 bg-[#1E222D] hover:bg-[#262B39] text-[#9CA3AF] hover:text-[#E2E4E9] font-medium text-xs rounded-xl transition-all border border-[#2A2D35] active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        웹캠 다시 시도
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Viewfinder Overlay Guide */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between items-center p-4 sm:p-6">
              {/* Instruction Banner */}
              <div className="bg-[#12141C]/95 backdrop-blur-md px-5 py-2 rounded-2xl shadow-xl border border-[#2A2D35] max-w-sm text-center">
                <p className="text-xs font-semibold text-[#60A5FA]">
                  {scanStatusText}
                </p>
              </div>

              {/* Alignment Reticle (Target Crop Area) */}
              <div
                ref={reticleRef}
                className="w-full max-w-xs sm:max-w-sm aspect-[1/1.35] border-2 border-[#3B82F6]/60 rounded-2xl relative overflow-hidden bg-[#3B82F6]/5 backdrop-blur-[1px] shadow-2xl"
              >
                {/* Corner Guides */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#3B82F6] rounded-tl-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#3B82F6] rounded-tr-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#3B82F6] rounded-bl-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#3B82F6] rounded-br-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />

                {/* Scanning Line Animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#60A5FA] to-transparent opacity-90 animate-scan shadow-[0_0_12px_rgba(59,130,246,1)]" />

                {/* Center Document Scanner Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-50">
                  <span className="material-symbols-outlined text-4xl text-[#60A5FA]">
                    document_scanner
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] font-medium">인바디 결과지 영역</span>
                </div>
              </div>

              {/* Spacer */}
              <div className="h-24 w-full" />
            </div>

            {/* Camera Controls Bar */}
            <div className="absolute bottom-6 left-0 w-full z-20 flex justify-between items-center px-6 sm:px-14">
              {/* Gallery / Presets Button */}
              <button
                onClick={() => setShowSamplePicker(true)}
                className="flex flex-col items-center gap-1 text-[#E2E4E9] bg-[#12141C]/90 border border-[#2A2D35] backdrop-blur-md p-3 rounded-2xl hover:bg-[#1A1D26] active:scale-95 transition-all shadow-lg pointer-events-auto"
                title="갤러리 사진 / 샘플 선택"
              >
                <span className="material-symbols-outlined text-[26px] text-[#60A5FA]">
                  photo_library
                </span>
                <span className="text-xs font-medium">갤러리</span>
              </button>

              {/* Center Shutter Button (Takes photo and CROPS PRECISELY to the blue reticle frame) */}
              <button
                onClick={captureCameraFrame}
                className="w-20 h-20 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full border-4 border-[#2A2D35] shadow-2xl shadow-blue-500/30 flex items-center justify-center active:scale-90 hover:from-[#2563EB] hover:to-[#7C3AED] transition-all group pointer-events-auto"
                title="가이드 영역 촬영하기"
                aria-label="가이드 영역 촬영하기"
              >
                <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <span className="material-symbols-outlined text-white text-3xl">
                    photo_camera
                  </span>
                </div>
              </button>

              {/* Direct Phone Native Camera Button */}
              <button
                onClick={openNativeCamera}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-[#12141C]/90 text-[#E2E4E9] border border-[#2A2D35] hover:bg-[#1A1D26] backdrop-blur-md active:scale-95 transition-all shadow-lg pointer-events-auto"
                title="스마트폰 고화질 카메라 촬영"
              >
                <span className="material-symbols-outlined text-[26px] text-[#34D399]">
                  camera
                </span>
                <span className="text-xs font-medium">카메라</span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: Photo Preview & Verification Screen (Before OCR Trigger)         */}
        {/* ========================================================================= */}
        {previewImage && !scannedResult && !isScanning && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-[#0A0B0E] p-3 sm:p-4 overflow-y-auto">
            {/* Top Guide Banner */}
            <div className="bg-[#12141C] border border-[#3B82F6]/40 p-3 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
                  <span className="material-symbols-outlined text-[18px]">crop_free</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E2E4E9]">
                    {isCroppedView ? '프레임 맞춤 영역 검토' : '원본 전체 이미지 검토'}
                  </h4>
                  <p className="text-[10px] text-[#9CA3AF]">
                    인바디 결과지 글자와 표가 선명하게 보이는지 확인하세요
                  </p>
                </div>
              </div>
              {imageMeta.width && (
                <span className="text-[10px] font-mono text-[#60A5FA] bg-[#1E222D] px-2 py-0.5 rounded-md border border-[#2A2D35]">
                  {imageMeta.width}×{imageMeta.height}
                </span>
              )}
            </div>

            {/* Toggle between Cropped Frame Area & Full Image (if full image exists) */}
            {originalFullImage && (
              <div className="flex items-center gap-1.5 bg-[#12141C] p-1 rounded-xl border border-[#2A2D35] my-1.5">
                <button
                  onClick={async () => {
                    setIsCroppedView(true);
                    const cropRes = await cropImageToInBodyRatio(originalFullImage);
                    setPreviewImage(cropRes.croppedBase64);
                    setImageMeta({ width: cropRes.width, height: cropRes.height });
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    isCroppedView
                      ? 'bg-[#3B82F6] text-white shadow-md'
                      : 'text-[#9CA3AF] hover:text-[#E2E4E9]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">crop</span>
                  가이드 프레임 영역 (권장)
                </button>
                <button
                  onClick={() => {
                    setIsCroppedView(false);
                    setPreviewImage(originalFullImage);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    !isCroppedView
                      ? 'bg-[#3B82F6] text-white shadow-md'
                      : 'text-[#9CA3AF] hover:text-[#E2E4E9]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                  원본 전체 보기
                </button>
              </div>
            )}

            {/* Photo Preview Container */}
            <div className="relative my-2 flex-1 min-h-[250px] max-h-[380px] bg-[#050608] rounded-2xl border-2 border-[#3B82F6]/40 overflow-hidden flex items-center justify-center shadow-inner group">
              <img
                src={previewImage}
                alt="촬영된 인바디 결과지 프레임 미리보기"
                className="w-full h-full object-contain"
              />

              {/* Target Scan Corner Overlay */}
              <div className="absolute inset-2 border border-[#3B82F6]/20 rounded-xl pointer-events-none" />
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#60A5FA] pointer-events-none" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#60A5FA] pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#60A5FA] pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#60A5FA] pointer-events-none" />

              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-[10px] text-[#60A5FA] font-bold px-2 py-1 rounded-md border border-[#2A2D35]">
                {isCroppedView ? '📐 가이드 프레임 추출본' : '🖼️ 원본 전체'}
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="bg-[#12141C] border border-[#2A2D35] p-2.5 rounded-2xl space-y-1 text-[11px] mb-2">
              <div className="flex items-center gap-2 text-[#34D399] font-semibold">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>체중, 골격근량, 체지방률 숫자가 선명하게 보이나요?</span>
              </div>
              <div className="flex items-center gap-2 text-[#34D399] font-semibold">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>결과지 표 영역이 잘리지 않고 온전히 포함되었나요?</span>
              </div>
            </div>

            {/* Action Buttons: Start OCR vs Retake */}
            <div className="space-y-2 shrink-0">
              {/* PRIMARY ACTION: Start AI OCR Analysis */}
              <button
                onClick={() => triggerScanAnalysis(previewImage)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                이 사진으로 AI 정밀 수치 분석 시작 (OCR)
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleRetakePhoto}
                  className="flex-1 py-2.5 px-3 bg-[#1E222D] hover:bg-[#262B39] border border-[#2A2D35] text-[#E2E4E9] font-semibold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  다시 촬영하기
                </button>

                <button
                  onClick={openGallery}
                  className="flex-1 py-2.5 px-3 bg-[#1E222D] hover:bg-[#262B39] border border-[#2A2D35] text-[#60A5FA] font-semibold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_library</span>
                  다른 사진 선택
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: AI Scanning Progress Overlay (Active during 8-12s analysis)      */}
        {/* ========================================================================= */}
        {isScanning && (
          <div className="absolute inset-0 z-40 bg-[#0A0B0E]/95 backdrop-blur-md flex flex-col items-center justify-center text-white gap-4 p-6 text-center animate-in fade-in duration-200">
            {/* Background image preview with blur */}
            {previewImage && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15 blur-sm"
                style={{ backgroundImage: `url('${previewImage}')` }}
              />
            )}

            <div className="relative z-10">
              <div className="w-16 h-16 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin shadow-xl shadow-blue-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-[#60A5FA]">{scanProgress}%</span>
              </div>
            </div>

            <div className="relative z-10 space-y-2 max-w-[280px]">
              <h3 className="text-sm font-bold text-[#E2E4E9]">
                AI가 인바디 결과지의 표와 수치를 분석하고 있습니다...
              </h3>
              <p className="text-xs text-[#9CA3AF] animate-pulse">
                {scanStatusText}
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="relative z-10 w-full max-w-[220px] h-2 bg-[#161822] rounded-full overflow-hidden border border-[#2A2D35]">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(12, scanProgress)}%` }}
              />
            </div>

            <p className="relative z-10 text-[10px] text-[#6B7280]">
              Gemini Vision OCR 엔진이 결과지 표를 판독 중입니다 (약 8~10초 소요)
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: Invalid Scan / Error Modal                                       */}
        {/* ========================================================================= */}
        {scanError && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#12141C] border border-[#EF4444]/40 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative">
              <button
                onClick={() => {
                  setScanError(null);
                  setIsScanning(false);
                }}
                className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white p-1 rounded-lg transition-colors"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] shrink-0">
                  <span className="material-symbols-outlined text-[28px]">document_scanner</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#E2E4E9]">
                    정확한 인바디를 스캔해주세요
                  </h3>
                  <p className="text-xs text-[#EF4444] font-medium mt-0.5">
                    인바디 결과지 양식 인식 안내
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#161822] rounded-2xl border border-[#2A2D35] space-y-2.5 text-xs text-[#9CA3AF] leading-relaxed">
                <p className="text-[#EF4444] font-bold">{scanError}</p>

                {/* Quick Diagnostic Preview */}
                <div className="p-2.5 bg-[#0A0B0E] rounded-xl border border-[#EF4444]/30 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-[#E2E4E9]">
                    <span className="text-[#9CA3AF]">진단 상태:</span>
                    <span className="text-[#EF4444] font-bold">인식 실패 / 양식 불일치</span>
                  </div>
                  {serverDebug?.successfulModel && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9CA3AF]">응답 모델:</span>
                      <span className="text-[#60A5FA]">{serverDebug.successfulModel}</span>
                    </div>
                  )}
                  {serverDebug?.elapsedMs && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9CA3AF]">처리 시간:</span>
                      <span className="text-[#9CA3AF]">{(serverDebug.elapsedMs / 1000).toFixed(2)}초</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDebugDrawer(true)}
                    className="w-full mt-2 py-1.5 px-2.5 bg-[#1E222D] hover:bg-[#262B39] text-[#60A5FA] border border-[#3B82F6]/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">bug_report</span>
                    상세 디버그 로그 및 서버 판독 기록 보기 ({debugLogs.length}건)
                  </button>
                </div>

                <ul className="list-disc list-inside text-[11px] space-y-1 text-[#9CA3AF] pt-1 border-t border-[#2A2D35]/60">
                  <li>인바디(InBody) 또는 체성분 검사 결과지 전체를 촬영해주세요.</li>
                  <li>체중, 골격근량, 체지방률 표가 선명하게 보이도록 조명을 맞춰주세요.</li>
                  <li>빛 반사나 구김 없이 결과지를 평평하게 두고 스캔하세요.</li>
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setScanError(null);
                    setPreviewImage(null);
                    openNativeCamera();
                  }}
                  className="w-full py-3 px-4 bg-[#3B82F6] hover:bg-[#2563EB] active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  스마트폰 카메라로 다시 촬영
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setScanError(null);
                      setPreviewImage(null);
                      openGallery();
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#1E222D] hover:bg-[#262B39] border border-[#2A2D35] text-[#60A5FA] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    갤러리 사진 변경
                  </button>
                  <button
                    onClick={() => {
                      setScanError(null);
                      onOpenManualEntry();
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#1E222D] hover:bg-[#262B39] border border-[#2A2D35] text-[#9CA3AF] hover:text-[#E2E4E9] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    직접 수치 입력
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: Scanned Result Confirmation & Metric Review Screen               */}
        {/* ========================================================================= */}
        {scannedResult && (
          <div className="absolute inset-0 z-30 bg-[#0A0B0E]/90 backdrop-blur-md flex flex-col justify-end p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-4 sm:p-5 w-full max-w-lg mx-auto shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-bottom duration-300 my-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#E2E4E9]">인바디 스캔 완료</h3>
                    <p className="text-[10px] text-[#9CA3AF]">
                      추출 수치를 확인하거나 탭하여 수정하세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingMetrics(!isEditingMetrics)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    isEditingMetrics
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                      : 'bg-[#1E222D] text-[#60A5FA] border-[#2A2D35]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isEditingMetrics ? 'done' : 'edit'}
                  </span>
                  {isEditingMetrics ? '수정 완료' : '수치 직접 수정'}
                </button>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Weight */}
                <div className="p-2.5 bg-[#0D0F16] rounded-2xl border border-[#2A2D35]">
                  <span className="text-[10px] text-[#9CA3AF] block mb-0.5 font-medium">체중 (kg)</span>
                  {isEditingMetrics ? (
                    <input
                      type="number"
                      step="0.1"
                      value={scannedResult.weight}
                      onChange={(e) => handleUpdateScannedMetric('weight', e.target.value)}
                      className="w-full text-center bg-[#161822] text-[#E2E4E9] font-black text-base rounded-lg border border-[#3B82F6] py-1 outline-none"
                    />
                  ) : (
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-lg font-black text-[#E2E4E9]">{scannedResult.weight}</span>
                      <span className="text-[10px] text-[#6B7280]">kg</span>
                    </div>
                  )}
                </div>

                {/* Skeletal Muscle */}
                <div className="p-2.5 bg-[#0D0F16] rounded-2xl border border-[#3B82F6]/30">
                  <span className="text-[10px] text-[#60A5FA] block mb-0.5 font-medium">골격근량 (kg)</span>
                  {isEditingMetrics ? (
                    <input
                      type="number"
                      step="0.1"
                      value={scannedResult.skeletalMuscleMass}
                      onChange={(e) => handleUpdateScannedMetric('skeletalMuscleMass', e.target.value)}
                      className="w-full text-center bg-[#161822] text-[#60A5FA] font-black text-base rounded-lg border border-[#3B82F6] py-1 outline-none"
                    />
                  ) : (
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-lg font-black text-[#60A5FA]">{scannedResult.skeletalMuscleMass}</span>
                      <span className="text-[10px] text-[#6B7280]">kg</span>
                    </div>
                  )}
                </div>

                {/* Body Fat % */}
                <div className="p-2.5 bg-[#0D0F16] rounded-2xl border border-[#2A2D35]">
                  <span className="text-[10px] text-[#F59E0B] block mb-0.5 font-medium">체지방률 (%)</span>
                  {isEditingMetrics ? (
                    <input
                      type="number"
                      step="0.1"
                      value={scannedResult.bodyFatPercentage}
                      onChange={(e) => handleUpdateScannedMetric('bodyFatPercentage', e.target.value)}
                      className="w-full text-center bg-[#161822] text-[#F59E0B] font-black text-base rounded-lg border border-[#3B82F6] py-1 outline-none"
                    />
                  ) : (
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-lg font-black text-[#F59E0B]">{scannedResult.bodyFatPercentage}</span>
                      <span className="text-[10px] text-[#6B7280]">%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Metrics (BMI, BMR, Score) */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-[#161822] rounded-xl border border-[#2A2D35]">
                  <span className="text-[9px] text-[#9CA3AF] block">BMI</span>
                  <span className="font-bold text-[#E2E4E9] text-xs">{scannedResult.bmi}</span>
                </div>
                <div className="p-2 bg-[#161822] rounded-xl border border-[#2A2D35]">
                  <span className="text-[9px] text-[#9CA3AF] block">기초대사량</span>
                  <span className="font-bold text-[#E2E4E9] text-xs">{scannedResult.bmr} kcal</span>
                </div>
                <div className="p-2 bg-[#161822] rounded-xl border border-[#2A2D35]">
                  <span className="text-[9px] text-[#9CA3AF] block">인바디 점수</span>
                  <span className="font-bold text-[#F59E0B] text-xs">{scannedResult.inBodyScore || 82}점</span>
                </div>
              </div>

              {/* AI Feedback Summary */}
              {scannedResult.aiFeedback && (
                <div className="p-2.5 bg-[#161822] border border-[#3B82F6]/30 rounded-xl text-xs text-[#9CA3AF] leading-relaxed flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#60A5FA] text-[16px] shrink-0 mt-0.5">
                    psychology
                  </span>
                  <span className="text-[11px]">{scannedResult.aiFeedback.summary}</span>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => onScanComplete(scannedResult)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  결과 저장 및 대시보드로 이동
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleRetakePhoto}
                    className="flex-1 py-2 px-3 bg-[#161822] hover:bg-[#1A1D26] border border-[#2A2D35] text-[#9CA3AF] hover:text-[#E2E4E9] font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    다시 스캔
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 py-2 px-3 bg-[#161822] hover:bg-[#1A1D26] border border-[#2A2D35] text-[#9CA3AF] hover:text-[#E2E4E9] font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                    취소하고 나가기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Gallery & Sample Picker Modal */}
      {showSamplePicker && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141C] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-[#2A2D35]">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#E2E4E9] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#60A5FA]">
                  photo_library
                </span>
                인바디 사진 선택 및 촬영
              </h3>
              <button
                onClick={() => setShowSamplePicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1A1D26] text-[#6B7280] hover:text-[#E2E4E9]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowSamplePicker(false);
                  openNativeCamera();
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25"
              >
                <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                스마트폰 카메라로 바로 촬영하기
              </button>

              <button
                onClick={() => {
                  setShowSamplePicker(false);
                  openGallery();
                }}
                className="w-full py-3 px-4 border border-[#3B82F6]/60 bg-[#1A1D26] hover:bg-[#202534] active:scale-95 text-[#60A5FA] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">photo_library</span>
                앨범/갤러리에서 사진 불러오기
              </button>

              <button
                onClick={() => {
                  setShowSamplePicker(false);
                  onOpenManualEntry();
                }}
                className="w-full py-2.5 px-4 border border-[#2A2D35] bg-[#12141C] hover:bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                사진 없이 직접 수치 입력하기
              </button>
            </div>

            <div className="pt-2">
              <span className="text-xs font-bold text-[#9CA3AF] block mb-2">
                테스트용 인바디 샘플 데이터로 즉시 스캔
              </span>
              <div className="space-y-2">
                {samplePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setShowSamplePicker(false);
                      triggerScanAnalysis(undefined, preset.data);
                    }}
                    className="w-full p-3 text-left rounded-2xl border border-[#2A2D35] bg-[#0D0F16] hover:border-[#3B82F6] hover:bg-[#1A1D26] transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#E2E4E9] group-hover:text-[#60A5FA]">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        체중 {preset.data.weight}kg · 골격근 {preset.data.skeletalMuscleMass}kg · 체지방 {preset.data.bodyFatPercentage}%
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[#60A5FA] text-[20px]">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141C] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-[#2A2D35]">
            <h3 className="text-base font-bold text-[#E2E4E9] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B]">lightbulb</span>
              스캔 팁 및 가이드
            </h3>
            <ul className="text-xs text-[#9CA3AF] space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>촬영 후 <b>사진 미리보기 화면</b>에서 글자/숫자가 잘 나왔는지 직접 확인할 수 있습니다.</li>
              <li>사진이 마음에 들면 <b>[AI 정밀 수치 분석 시작]</b>을 누르세요.</li>
              <li>흐리거나 잘렸다면 <b>[다시 촬영하기]</b>를 눌러 다시 찍을 수 있습니다.</li>
              <li>어두운 곳에서는 상단의 <b>플래시</b> 버튼을 켜주세요.</li>
              <li>분석 완료 후 언제든 수치를 직접 탭하여 수정하고 저장할 수 있습니다.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-semibold rounded-xl transition-all text-xs shadow-lg shadow-blue-500/20"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Live OCR Debug Console Drawer & Device Inspector                          */}
      {/* ========================================================================= */}
      {showDebugDrawer && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end md:justify-center p-0 md:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0E1017] border border-[#2A2D35] md:rounded-3xl rounded-t-3xl w-full max-w-xl mx-auto h-[88vh] md:h-[680px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="px-4 py-3.5 bg-[#161822] border-b border-[#2A2D35] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-1.5">
                    <span>스마트폰 OCR 실시간 진단기</span>
                    <span className="text-[10px] bg-[#3B82F6]/20 text-[#60A5FA] px-1.5 py-0.5 rounded border border-[#3B82F6]/30">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#9CA3AF]">
                    기기 환경, 이미지 페이로드 및 AI 모델 판독 로그
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const fullLogText = JSON.stringify(
                      {
                        deviceInfo: {
                          userAgent: navigator.userAgent,
                          platform: navigator.platform,
                          screen: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}`,
                          createImageBitmapSupported: typeof createImageBitmap !== 'undefined',
                        },
                        currentImage: {
                          hasPreview: !!previewImage,
                          meta: imageMeta,
                          croppedMode: isCroppedView,
                          payloadLengthKB: previewImage ? (previewImage.length / 1024).toFixed(1) : 0,
                        },
                        serverDebug,
                        timelineLogs: debugLogs,
                      },
                      null,
                      2
                    );
                    navigator.clipboard.writeText(fullLogText).then(() => {
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    });
                  }}
                  className="px-2.5 py-1.5 bg-[#1E222D] hover:bg-[#262B39] text-[#E2E4E9] border border-[#2A2D35] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 active:scale-95"
                  title="전체 디버그 정보 복사"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copySuccess ? 'check' : 'content_copy'}
                  </span>
                  <span>{copySuccess ? '복사됨!' : '로그 복사'}</span>
                </button>
                <button
                  onClick={() => setShowDebugDrawer(false)}
                  className="w-8 h-8 rounded-full bg-[#1A1D26] hover:bg-[#222734] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {/* 1. Device & Browser Environment Card */}
              <div className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[#60A5FA] font-sans font-bold text-xs pb-1 border-b border-[#2A2D35]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">smartphone</span>
                    기기 및 브라우저 환경
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? '스마트폰 / 모바일' : 'PC / 데스크톱'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#9CA3AF] block">화면 해상도:</span>
                    <span className="text-[#E2E4E9] font-medium">
                      {window.innerWidth} × {window.innerHeight} (dpr: {window.devicePixelRatio || 1})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block">EXIF 보정 지원:</span>
                    <span className={typeof createImageBitmap !== 'undefined' ? 'text-[#10B981]' : 'text-[#F59E0B]'}>
                      {typeof createImageBitmap !== 'undefined' ? '지원됨 (createImageBitmap)' : '미지원 (Fallback)'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#9CA3AF] block">User Agent:</span>
                    <span className="text-[#9CA3AF] text-[10px] break-all block bg-[#0A0B0E] p-1.5 rounded-lg border border-[#2A2D35]">
                      {navigator.userAgent}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Current Image Payload Status */}
              <div className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[#8B5CF6] font-sans font-bold text-xs pb-1 border-b border-[#2A2D35]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    이미지 페이로드 진단
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {previewImage ? '이미지 준비됨' : '이미지 없음'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#9CA3AF] block">이미지 크기:</span>
                    <span className="text-[#E2E4E9]">
                      {imageMeta.width && imageMeta.height ? `${imageMeta.width} × ${imageMeta.height} px` : '미측정'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block">Base64 페이로드 용량:</span>
                    <span className="text-[#E2E4E9]">
                      {previewImage ? `${(previewImage.length / 1024).toFixed(1)} KB` : '0 KB'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block">크롭 모드:</span>
                    <span className="text-[#E2E4E9]">
                      {isCroppedView ? '가이드 프레임 영역' : '전체 원본 사진'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block">실시간 카메라 상태:</span>
                    <span className={cameraActive ? 'text-[#10B981]' : 'text-[#9CA3AF]'}>
                      {cameraActive ? '활성 (비디오 스트림)' : '비활성'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Server & AI OCR Diagnostics */}
              {serverDebug && (
                <div className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[#10B981] font-sans font-bold text-xs pb-1 border-b border-[#2A2D35]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">psychology</span>
                      서버 AI OCR 판독 진단
                    </span>
                    <span className="text-[10px] text-[#60A5FA]">
                      {serverDebug.successfulModel || '모델 실패'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px] pt-1">
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">서버 소요 시간:</span>
                      <span className="text-[#E2E4E9]">
                        {serverDebug.elapsedMs ? `${(serverDebug.elapsedMs / 1000).toFixed(2)}초` : 'N/A'}
                      </span>
                    </div>
                    {serverDebug.modelAttempts && (
                      <div>
                        <span className="text-[#9CA3AF] block mb-1">시도된 Gemini 모델 리스트:</span>
                        <div className="space-y-1">
                          {serverDebug.modelAttempts.map((attempt: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between ${
                                attempt.success
                                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                                  : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                              }`}
                            >
                              <span>{attempt.model}</span>
                              <span>{attempt.success ? `성공 (${attempt.elapsedMs}ms)` : `실패: ${attempt.error}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {serverDebug.rawResponseText && (
                      <div>
                        <span className="text-[#9CA3AF] block mb-1">AI 모델 원본 텍스트 요약:</span>
                        <pre className="bg-[#0A0B0E] p-2 rounded-lg border border-[#2A2D35] text-[10px] text-[#9CA3AF] overflow-x-auto whitespace-pre-wrap max-h-32">
                          {serverDebug.rawResponseText}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Live Event Timeline Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-sans font-bold text-xs text-[#E2E4E9]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">history</span>
                    실시간 이벤트 타임라인 ({debugLogs.length}건)
                  </span>
                  <button
                    onClick={() =>
                      setDebugLogs([
                        {
                          id: 'cleared-1',
                          time: new Date().toTimeString().slice(0, 8),
                          type: 'info',
                          title: '로그가 초기화되었습니다.',
                        },
                      ])
                    }
                    className="text-[10px] text-[#9CA3AF] hover:text-[#E2E4E9] underline"
                  >
                    로그 비우기
                  </button>
                </div>

                <div className="space-y-1.5">
                  {debugLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                        log.type === 'error'
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#FCA5A5]'
                          : log.type === 'warn'
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FCD34D]'
                          : log.type === 'success'
                          ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#6EE7B7]'
                          : 'bg-[#12141C] border-[#2A2D35] text-[#E2E4E9]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold font-sans">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              log.type === 'error'
                                ? 'bg-[#EF4444]'
                                : log.type === 'warn'
                                ? 'bg-[#F59E0B]'
                                : log.type === 'success'
                                ? 'bg-[#10B981]'
                                : 'bg-[#3B82F6]'
                            }`}
                          />
                          <span>{log.title}</span>
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">{log.time}</span>
                      </div>
                      {log.detail && (
                        <pre className="text-[10px] bg-[#0A0B0E]/70 p-1.5 rounded border border-[#2A2D35]/50 overflow-x-auto whitespace-pre-wrap text-[#9CA3AF]">
                          {typeof log.detail === 'object'
                            ? JSON.stringify(log.detail, null, 2)
                            : String(log.detail)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 bg-[#161822] border-t border-[#2A2D35] flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowDebugDrawer(false);
                  triggerScanAnalysis(undefined, samplePresets[0].data);
                }}
                className="flex-1 py-2 px-3 bg-[#1E222D] hover:bg-[#262B39] text-[#60A5FA] border border-[#3B82F6]/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">science</span>
                테스트 샘플 즉시 주입
              </button>
              <button
                onClick={() => setShowDebugDrawer(false)}
                className="py-2 px-5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
