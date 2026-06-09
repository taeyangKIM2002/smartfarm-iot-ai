import { AlertTriangle, Bug, CheckCircle, Leaf, ShieldCheck, Swords } from 'lucide-react';
import { useNavigate } from 'react-router';

export interface PlantAlert {
  message: string;
  type: 'good' | 'danger';
}

interface PlantStatusProps {
  alerts: PlantAlert[];
  emotionStatus: string;
  emotionMessage?: string;
  reason?: string;
}

type EmotionAnimation = 'float' | 'shake';

const emotionOrder = ['happy', 'sleepy', 'thirsty', 'overwatered', 'cold', 'hot', 'stuffy', 'sick'];

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

const emotionFace: Record<string, string> = {
  happy: '^_^',
  sleepy: '-_- zZ',
  thirsty: 'T_T',
  overwatered: 'o_o',
  cold: '>_<',
  hot: '@_@',
  stuffy: 'x_x',
  sick: '+_+',
};

const emotionAnimation: Record<string, EmotionAnimation> = {
  happy: 'float',
  sleepy: 'float',
  thirsty: 'shake',
  overwatered: 'shake',
  cold: 'shake',
  hot: 'shake',
  stuffy: 'shake',
  sick: 'shake',
};

function EmotionPlant({
  status,
  size = 'large',
  active = false,
}: {
  status: string;
  size?: 'large' | 'small';
  active?: boolean;
}) {
  const animation = emotionAnimation[status] ?? 'float';
  const face = emotionFace[status] ?? 'o_o';
  const plantSize = size === 'large' ? 'text-6xl' : 'text-3xl';
  const faceSize = size === 'large' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border bg-white/80 ${
        active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-white'
      } ${size === 'large' ? 'min-h-[120px] p-3' : 'min-h-[82px] p-2'}`}
    >
      <div className={`plant-emotion-${animation} flex flex-col items-center`}>
        <div className={`${plantSize} leading-none`}>🌿</div>
        <div className={`mt-1 rounded-full bg-gray-900 font-semibold text-white ${faceSize}`}>
          {face}
        </div>
      </div>
    </div>
  );
}

export function PlantStatus({ alerts, emotionStatus, emotionMessage, reason }: PlantStatusProps) {
  const hasIssue = alerts.some((alert) => alert.type === 'danger');
  const navigate = useNavigate();
  const label = emotionLabel[emotionStatus] ?? emotionStatus;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
      <style>
        {`
          @keyframes plantFloat {
            0% { transform: translateY(0); }
            50% { transform: translateY(-18px); }
            100% { transform: translateY(0); }
          }

          @keyframes plantShake {
            0% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(-5px) rotate(-5deg); }
            50% { transform: translateX(5px) rotate(5deg); }
            75% { transform: translateX(-5px) rotate(-5deg); }
            100% { transform: translateX(0) rotate(0deg); }
          }

          .plant-emotion-float {
            animation: plantFloat 3s ease-in-out infinite;
          }

          .plant-emotion-shake {
            animation: plantShake 0.4s ease-in-out infinite;
          }
        `}
      </style>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasIssue ? (
            <AlertTriangle size={22} className="text-rose-600" />
          ) : (
            <Leaf size={22} className="text-emerald-600" />
          )}
          <h3 className={`font-semibold ${hasIssue ? 'text-rose-800' : 'text-emerald-800'}`}>
            식물 감정 상태
          </h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/quest')}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Swords size={16} />
          오늘의 퀘스트
        </button>
      </div>

      <div className={`mb-4 rounded-lg border p-4 ${hasIssue ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="grid grid-cols-[1fr_120px] items-center gap-4 max-sm:grid-cols-1">
          <div>
            <p className="text-xs font-medium text-gray-500">현재 판별 결과</p>
            <p className={`mt-1 text-2xl font-bold ${hasIssue ? 'text-rose-700' : 'text-emerald-700'}`}>
              {label}
            </p>
            {emotionMessage && <p className="mt-2 text-sm text-gray-700">{emotionMessage}</p>}
            {reason && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/70 bg-white/70 p-3 text-sm text-gray-700">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{reason}</span>
              </div>
            )}
          </div>

          <EmotionPlant status={emotionStatus} active />
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <p className="mb-3 text-xs font-semibold text-gray-500">감정 전이 예시</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {emotionOrder.map((status) => (
            <div
              key={status}
              className={`rounded-lg border p-2 text-center ${
                status === emotionStatus ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-white'
              }`}
            >
              <EmotionPlant status={status} size="small" active={status === emotionStatus} />
              <p className="mt-2 text-xs font-medium text-gray-700">{emotionLabel[status]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-2">
            {alert.type === 'good' ? (
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <Bug size={16} className="mt-0.5 shrink-0 text-rose-600" />
            )}
            <span className={`text-sm ${alert.type === 'good' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {alert.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
