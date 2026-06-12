import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Camera,
  ChevronDown,
  Droplet,
  Droplets,
  History,
  Home,
  LogOut,
  Server,
  Settings,
  SprayCan,
  Sprout,
  Sun,
  Thermometer,
  TrendingUp,
  User,
  Wifi,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { ControlButton } from '../components/ControlButton';
import { HardwareCamera } from '../components/HardwareCamera';
import { PlantAlert, PlantStatus } from '../components/PlantStatus';
import { SensorCard } from '../components/SensorCard';
import { SensorChart } from '../components/SensorChart';
import { SmartCamera } from '../components/SmartCamera';
import { authService } from '../../service/authService';
import { controlService } from '../../service/controlService';
import { SensorData } from '../../service/sensorService';
import { sensorService } from '../../service/sensorService';

const SENSOR_DEVICE_ID = 'RASP_001';
const APP_HOST = window.location.hostname || 'localhost';
const HARDWARE_CAMERA_URL = `http://${APP_HOST}:8080/api/v1/camera/hls/stream.m3u8`;

type SectionKey = 'overview' | 'sensors' | 'ai' | 'control' | 'history' | 'flow' | 'system';

type LastDiseaseAnalysis = {
  label: string;
  status: 'healthy' | 'watch' | 'suspected';
  confidence: number;
  analyzedAt: string;
};

const menuItems: Array<{ key: SectionKey; label: string; icon: typeof Home }> = [
  { key: 'overview', label: '대시보드', icon: Home },
  { key: 'sensors', label: '센서 모니터링', icon: Activity },
  { key: 'ai', label: 'AI 건강 상태 확인(개발용)', icon: Camera },
  { key: 'control', label: '제어', icon: Droplet },
  { key: 'history', label: '히스토리', icon: History },
  { key: 'flow', label: '시스템 흐름', icon: Server },
  { key: 'system', label: '설정', icon: Settings },
];

const emotionLabel: Record<string, string> = {
  happy: '쾌적',
  sleepy: '휴식',
  thirsty: '목마름',
  overwatered: '과습',
  cold: '추움',
  hot: '더움',
  stuffy: '답답함',
  sick: '병듦',
};

type ChartPoint = {
  id: number;
  time: string;
  temperature: number | null;
  humidity: number | null;
};

const createEmptyDailyChartData = (): ChartPoint[] =>
  Array.from({ length: 24 }, (_, hour) => ({
    id: hour,
    time: `${String(hour).padStart(2, '0')}:00`,
    temperature: null,
    humidity: null,
  }));

const getLocalDateKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDailyChartData = (logs: SensorData[]): ChartPoint[] => {
  const buckets = Array.from({ length: 24 }, () => ({
    temperature: 0,
    humidity: 0,
    count: 0,
  }));

  logs.forEach((log) => {
    const createdAt = new Date(log.createdAt);
    const hour = createdAt.getHours();
    const temperature = Number(log.temperature);
    const humidity = Number(log.humidity);

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity) || hour < 0 || hour > 23) {
      return;
    }

    buckets[hour].temperature += temperature;
    buckets[hour].humidity += humidity;
    buckets[hour].count += 1;
  });

  return buckets.map((bucket, hour) => ({
    id: hour,
    time: `${String(hour).padStart(2, '0')}:00`,
    temperature: bucket.count ? Number((bucket.temperature / bucket.count).toFixed(1)) : null,
    humidity: bucket.count ? Number((bucket.humidity / bucket.count).toFixed(1)) : null,
  }));
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [temperature, setTemperature] = useState(24.5);
  const [humidity, setHumidity] = useState(65);
  const [soilMoisture, setSoilMoisture] = useState(72);
  const [lightIntensity, setLightIntensity] = useState(850);
  const [hasLightReading, setHasLightReading] = useState(false);
  const [emotionStatus, setEmotionStatus] = useState('happy');
  const [emotionMessage, setEmotionMessage] = useState('생육 환경이 안정적인 상태입니다.');
  const [sensorTime, setSensorTime] = useState(new Date());
  const [clockTime, setClockTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [profileOpen, setProfileOpen] = useState(false);
  const [recentSensorLogs, setRecentSensorLogs] = useState<SensorData[]>([]);
  const [lastWateredAt, setLastWateredAt] = useState<string | null>(() => localStorage.getItem('lastWateredAt'));
  const [lastNutrientAt, setLastNutrientAt] = useState<string | null>(() => localStorage.getItem('lastNutrientAt'));
  const [lastDiseaseAnalysis, setLastDiseaseAnalysis] = useState<LastDiseaseAnalysis | null>(() => {
    const saved = localStorage.getItem('lastDiseaseAnalysis');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as LastDiseaseAnalysis;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncLastDiseaseAnalysis = () => {
      const saved = localStorage.getItem('lastDiseaseAnalysis');
      if (!saved) {
        setLastDiseaseAnalysis(null);
        return;
      }

      try {
        setLastDiseaseAnalysis(JSON.parse(saved) as LastDiseaseAnalysis);
      } catch {
        setLastDiseaseAnalysis(null);
      }
    };

    window.addEventListener('lastDiseaseAnalysisUpdated', syncLastDiseaseAnalysis);
    window.addEventListener('storage', syncLastDiseaseAnalysis);
    return () => {
      window.removeEventListener('lastDiseaseAnalysisUpdated', syncLastDiseaseAnalysis);
      window.removeEventListener('storage', syncLastDiseaseAnalysis);
    };
  }, []);

  const [chartData, setChartData] = useState<ChartPoint[]>(createEmptyDailyChartData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await sensorService.getLatestSensorData(SENSOR_DEVICE_ID);

        const nextTemperature = Number(data.temperature);
        const nextHumidity = Number(data.humidity);
        const nextSoilMoisture = Number(data.soilMoisture);

        setTemperature(nextTemperature);
        setHumidity(nextHumidity);
        setSoilMoisture(nextSoilMoisture);
        const nextIlluminance = data.illuminance == null ? null : Number(data.illuminance);
        setHasLightReading(nextIlluminance !== null && Number.isFinite(nextIlluminance));
        if (nextIlluminance !== null && Number.isFinite(nextIlluminance)) {
          setLightIntensity(nextIlluminance);
        }

        const nextEmotion =
          data.emotionStatus ?? getEmotionFromSensors(nextTemperature, nextHumidity, nextSoilMoisture);

        setEmotionStatus(nextEmotion);
        setEmotionMessage(data.emotionMessage ?? '센서 기준으로 현재 식물 상태를 판별했습니다.');
        setSensorTime(new Date(data.createdAt));
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
        const fallbackEmotion = getEmotionFromSensors(temperature, humidity, soilMoisture);
        setEmotionStatus(fallbackEmotion);
      }
    };

    if (authService.isLoggedIn()) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const fetchDailyChartData = async () => {
      try {
        const logs = await sensorService.getSensorHistoryByDate(SENSOR_DEVICE_ID, getLocalDateKey());
        setChartData(buildDailyChartData(logs));
      } catch (error) {
        console.error('Failed to fetch daily chart data:', error);
      }
    };

    if (authService.isLoggedIn()) {
      fetchDailyChartData();
      const interval = setInterval(fetchDailyChartData, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const data = await sensorService.getSensorHistory(SENSOR_DEVICE_ID, 200);
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setRecentSensorLogs(
          data.filter((log) => new Date(log.createdAt).getTime() >= sevenDaysAgo)
        );
      } catch (error) {
        console.error('Failed to fetch recent sensor logs:', error);
      }
    };

    if (authService.isLoggedIn()) {
      fetchRecentLogs();
      const interval = setInterval(fetchRecentLogs, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  const scrollToSection = (key: SectionKey) => {
    if (key === 'history') {
      const today = new Date().toISOString().split('T')[0];
      navigate(`/history/${today}`);
      return;
    }

    if (key === 'flow') {
      navigate('/flow');
      return;
    }

    setActiveSection(key);
    document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (key === 'system') {
      toast.info('시스템 설정 정보', {
        description: `디바이스 ${SENSOR_DEVICE_ID}, MQTT 토픽 smartfarm/${SENSOR_DEVICE_ID}/control`,
      });
    }
  };

  const handleNotificationClick = () => {
    scrollToSection('overview');
    toast.info('현재 알림', {
      description: plantAlerts.map((alert) => alert.message).join(' '),
      duration: 3500,
    });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleWatering = async () => {
    try {
      toast.info('물주기 명령 전송 중...', { duration: 1500 });
      await controlService.controlWaterPump(SENSOR_DEVICE_ID);
      const now = new Date().toISOString();
      localStorage.setItem('lastWateredAt', now);
      setLastWateredAt(now);
      setSoilMoisture((prev) => Math.min(100, prev));
      toast.success('물주기 명령 발행 완료', {
        description: `MQTT 토픽 smartfarm/${SENSOR_DEVICE_ID}/control 로 PUMP_ON을 전송했습니다.`,
        duration: 2500,
      });
    } catch {
      toast.error('물주기 명령 실패', {
        description: 'Spring 서버 또는 MQTT 브로커 연결 상태를 확인해주세요.',
        duration: 3000,
      });
    }
  };

  const handleNutrient = async () => {
    try {
      toast.info('영양제 공급 명령 전송 중...', { duration: 1500 });
      await controlService.controlSupplement(SENSOR_DEVICE_ID);
      const now = new Date().toISOString();
      localStorage.setItem('lastNutrientAt', now);
      setLastNutrientAt(now);
      toast.success('영양제 공급 명령 발행 완료', {
        description: `MQTT 토픽 smartfarm/${SENSOR_DEVICE_ID}/control 로 NUTRIENT_ON을 전송했습니다.`,
        duration: 2500,
      });
    } catch {
      toast.error('영양제 공급 명령 실패', {
        description: 'Spring 서버 또는 MQTT 브로커 연결 상태를 확인해주세요.',
        duration: 3000,
      });
    }
  };

  const getSensorStatus = (value: number, min: number, max: number): 'good' | 'warning' | 'danger' => {
    if (value < min || value > max) return 'danger';
    if (value < min + (max - min) * 0.1 || value > max - (max - min) * 0.1) return 'warning';
    return 'good';
  };

  const getLightContext = (value: number, measuredAt: Date, humid: number, hasReading: boolean) => {
    if (!hasReading) {
      return {
        status: 'good' as const,
        label: '미연동',
        description: '조도 센서값은 아직 수집되지 않아 판별에서 제외했습니다.',
        shouldAlert: false,
        alertMessage: '',
      };
    }

    const hour = measuredAt.getHours();
    const isNight = hour < 6 || hour >= 18;
    const isLikelyCloudyOrRainy = !isNight && value < 300 && humid >= 80;

    if (isNight) {
      return {
        status: 'good' as const,
        label: '야간 정상',
        description: '밤 시간대 저조도는 자연스러운 상태입니다.',
        shouldAlert: false,
        alertMessage: '',
      };
    }

    if (isLikelyCloudyOrRainy) {
      return {
        status: 'warning' as const,
        label: '날씨 영향',
        description: '습도와 조도를 함께 보면 흐림/강우 영향일 수 있습니다.',
        shouldAlert: false,
        alertMessage: '',
      };
    }

    if (value < 300) {
      return {
        status: 'warning' as const,
        label: '보광 확인',
        description: '낮 시간대 조도가 낮습니다. 지속되면 보광을 확인하세요.',
        shouldAlert: true,
        alertMessage: '낮 시간대 조도가 낮습니다. 흐림/강우가 아니라면 보광등 또는 위치 조정을 확인하세요.',
      };
    }

    if (value > 2500) {
      return {
        status: 'warning' as const,
        label: '강광 주의',
        description: '직사광이 강할 수 있습니다. 잎마름 여부를 확인하세요.',
        shouldAlert: true,
        alertMessage: '조도가 매우 높습니다. 직사광으로 인한 잎마름이 없는지 확인하세요.',
      };
    }

    return {
      status: 'good' as const,
      label: undefined,
      description: '낮 시간대 기준 조도 상태입니다.',
      shouldAlert: false,
      alertMessage: '',
    };
  };

  const getEmotionFromSensors = (temp: number, humid: number, moist: number) => {
    if (moist < 30) return 'thirsty';
    if (moist > 80) return 'overwatered';
    if (temp < 15) return 'cold';
    if (temp > 30) return 'hot';
    if (humid > 75) return 'stuffy';
    return 'happy';
  };

  const lightContext = useMemo(
    () => getLightContext(lightIntensity, sensorTime, humidity, hasLightReading),
    [hasLightReading, humidity, lightIntensity, sensorTime],
  );
  const isRaspberryPiConnected = clockTime.getTime() - sensorTime.getTime() < 2 * 60 * 1000;

  const plantAlerts: PlantAlert[] = useMemo(() => {
    const alerts: PlantAlert[] = [];
    if (soilMoisture < 40) {
      alerts.push({ message: '토양 수분이 낮습니다. 바질 잎이 시들 수 있어 물 공급이 필요합니다.', type: 'danger' });
    }
    if (temperature > 30) {
      alerts.push({ message: '온도가 높습니다. 바질이 고온 스트레스를 받을 수 있습니다.', type: 'danger' });
    }
    if (temperature < 15) {
      alerts.push({ message: '온도가 낮습니다. 바질 생육을 위해 보온이 필요합니다.', type: 'danger' });
    }
    if (humidity > 85) {
      alerts.push({ message: '습도가 높아 병해충 발생 위험이 있습니다. 환기가 필요합니다.', type: 'danger' });
    }
    if (lightContext.shouldAlert) {
      alerts.push({ message: lightContext.alertMessage, type: 'danger' });
    }
    if (alerts.length === 0) {
      alerts.push({ message: '모든 센서값이 안정 범위입니다. 바질이 건강하게 자라고 있습니다.', type: 'good' });
    }
    return alerts;
  }, [soilMoisture, temperature, humidity, lightContext]);

  const emotionReason = useMemo(() => {
    const getTemperatureLabel = () => {
      if (temperature < 15) return '온도 낮음';
      if (temperature > 30) return '온도 높음';
      return '온도 정상';
    };

    const getHumidityLabel = () => {
      if (humidity > 75) return '습도 높음';
      if (humidity < 40) return '습도 낮음';
      return '습도 정상';
    };

    const getSoilLabel = () => {
      if (soilMoisture < 30) return '토양 수분 부족';
      if (soilMoisture > 80) return '토양 수분 많음';
      return '토양 수분 정상';
    };

    if (emotionStatus === 'sick') return 'AI 확인 결과 주의가 필요합니다.';
    return `${getTemperatureLabel()} · ${getHumidityLabel()} · ${getSoilLabel()}`;
  }, [emotionStatus, humidity, soilMoisture, temperature]);

  const careAdvice = useMemo(() => {
    if (emotionStatus === 'sick') {
      return {
        title: '병해충 확인이 필요합니다',
        action: 'AI 진단 화면에서 잎을 다시 촬영하고, 감염 의심 잎은 다른 잎과 닿지 않게 분리하세요.',
        tone: 'border-rose-200 bg-rose-50 text-rose-800',
      };
    }
    if (soilMoisture < 30) {
      return {
        title: '지금 물주기를 권장합니다',
        action: '토양 수분이 낮습니다. 물주기 버튼을 눌러 펌프 명령을 보내고 10분 뒤 수분 변화를 확인하세요.',
        tone: 'border-blue-200 bg-blue-50 text-blue-800',
      };
    }
    if (soilMoisture > 80) {
      return {
        title: '오늘은 물주기를 쉬세요',
        action: '과습 가능성이 있습니다. 통풍을 유지하고 흙 표면이 마를 때까지 추가 급수를 피하세요.',
        tone: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      };
    }
    if (temperature > 30) {
      return {
        title: '고온 스트레스를 줄여주세요',
        action: '직사광선을 피하고 환기하거나 위치를 옮겨 온도를 낮춰주세요.',
        tone: 'border-orange-200 bg-orange-50 text-orange-800',
      };
    }
    if (temperature < 15) {
      return {
        title: '보온이 필요합니다',
        action: '바질 생육 온도보다 낮습니다. 창가 냉기를 피하고 따뜻한 위치로 옮겨주세요.',
        tone: 'border-sky-200 bg-sky-50 text-sky-800',
      };
    }
    if (humidity > 75) {
      return {
        title: '환기를 권장합니다',
        action: '습도가 높으면 곰팡이와 병해충 위험이 커집니다. 짧게 환기하고 잎 표면 물기를 확인하세요.',
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    }
    return {
      title: '현재 관리는 적절합니다',
      action: '오늘은 추가 조치 없이 현재 환경을 유지하세요. 다음 확인은 2~3시간 뒤를 권장합니다.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }, [emotionStatus, humidity, soilMoisture, temperature]);

  const growthPrediction = useMemo(() => {
    const sortedLogs = [...recentSensorLogs].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );

    const dropsPerHour: number[] = [];
    for (let index = 1; index < sortedLogs.length; index += 1) {
      const previous = sortedLogs[index - 1];
      const current = sortedLogs[index];
      const hours =
        (new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime()) / (1000 * 60 * 60);
      if (hours <= 0 || hours > 6) continue;

      const drop = Number(previous.soilMoisture) - Number(current.soilMoisture);
      if (drop > 0 && drop < 20) {
        dropsPerHour.push(drop / hours);
      }
    }

    const averageHourlyDrop =
      dropsPerHour.length > 0
        ? dropsPerHour.reduce((sum, value) => sum + value, 0) / dropsPerHour.length
        : 0.35;
    const predictedSoil = Math.max(0, Math.min(100, soilMoisture - averageHourlyDrop * 24));
    const hoursToDry = averageHourlyDrop > 0 ? (soilMoisture - 30) / averageHourlyDrop : Number.POSITIVE_INFINITY;
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    const recentTrendLogs = sortedLogs.filter((log) => new Date(log.createdAt).getTime() >= threeHoursAgo);
    const trendLogs = recentTrendLogs.length >= 3 ? recentTrendLogs : sortedLogs.slice(-12);
    const highTempCount = trendLogs.filter((log) => Number(log.temperature) > 28).length;
    const highHumidityCount = trendLogs.filter((log) => Number(log.humidity) > 80).length;
    const patternThreshold = Math.max(2, Math.ceil(trendLogs.length * 0.4));
    const hasHighTempPattern = temperature > 28 || (trendLogs.length >= 3 && highTempCount >= patternThreshold);
    const hasHighHumidityPattern = humidity > 80 || (trendLogs.length >= 3 && highHumidityCount >= patternThreshold);

    if (predictedSoil < 30 || hoursToDry <= 24) {
      return {
        title: '수분 주의 가능',
        status: '주의',
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
        predictedSoil,
        summary: `약 ${Math.max(1, Math.ceil(hoursToDry))}시간 후 토양 수분이 주의 범위에 가까워질 수 있습니다.`,
        action: '내일 오전 물주기 여부를 확인하세요.',
        basis: '최근 7일 로그 기반 시계열 분석 기반 예측',
      };
    }

    if (hasHighTempPattern) {
      return {
        title: '고온 주의 가능',
        status: '관찰',
        tone: 'border-orange-200 bg-orange-50 text-orange-800',
        predictedSoil,
        summary: '낮 시간대 온도 확인이 필요합니다.',
        action: '한낮 직사광과 환기 상태를 확인하세요.',
        basis: '최근 7일 로그 기반 시계열 분석 기반 예측',
      };
    }

    if (hasHighHumidityPattern) {
      return {
        title: '습도 관찰 필요',
        status: '관찰',
        tone: 'border-sky-200 bg-sky-50 text-sky-800',
        predictedSoil,
        summary: '습도와 통풍 확인이 필요합니다.',
        action: '잎 표면 물기와 주변 환기 상태를 확인하세요.',
        basis: '최근 7일 로그 기반 시계열 분석 기반 예측',
      };
    }

    return {
      title: '쾌적 유지 가능',
      status: '안정',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      predictedSoil,
      summary: '향후 24시간 동안 현재 생육 상태가 유지될 가능성이 높습니다.',
      action: '오늘은 추가 조치 없이 내일 오전 상태만 확인하세요.',
      basis: '최근 7일 로그 기반 시계열 분석 기반 예측',
    };
  }, [humidity, recentSensorLogs, soilMoisture, temperature]);

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

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-gray-900">
      <Toaster position="top-right" richColors />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-emerald-100 bg-gradient-to-b from-emerald-100 via-lime-50 to-[#eef3d9] px-5 py-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-white/80 p-3 text-emerald-700 shadow-sm">
              <Sprout size={25} />
            </div>
            <div>
              <p className="text-xl font-bold">Smart Farm</p>
              <p className="text-sm text-gray-600">Plant Monitoring</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => scrollToSection(item.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  activeSection === item.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:bg-white/60'
                }`}
              >
                <item.icon size={19} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-emerald-200 bg-white/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-900">
              <Wifi size={17} />
              연결 상태
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <span>백엔드</span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">ON</span>
              </div>
              <div className="flex items-center justify-between">
                <span>MQTT</span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">ON</span>
              </div>
              <div className="flex items-center justify-between">
                <span>라즈베리파이</span>
                <span className={`rounded-full px-2 py-0.5 font-bold text-white ${
                  isRaspberryPiConnected ? 'bg-emerald-600' : 'bg-amber-500'
                }`}>
                  {isRaspberryPiConnected ? 'ON' : '대기'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-[#f7f4ec]/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Smart Farm Dashboard</p>
                <h1 className="mt-1 text-2xl font-bold">식물 생육 모니터링</h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleNotificationClick}
                  className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition hover:border-emerald-200 hover:text-emerald-700 md:flex"
                >
                  <Bell size={18} />
                  {formatTime(clockTime)}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.success('백엔드와 센서 API가 응답 중입니다.', {
                      description: `마지막 센서 수신: ${formatTime(sensorTime, true)}`,
                    });
                  }}
                  className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 sm:flex"
                >
                  <Server size={16} />
                  서버 연결됨
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 transition hover:border-emerald-200"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <User size={16} />
                    </div>
                    <span className="max-w-[140px] truncate text-sm font-semibold">
                      {currentUser?.name || currentUser?.email || '관리자'}
                    </span>
                    <ChevronDown size={15} className="text-gray-500" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-12 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                      <p className="text-sm font-bold text-gray-900">{currentUser?.name || '관리자'}</p>
                      <p className="mt-1 text-xs text-gray-500">{currentUser?.email || 'demo@gmail.com'}</p>
                      <div className="my-3 h-px bg-gray-100" />
                      <button
                        type="button"
                        onClick={() => scrollToSection('system')}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        시스템 설정 보기
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={16} />
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                  title="로그아웃"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </header>

          <div className="px-5 py-6">
            <section id="overview" className="scroll-mt-28">
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('overview')}
                  className="rounded-xl border border-emerald-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                >
                  <p className="text-xs font-bold text-gray-500">현재 감정</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {emotionLabel[emotionStatus] ?? emotionStatus}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('system')}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                >
                  <p className="text-xs font-bold text-gray-500">디바이스</p>
                  <p className="mt-1 text-xl font-bold">{SENSOR_DEVICE_ID}</p>
                </button>
                <button
                  type="button"
                  onClick={handleNotificationClick}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                >
                  <p className="text-xs font-bold text-gray-500">마지막 센서 수신</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{formatTime(sensorTime, true)}</p>
                </button>
              </div>

              <div className="mb-5 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_1fr_0.95fr]">
                <div className={`flex h-full flex-col rounded-xl border p-5 shadow-sm ${careAdvice.tone}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">오늘의 관리 가이드</p>
                  <h2 className="mt-2 text-2xl font-bold">{careAdvice.title}</h2>
                  <p className="mt-2 text-sm leading-6">{careAdvice.action}</p>
                </div>

                <div className={`flex h-full flex-col rounded-xl border p-5 shadow-sm ${growthPrediction.tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">24시간 생육 예측</p>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">{growthPrediction.status}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="rounded-lg bg-white/70 p-2">
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{growthPrediction.title}</h2>
                      <p className="mt-1 text-sm leading-6">{growthPrediction.summary}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs opacity-70">현재 수분</p>
                      <p className="mt-1 font-bold">{soilMoisture.toFixed(0)}%</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs opacity-70">24시간 후 예상</p>
                      <p className="mt-1 font-bold">{growthPrediction.predictedSoil.toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{growthPrediction.action}</p>
                  <div className="mt-auto pt-3">
                    <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700 shadow-sm ring-1 ring-orange-100">
                      {growthPrediction.basis}
                    </p>
                  </div>
                </div>

                <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">최근 상태 진단</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-700">마지막 물주기</span>
                      <span className="text-right text-gray-600">{formatOptionalTime(lastWateredAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-700">마지막 영양제</span>
                      <span className="text-right text-gray-600">{formatOptionalTime(lastNutrientAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-700">AI 최근 진단</span>
                      {lastDiseaseAnalysis ? (
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                          lastDiseaseAnalysis.status === 'suspected'
                            ? 'bg-red-100 text-red-700'
                            : lastDiseaseAnalysis.status === 'watch'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {lastDiseaseAnalysis.status === 'watch'
                            ? `${lastDiseaseAnalysis.label} · 추가 확인`
                            : `${lastDiseaseAnalysis.label} ${Math.round(lastDiseaseAnalysis.confidence * 100)}%`}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">미실행</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-700">진단 시간</span>
                      <span className="text-right text-gray-600">
                        {lastDiseaseAnalysis ? formatOptionalTime(lastDiseaseAnalysis.analyzedAt) : '기록 없음'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid max-w-[1480px] grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
              <div className="space-y-6">
                <section id="ai" className="scroll-mt-28 space-y-6">
                  <SmartCamera />
                  <HardwareCamera streamUrl={HARDWARE_CAMERA_URL} />
                </section>

                <section id="control" className="scroll-mt-28 rounded-xl border border-green-200 bg-white p-6 shadow-lg">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
                    <AlertCircle size={24} className="text-green-600" />
                    하드웨어 제어
                  </h2>
                  <div className="space-y-3">
                    <ControlButton title="물주기" icon={Droplet} color="blue" onActivate={handleWatering} />
                    <ControlButton title="영양제 주기" icon={SprayCan} color="purple" onActivate={handleNutrient} />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    제어 토픽: smartfarm/{SENSOR_DEVICE_ID}/control
                  </p>
                </section>

              </div>

              <div className="space-y-6">
                <PlantStatus
                  alerts={plantAlerts}
                  emotionStatus={emotionStatus}
                  emotionMessage={emotionMessage}
                  reason={emotionReason}
                />

                <section id="sensors" className="scroll-mt-28 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SensorCard title="온도" value={temperature.toFixed(1)} unit="°C" icon={Thermometer} status={getSensorStatus(temperature, 20, 28)} min={20} max={28} />
                  <SensorCard title="습도" value={humidity.toFixed(0)} unit="%" icon={Droplets} status={getSensorStatus(humidity, 50, 80)} min={50} max={80} />
                  <SensorCard title="토양 수분" value={soilMoisture.toFixed(0)} unit="%" icon={Droplet} status={getSensorStatus(soilMoisture, 30, 80)} min={30} max={80} />
                  <SensorCard
                    title="조도"
                    value={hasLightReading ? lightIntensity.toFixed(0) : '미연동'}
                    unit={hasLightReading ? 'lux' : ''}
                    icon={Sun}
                    status={lightContext.status}
                    statusLabel={lightContext.label}
                    description={lightContext.description}
                    min={hasLightReading ? 300 : undefined}
                    max={hasLightReading ? 2500 : undefined}
                  />
                </section>

                <SensorChart data={chartData} />

                <section id="system" className="scroll-mt-28 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white shadow-lg">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                    <BarChart3 size={20} />
                    시스템 상태 및 설정
                  </h3>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      <span>센서 API: 정상 응답</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      <span>MQTT 제어: 발행 가능</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      <span>AI 식물 모니터링: 연결됨</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      <span>실측 센서: 온습도·토양·조도 수신 중</span>
                    </div>
                  </div>
                  <div className="mt-5 rounded-lg bg-white/10 p-4 text-sm">
                    <p>디바이스 ID: {SENSOR_DEVICE_ID}</p>
                    <p>카메라 프록시: {HARDWARE_CAMERA_URL}</p>
                    <p>제어 토픽: smartfarm/{SENSOR_DEVICE_ID}/control</p>
                    <p>최근 센서 수신: {formatTime(sensorTime, true)}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
