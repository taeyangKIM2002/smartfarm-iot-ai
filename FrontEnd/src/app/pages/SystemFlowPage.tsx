import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Database,
  Droplet,
  Server,
  SprayCan,
  Sprout,
  Wifi,
} from 'lucide-react';
import { authService } from '../../service/authService';
import { SensorData, sensorService } from '../../service/sensorService';

const SENSOR_DEVICE_ID = 'RASP_001';

type FlowLog = {
  time: Date;
  step: string;
  message: string;
  status: '완료' | '대기' | '확인';
};

const formatTime = (date: Date, withSeconds = false) =>
  date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
  });

const formatOptionalTime = (value: string | null) => {
  if (!value) return '기록 없음';
  return formatTime(new Date(value), true);
};

export default function SystemFlowPage() {
  const navigate = useNavigate();
  const [latestSensor, setLatestSensor] = useState<SensorData | null>(null);
  const [loadedAt, setLoadedAt] = useState(new Date());
  const [lastWateredAt] = useState<string | null>(() => localStorage.getItem('lastWateredAt'));
  const [lastNutrientAt] = useState<string | null>(() => localStorage.getItem('lastNutrientAt'));

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }

    const fetchLatest = async () => {
      try {
        const data = await sensorService.getLatestSensorData(SENSOR_DEVICE_ID);
        setLatestSensor(data);
        setLoadedAt(new Date());
      } catch {
        setLoadedAt(new Date());
      }
    };

    fetchLatest();
  }, [navigate]);

  const sensorTime = latestSensor?.createdAt ? new Date(latestSensor.createdAt) : loadedAt;

  const flowLogs: FlowLog[] = useMemo(() => {
    const logs: FlowLog[] = [
      {
        time: sensorTime,
        step: 'Raspberry Pi',
        message: latestSensor
          ? `센서값 수집 완료: 온도 ${Number(latestSensor.temperature).toFixed(1)}°C, 습도 ${Number(latestSensor.humidity).toFixed(0)}%, 토양 수분 ${Number(latestSensor.soilMoisture).toFixed(0)}%`
          : '센서 최신값 확인 대기',
        status: latestSensor ? '완료' : '대기',
      },
      {
        time: sensorTime,
        step: 'MQTT',
        message: `센서/제어 메시지 토픽 처리: smartfarm/${SENSOR_DEVICE_ID}/control`,
        status: '완료',
      },
      {
        time: sensorTime,
        step: 'Spring',
        message: `디바이스 ${SENSOR_DEVICE_ID} 데이터 검증 및 API 응답 처리`,
        status: '완료',
      },
      {
        time: sensorTime,
        step: 'MySQL',
        message: 'sensor_logs 테이블에 센서값과 감정 상태 저장',
        status: '완료',
      },
      {
        time: loadedAt,
        step: 'React',
        message: '대시보드가 API를 호출해 화면 상태 갱신',
        status: '완료',
      },
    ];

    if (lastWateredAt) {
      logs.unshift({
        time: new Date(lastWateredAt),
        step: '제어 명령',
        message: `물주기 명령 발행: smartfarm/${SENSOR_DEVICE_ID}/control → PUMP_ON`,
        status: '완료',
      });
    }

    if (lastNutrientAt) {
      logs.unshift({
        time: new Date(lastNutrientAt),
        step: '제어 명령',
        message: `영양제 명령 발행: smartfarm/${SENSOR_DEVICE_ID}/control → NUTRIENT_ON`,
        status: '완료',
      });
    }

    return logs.sort((left, right) => right.time.getTime() - left.time.getTime());
  }, [lastNutrientAt, lastWateredAt, latestSensor, loadedAt, sensorTime]);

  const flowSteps = [
    { label: 'Raspberry Pi', detail: '센서 수집', icon: Sprout, tone: 'bg-lime-50 text-lime-700 border-lime-100' },
    { label: 'MQTT', detail: '메시지 전달', icon: Wifi, tone: 'bg-sky-50 text-sky-700 border-sky-100' },
    { label: 'Spring', detail: 'API 처리', icon: Server, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'MySQL', detail: '데이터 저장', icon: Database, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'React', detail: '화면 갱신', icon: Activity, tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f4ec] p-6 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex cursor-pointer items-center gap-2 text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">대시보드로 돌아가기</span>
        </button>

        <section className="mb-6 rounded-2xl border border-emerald-200 bg-white p-7 shadow-lg">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">IoT Data Flow</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">시스템 데이터 흐름</h1>
              <p className="mt-2 text-sm text-gray-600">
                시연 마지막에 데이터가 센서에서 화면까지 이동하는 구조를 확인하는 페이지입니다.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
              발표 구조 확인용
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="relative">
                <div className={`min-h-[150px] rounded-2xl border p-5 ${step.tone}`}>
                  <step.icon size={32} />
                  <p className="mt-5 text-lg font-bold">{step.label}</p>
                  <p className="mt-1 text-sm opacity-80">{step.detail}</p>
                </div>
                {index < flowSteps.length - 1 && (
                  <div className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-gray-300 md:block">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Processing Log</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">최근 처리 흐름</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                최신순
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              <div className="grid grid-cols-[180px_140px_1fr_90px] bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 max-md:hidden">
                <span>시간</span>
                <span>단계</span>
                <span>처리 내용</span>
                <span className="text-right">상태</span>
              </div>
              <div className="divide-y divide-gray-100">
                {flowLogs.map((log, index) => (
                  <div
                    key={`${log.step}-${log.time.toISOString()}-${index}`}
                    className="grid grid-cols-1 gap-2 px-4 py-4 text-sm md:grid-cols-[180px_140px_1fr_90px] md:items-center"
                  >
                    <span className="font-semibold text-gray-600">{formatTime(log.time, true)}</span>
                    <span className="font-bold text-gray-900">{log.step}</span>
                    <span className="text-gray-700">{log.message}</span>
                    <span className="inline-flex items-center justify-start gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 md:justify-center">
                      <CheckCircle size={13} />
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-gray-900">시연 체크 포인트</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>센서값은 MQTT를 거쳐 Spring 서버로 전달됩니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>Spring 서버는 데이터를 MySQL에 저장하고 API로 제공합니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>React 대시보드는 API 응답을 받아 화면을 갱신합니다.</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-gray-900">운영 정보</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-600">디바이스 ID</span>
                  <span className="font-bold text-gray-900">{SENSOR_DEVICE_ID}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-600">제어 토픽</span>
                  <span className="text-right font-bold text-gray-900">smartfarm/{SENSOR_DEVICE_ID}/control</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-600">저장 테이블</span>
                  <span className="font-bold text-gray-900">sensor_logs</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-600">물주기 기록</span>
                  <span className="text-right text-gray-700">{formatOptionalTime(lastWateredAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-600">영양제 기록</span>
                  <span className="text-right text-gray-700">{formatOptionalTime(lastNutrientAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900 shadow-lg">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <Droplet size={17} />
                <SprayCan size={17} />
                제어 명령 설명
              </div>
              <p className="leading-6">
                물주기와 영양제 버튼은 Spring API를 통해 MQTT 제어 토픽으로 명령을 발행하고,
                라즈베리파이가 해당 명령을 수신해 펌프 릴레이를 동작시키는 구조입니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
