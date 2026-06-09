import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, CheckCircle, Droplet, Droplets, Search, Sun, Thermometer } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SensorData, sensorService } from '../../service/sensorService';

const DEVICE_ID = 'RASP_001';

const isValidHistoryLog = (log: SensorData) => {
  const temperature = Number(log.temperature);
  const humidity = Number(log.humidity);
  const soilMoisture = Number(log.soilMoisture);

  return (
    Number.isFinite(temperature) &&
    Number.isFinite(humidity) &&
    Number.isFinite(soilMoisture) &&
    temperature >= 5 &&
    temperature <= 45 &&
    humidity >= 10 &&
    humidity <= 100 &&
    soilMoisture >= 0 &&
    soilMoisture <= 92
  );
};

export default function HistoryPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = date || today;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [pendingDate, setPendingDate] = useState(selectedDate);
  const [logs, setLogs] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPendingDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let ignore = false;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await sensorService.getSensorHistoryByDate(DEVICE_ID, selectedDate);
        if (!ignore) setLogs(data);
      } catch {
        if (!ignore) {
          setLogs([]);
          setError('선택한 날짜의 이전 기록을 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      ignore = true;
    };
  }, [selectedDate]);

  const historyData = useMemo(() => {
    const validLogs = logs.filter(isValidHistoryLog);
    const excludedCount = logs.length - validLogs.length;

    const hourlyBuckets = new Map<
      number,
      {
        temperature: number;
        humidity: number;
        soilMoisture: number;
        illuminance: number;
        illuminanceCount: number;
        count: number;
      }
    >();

    validLogs.forEach((log) => {
      const hour = new Date(log.createdAt).getHours();
      const bucket =
        hourlyBuckets.get(hour) ??
        {
          temperature: 0,
          humidity: 0,
          soilMoisture: 0,
          illuminance: 0,
          illuminanceCount: 0,
          count: 0,
        };

      bucket.temperature += Number(log.temperature);
      bucket.humidity += Number(log.humidity);
      bucket.soilMoisture += Number(log.soilMoisture);
      if (log.illuminance != null) {
        bucket.illuminance += Number(log.illuminance);
        bucket.illuminanceCount += 1;
      }
      bucket.count += 1;
      hourlyBuckets.set(hour, bucket);
    });

    const chartData = Array.from(hourlyBuckets.entries())
      .sort(([leftHour], [rightHour]) => leftHour - rightHour)
      .map(([hour, bucket]) => ({
        time: `${String(hour).padStart(2, '0')}:00`,
        temperature: Number((bucket.temperature / bucket.count).toFixed(1)),
        humidity: Number((bucket.humidity / bucket.count).toFixed(1)),
        soilMoisture: Number((bucket.soilMoisture / bucket.count).toFixed(1)),
        illuminance:
          bucket.illuminanceCount === 0 ? null : Number((bucket.illuminance / bucket.illuminanceCount).toFixed(0)),
      }));

    const avg = (selector: (item: SensorData) => number) => {
      if (validLogs.length === 0) return 0;
      return validLogs.reduce((sum, item) => sum + selector(item), 0) / validLogs.length;
    };

    const avgTemp = avg((item) => Number(item.temperature));
    const avgHumidity = avg((item) => Number(item.humidity));
    const avgSoilMoisture = avg((item) => Number(item.soilMoisture));
    const daytimeLogs = validLogs.filter((item) => {
      const hour = new Date(item.createdAt).getHours();
      return hour >= 6 && hour < 18;
    });
    const daytimeLightLogs = daytimeLogs.filter((item) => item.illuminance != null && Number(item.illuminance) > 50);
    const avgDaytimeLight =
      daytimeLightLogs.length === 0
        ? null
        : daytimeLightLogs.reduce((sum, item) => sum + Number(item.illuminance), 0) / daytimeLightLogs.length;

    const issues: string[] = [];
    if (validLogs.some((item) => Number(item.temperature) > 28)) issues.push('낮 시간대 온도 확인이 필요합니다.');
    if (validLogs.some((item) => Number(item.humidity) > 80)) issues.push('습도가 높은 구간이 있어 환기 상태를 확인하세요.');
    if (validLogs.some((item) => Number(item.soilMoisture) < 30)) issues.push('토양 수분이 낮은 구간이 있어 물주기 타이밍을 확인하세요.');
    if (validLogs.some((item) => Number(item.soilMoisture) > 80)) issues.push('토양 수분이 높은 구간이 있어 배수 상태를 확인하세요.');

    return { chartData, avgTemp, avgHumidity, avgSoilMoisture, avgDaytimeLight, issues, excludedCount, validLogs };
  }, [logs]);

  const formatDate = (value: string) => {
    const [year, month, day] = value.split('-');
    return `${year}년 ${Number(month)}월 ${Number(day)}일`;
  };

  const handleDateSearch = () => {
    const nextDate = dateInputRef.current?.value || pendingDate;
    if (nextDate) navigate(`/history/${nextDate}`);
  };

  const hasIssues = historyData.issues.length > 0;
  const hasValidLogs = historyData.validLogs.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f4ec] p-6">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex cursor-pointer items-center gap-2 text-green-700 hover:text-green-900"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">대시보드로 돌아가기</span>
        </button>

        <div className="mb-6 rounded-2xl border-2 border-green-200 bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green-700">날짜별 이전 기록</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-800">{formatDate(selectedDate)} 식물 상태 기록</h1>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label className="mb-1 block text-xs font-bold text-gray-500">조회 날짜 변경</label>
              <div className="flex gap-2">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={pendingDate}
                  max={today}
                  onChange={(event) => setPendingDate(event.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-800 outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={handleDateSearch}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                >
                  <Search size={16} />
                  조회
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-lg">
            기록을 불러오는 중입니다.
          </div>
        ) : logs.length === 0 || !hasValidLogs ? (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle size={22} />
              <h3 className="font-semibold">{formatDate(selectedDate)}에는 표시할 수 있는 센서 기록이 없습니다.</h3>
            </div>
            {error && <p className="mt-2 text-sm">{error}</p>}
          </div>
        ) : (
          <>
            <div className={`mb-6 rounded-xl border-2 p-5 shadow-lg ${hasIssues ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
              <div className="mb-3 flex items-center gap-2">
                {hasIssues ? <AlertTriangle size={22} className="text-red-600" /> : <CheckCircle size={22} className="text-green-600" />}
                <h3 className={`font-semibold ${hasIssues ? 'text-red-800' : 'text-green-800'}`}>
                  {hasIssues ? '주의가 필요한 구간이 있었습니다' : '식물이 안정적으로 자란 날입니다'}
                </h3>
              </div>
              {hasIssues ? (
                <ul className="space-y-1">
                  {historyData.issues.map((issue) => (
                    <li key={issue} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="mt-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-700">온도, 습도, 토양 수분이 안정 범위에 있었습니다.</p>
              )}
              {historyData.excludedCount > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  센서 초기화 또는 보정 전 이상값 {historyData.excludedCount}건은 그래프와 평균 계산에서 제외했습니다.
                </p>
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: '평균 온도', value: `${historyData.avgTemp.toFixed(1)}°C`, icon: Thermometer, color: 'text-red-500' },
                { label: '평균 습도', value: `${historyData.avgHumidity.toFixed(0)}%`, icon: Droplets, color: 'text-blue-500' },
                { label: '토양 수분', value: `${historyData.avgSoilMoisture.toFixed(0)}%`, icon: Droplet, color: 'text-cyan-500' },
                { label: '낮 평균 조도', value: historyData.avgDaytimeLight === null ? '미수집' : `${historyData.avgDaytimeLight.toFixed(0)} lux`, icon: Sun, color: 'text-yellow-500' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow">
                  <item.icon size={24} className={`${item.color} mx-auto mb-2`} />
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">온·습도 및 토양 수분 추이</h3>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={historyData.chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="time" stroke="#666" style={{ fontSize: '12px' }} interval={0} />
                  <YAxis stroke="#666" style={{ fontSize: '12px' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="온도 (°C)" dot={false} />
                  <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="습도 (%)" dot={false} />
                  <Line type="monotone" dataKey="soilMoisture" stroke="#06b6d4" strokeWidth={2} name="토양 수분 (%)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
