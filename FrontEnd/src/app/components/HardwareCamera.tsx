import { useEffect, useRef, useState } from 'react';
import { Camera, Info, ScanSearch, ShieldAlert, ShieldCheck, VideoOff, Wifi, WifiOff } from 'lucide-react';
import Hls from 'hls.js';
import { diseaseService, DiseaseAnalysis, DiseaseStats } from '../../service/diseaseService';

interface HardwareCameraProps {
  streamUrl: string;
}

export function HardwareCamera({ streamUrl }: HardwareCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let hls: Hls | undefined;
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 0,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 500,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 500,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsStreaming(true);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => setIsStreaming(false));
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal || !hls) return;

        setIsStreaming(false);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
        }
      });

      hls.on(Hls.Events.FRAG_LOAD_ERROR, () => {
        setIsStreaming(false);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.onloadedmetadata = () => {
        setIsStreaming(true);
        video.play().catch(() => setIsStreaming(false));
      };
      video.onerror = () => setIsStreaming(false);
    }

    return () => {
      hls?.destroy();
    };
  }, [streamUrl]);

  const formatTime = (date: Date) =>
    date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

  const StatusIcon = ({ children, active }: { children: React.ReactNode; active: boolean }) => (
    <div className="relative flex items-center justify-center">
      {children}
      {!active && (
        <div
          className="absolute h-[2px] w-[120%] rounded-sm bg-red-500 shadow-sm"
          style={{ transform: 'rotate(-45deg)' }}
        />
      )}
    </div>
  );

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
      setError('라즈베리파이 카메라 프레임을 읽을 수 없습니다. 스트림 연결 상태를 확인해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    try {
      const result = await diseaseService.analyze(frame.stats, frame.image);
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
    ? '추가 확인 권장'
    : `신뢰도 ${Math.round((analysis?.confidence ?? 0) * 100)}%`;

  return (
    <div className="rounded-xl border-2 border-green-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera size={24} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">라즈베리파이 AI 생육 모니터링</h2>
        </div>
        <div className="flex items-center gap-3">
          {analysis?.isSick ? (
            <ShieldAlert size={22} className="text-red-600" />
          ) : (
            <ShieldCheck size={22} className="text-green-600" />
          )}
          <div className={`flex items-center gap-1 text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            <StatusIcon active={isOnline}>
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </StatusIcon>
            {isOnline ? '온라인' : '오프라인'}
          </div>
        </div>
      </div>

      <div className="group relative aspect-video overflow-hidden rounded-lg border-2 border-green-300 bg-black shadow-2xl">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-all duration-500 ${
            isStreaming && isOnline ? 'opacity-90' : 'opacity-30 grayscale'
          }`}
          autoPlay
          muted
          playsInline
          controls
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
            <VideoOff size={48} strokeWidth={1} />
            <p className="text-sm font-light tracking-widest">NO SIGNAL</p>
          </div>
        )}

        <div className="absolute left-5 top-5">
          <div className={`flex items-center gap-2 rounded-full border bg-black/60 px-3 py-1.5 backdrop-blur-md ${isStreaming ? 'border-white/20' : 'border-red-500/50'}`}>
            <StatusIcon active={isStreaming}>
              <div className={`h-2 w-2 rounded-full ${isStreaming ? 'animate-ping bg-red-500' : 'bg-gray-500'}`} />
            </StatusIcon>
            <span className={`text-[11px] font-bold tracking-tight ${isStreaming ? 'text-white' : 'text-gray-400'}`}>
              {isStreaming ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-6">
          <div className="space-y-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isStreaming ? 'text-green-400' : 'text-red-400'}`}>
              {isStreaming ? 'Cam / Connected' : 'Cam / Signal Lost'}
            </span>
            <p className="font-mono text-xl tabular-nums text-white/90">{formatTime(currentTime)}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={analyzeCurrentFrame}
        disabled={!isStreaming || isAnalyzing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        <ScanSearch size={16} />
        {isAnalyzing ? '확인 중...' : '상태 확인'}
      </button>

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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 truncate text-xs text-gray-500">스트림 주소: {streamUrl}</p>
    </div>
  );
}
