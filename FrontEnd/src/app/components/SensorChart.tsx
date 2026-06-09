import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SensorChartProps {
  data: Array<{
    id: number;
    time: string;
    temperature: number;
    humidity: number;
  }>;
}

export function SensorChart({ data }: SensorChartProps) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">24시간 온·습도 추이</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" stroke="#666" style={{ fontSize: '12px' }} />
          <YAxis stroke="#666" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '10px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="온도 (°C)" dot={false} />
          <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="습도 (%)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
