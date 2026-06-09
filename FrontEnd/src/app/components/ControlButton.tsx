import { LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface ControlButtonProps {
  title: string;
  icon: LucideIcon;
  color: 'blue' | 'purple';
  onActivate: () => Promise<void> | void;
}

export function ControlButton({ title, icon: Icon, color, onActivate }: ControlButtonProps) {
  const [isActive, setIsActive] = useState(false);

  const handleClick = async () => {
    if (isActive) return;

    setIsActive(true);
    try {
      await onActivate();
    } finally {
      setTimeout(() => setIsActive(false), 1200);
    }
  };

  const colorClasses = {
    blue: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      active: 'bg-blue-700 scale-95',
    },
    purple: {
      bg: 'bg-purple-600 hover:bg-purple-700',
      active: 'bg-purple-700 scale-95',
    },
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isActive}
      className={`
        flex w-full items-center justify-center gap-3 rounded-xl p-6
        font-semibold text-white transition-all duration-300
        ${isActive ? colorClasses[color].active : colorClasses[color].bg}
        ${isActive ? 'cursor-not-allowed' : 'hover:shadow-xl'}
      `}
    >
      <Icon size={24} className={isActive ? 'animate-pulse' : ''} />
      <span className="text-lg">{isActive ? '실행 중...' : title}</span>
    </button>
  );
}
