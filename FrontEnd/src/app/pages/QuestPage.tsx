import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Star, Trophy, CheckCircle2, Circle, Droplets, Sun, Thermometer, Sprout } from 'lucide-react';

// 식물 5단계 상태
type PlantStage = 1 | 2 | 3 | 4 | 5;

interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  icon: React.ReactNode;
}

const PLANT_STAGES: Record<PlantStage, { name: string; emoji: string; color: string; message: string; bgGradient: string }> = {
  1: {
    name: '시든 새싹',
    emoji: '🥀',
    color: 'text-red-500',
    message: '식물이 많이 힘들어해요... 빨리 돌봐주세요!',
    bgGradient: 'from-red-50 to-orange-50',
  },
  2: {
    name: '약한 새싹',
    emoji: '🌱',
    color: 'text-orange-500',
    message: '조금 더 관심이 필요해요. 힘내세요!',
    bgGradient: 'from-orange-50 to-yellow-50',
  },
  3: {
    name: '자라는 식물',
    emoji: '🌿',
    color: 'text-yellow-600',
    message: '잘 자라고 있어요! 꾸준히 돌봐주세요.',
    bgGradient: 'from-yellow-50 to-green-50',
  },
  4: {
    name: '건강한 식물',
    emoji: '🪴',
    color: 'text-green-500',
    message: '아주 건강하게 자라고 있어요! 훌륭해요!',
    bgGradient: 'from-green-50 to-emerald-50',
  },
  5: {
    name: '만개한 꽃',
    emoji: '🌸',
    color: 'text-emerald-500',
    message: '최고의 상태예요! 아름답게 꽃을 피웠어요! 🎉',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
};

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

function getLevelInfo(totalXP: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else break;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 500;
  const xpInLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return { level, xpInLevel, xpNeeded, progress: (xpInLevel / xpNeeded) * 100 };
}

function getPlantStage(level: number): PlantStage {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 6) return 3;
  if (level <= 8) return 4;
  return 5;
}

export default function QuestPage() {
  const navigate = useNavigate();
  const [totalXP, setTotalXP] = useState(320);
  const [quests, setQuests] = useState<Quest[]>([
    {
      id: '1',
      title: '물 주기',
      description: '식물에게 물을 한 번 주세요',
      xpReward: 30,
      completed: false,
      icon: <Droplets size={20} className="text-blue-500" />,
    },
    {
      id: '2',
      title: '조도 확인',
      description: '조도 센서 값을 확인하세요',
      xpReward: 20,
      completed: false,
      icon: <Sun size={20} className="text-yellow-500" />,
    },
    {
      id: '3',
      title: '온도 체크',
      description: '온도가 적정 범위인지 확인하세요',
      xpReward: 20,
      completed: true,
      icon: <Thermometer size={20} className="text-red-400" />,
    },
    {
      id: '4',
      title: '식물 관찰',
      description: '식물 상태를 확인하고 진단하세요',
      xpReward: 25,
      completed: false,
      icon: <Sprout size={20} className="text-green-500" />,
    },
  ]);

  const { level, xpInLevel, xpNeeded, progress } = getLevelInfo(totalXP);
  const plantStage = getPlantStage(level);
  const stageInfo = PLANT_STAGES[plantStage];
  const completedCount = quests.filter(q => q.completed).length;

  const handleComplete = (id: string) => {
    setQuests(prev =>
      prev.map(q => {
        if (q.id === id && !q.completed) {
          setTotalXP(xp => xp + q.xpReward);
          return { ...q, completed: true };
        }
        return q;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-[#f7f4ec]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-green-700" />
          </button>
          <h1 className="text-green-800">오늘의 퀘스트</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 왼쪽: 레벨, 경험치, 퀘스트 목록 */}
          <div className="lg:col-span-3 space-y-5">
            {/* 레벨 & 경험치 */}
            <div className="bg-white rounded-xl border border-green-200 p-5 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-md">
                    <Trophy size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">현재 레벨</p>
                    <p className="text-2xl text-green-700">Lv. {level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">총 경험치</p>
                  <p className="text-lg text-emerald-600">{totalXP} XP</p>
                </div>
              </div>
              {/* XP 프로그레스 바 */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>다음 레벨까지</span>
                  <span>{xpInLevel} / {xpNeeded} XP</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 일일 퀘스트 목록 */}
            <div className="bg-white rounded-xl border border-green-200 p-5 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star size={20} className="text-yellow-500" />
                  <h2 className="text-green-800">일일 퀘스트</h2>
                </div>
                <span className="text-sm text-gray-500 bg-green-50 px-2.5 py-1 rounded-full">
                  {completedCount} / {quests.length} 완료
                </span>
              </div>

              {/* 전체 진행 바 */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / quests.length) * 100}%` }}
                />
              </div>

              <div className="space-y-3">
                {quests.map(quest => (
                  <div
                    key={quest.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      quest.completed
                        ? 'bg-green-50/60 border-green-200'
                        : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="shrink-0">{quest.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${quest.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {quest.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{quest.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        quest.completed ? 'bg-gray-100 text-gray-400' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        +{quest.xpReward} XP
                      </span>
                      {quest.completed ? (
                        <CheckCircle2 size={22} className="text-green-500" />
                      ) : (
                        <button
                          onClick={() => handleComplete(quest.id)}
                          className="p-1 hover:bg-green-50 rounded-full transition-colors cursor-pointer"
                        >
                          <Circle size={22} className="text-gray-300 hover:text-green-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 식물 캐릭터 */}
          <div className="lg:col-span-2">
            <div className={`bg-gradient-to-br ${stageInfo.bgGradient} rounded-xl border border-green-200 p-6 shadow-md text-center sticky top-20`}>
              <p className="text-sm text-gray-500 mb-2">나의 식물 캐릭터</p>

              {/* 캐릭터 */}
              <div className="my-6">
                <div className="w-36 h-36 mx-auto bg-white/70 rounded-full flex items-center justify-center shadow-inner text-7xl">
                  {stageInfo.emoji}
                </div>
              </div>

              {/* 식물 이름 & 단계 */}
              <div className="mb-4">
                <h3 className={`${stageInfo.color}`}>{stageInfo.name}</h3>
                <div className="flex justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div
                      key={s}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        s <= plantStage ? 'bg-emerald-400' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">성장 단계 {plantStage} / 5</p>
              </div>

              {/* 상태 메시지 */}
              <div className="bg-white/80 rounded-lg p-4 border border-green-100">
                <p className="text-sm text-gray-700 leading-relaxed">{stageInfo.message}</p>
              </div>

              {/* 스탯 */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-xs text-gray-400">레벨</p>
                  <p className="text-lg text-green-700">Lv.{level}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-xs text-gray-400">완료 퀘스트</p>
                  <p className="text-lg text-emerald-600">{completedCount}개</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
