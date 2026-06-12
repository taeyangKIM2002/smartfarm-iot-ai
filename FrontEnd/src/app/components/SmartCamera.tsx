import { useEffect, useRef, useState } from 'react';
import { Camera, Info, ScanSearch, ShieldAlert, ShieldCheck, VideoOff } from 'lucide-react';
import { diseaseService, DiseaseAnalysis, DiseaseStats } from '../../service/diseaseService';

export function SmartCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch {
      setError('카메라 권한을 허용해야 노트북 카메라로 식물 상태를 확인할 수 있습니다.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOn(false);
  };

  const captureFrame = (): { stats: DiseaseStats; image: string } | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    const width = 416;
    const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const total = pixels.length / 4;
    let green = 0;
    let yellow = 0;
    let brown = 0;
    let darkSpot = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;

      if (g > r * 1.08 && g > b * 1.15 && brightness > 35) green += 1;
      if (r > 120 && g > 95 && b < 95 && Math.abs(r - g) < 85) yellow += 1;
      if (r > 55 && r < 160 && g > 35 && g < 125 && b < 85 && r > b * 1.4) brown += 1;
      if (brightness < 55 && max - min > 18) darkSpot += 1;
    }

    return {
      stats: {
        greenRatio: Number((green / total).toFixed(3)),
        yellowRatio: Number((yellow / total).toFixed(3)),
        brownRatio: Number((brown / total).toFixed(3)),
        darkSpotRatio: Number((darkSpot / total).toFixed(3)),
      },
      image: canvas.toDataURL('image/jpeg', 0.85),
    };
  };

  const analyzeCurrentFrame = async () => {
    const frame = captureFrame();
    if (!frame) {
      setError('카메라 프레임을 읽을 수 없습니다. 카메라를 다시 켜주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    try {
      const result = await diseaseService.analyze(frame.stats, frame.image, {
        strictModelOnly: true,
        binaryPlantLabels: true,
      });
      setAnalysis(result);
      localStorage.setItem('lastDiseaseAnalysis', JSON.stringify({
        label: result.label,
        status: result.status,
        confidence: result.confidence,
        analyzedAt: result.analyzedAt,
      }));
      window.dispatchEvent(new Event('lastDiseaseAnalysisUpdated'));
    } catch {
      setError('AI 상태 확인 API에 연결할 수 없습니다. Raspberry_Pi/api_server.py 실행 상태를 확인해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resultTone = analysis?.status === 'suspected'
    ? 'border-red-200 bg-red-50 text-red-700'
    : analysis?.status === 'watch'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
      : 'border-green-200 bg-green-50 text-green-700';

  const resultBadge = analysis?.status === 'watch'
    ? '재촬영 권장'
    : `신뢰도 ${Math.round((analysis?.confidence ?? 0) * 100)}%`;

  return (
    <div className="rounded-xl border-2 border-green-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera size={24} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">AI 건강 상태 확인(개발용)</h2>
        </div>
        {analysis?.isSick ? (
          <ShieldAlert size={24} className="text-red-600" />
        ) : (
          <ShieldCheck size={24} className="text-green-600" />
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <VideoOff size={36} />
            <span className="text-sm">노트북 카메라 대기 중</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={isCameraOn ? stopCamera : startCamera}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          {isCameraOn ? '카메라 끄기' : '카메라 켜기'}
        </button>
        <button
          type="button"
          onClick={analyzeCurrentFrame}
          disabled={!isCameraOn || isAnalyzing}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          <ScanSearch size={16} />
          {isAnalyzing ? '확인 중...' : '상태 확인'}
        </button>
      </div>

      {analysis && (
        <div className={`mt-4 rounded-lg border p-4 ${resultTone}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold">{analysis.label}</p>
            <span className="text-sm font-semibold">{resultBadge}</span>
          </div>
          <p className="mt-2 text-sm">{analysis.message}</p>
          {analysis.action && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3 text-sm">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>{analysis.action}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-gray-700">
        <p className="mb-2 font-bold text-emerald-800">AI 모델 정보</p>
        <div className="grid gap-1">
          <span>판별 방식: Model-Training TFLite 출력 기반</span>
          <span>사용 모델: YOLOv4 TFLite</span>
          <span>입력 데이터: 카메라 프레임 이미지</span>
          <span>클래스 매핑: 0=정상, 1=병해충 의심</span>
          <span>보류 기준: 최소 신뢰도와 클래스 간 확률 차이</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
