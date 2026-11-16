import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import type { Goal, WeeklyProgress } from '../../types';

export function WeeklyStudyBarChart({ data }: { data: WeeklyProgress['dailySeries'] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridColor = isDark ? '#273449' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const barColor = isDark ? '#818CF8' : '#4F46E5';

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit="m"
          />
          <Tooltip
            cursor={{ fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
            contentStyle={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: gridColor,
              borderRadius: '8px',
              color: isDark ? '#F8FAFC' : '#0F172A',
              fontSize: '12px',
            }}
            formatter={(val: unknown) => [`${val} min`, 'Study Time']}
          />
          <Bar dataKey="minutes" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SixWeekActivityChart({ data }: { data: WeeklyProgress['sixWeekSeries'] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridColor = isDark ? '#273449' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const strokeColor = isDark ? '#818CF8' : '#4F46E5';

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="studyflowAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit="h"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: gridColor,
              borderRadius: '8px',
              color: isDark ? '#F8FAFC' : '#0F172A',
              fontSize: '12px',
            }}
            formatter={(val: unknown, _name: unknown, props: any) => [
              `${val} hrs (${props?.payload?.sessions ?? 0} sessions)`,
              'Weekly Volume',
            ]}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#studyflowAreaFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalCompletionChart({ goals }: { goals: Goal[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridColor = isDark ? '#273449' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const barColor = isDark ? '#34D399' : '#16A34A';

  const chartData = goals.map((g) => ({
    name: g.title.length > 20 ? `${g.title.slice(0, 18)}...` : g.title,
    fullTitle: g.title,
    completion: g.progressPercentage,
    completedTopics: g.completedTopics,
    totalTopics: g.totalTopics,
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
            contentStyle={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: gridColor,
              borderRadius: '8px',
              color: isDark ? '#F8FAFC' : '#0F172A',
              fontSize: '12px',
            }}
            formatter={(val: unknown, _name: unknown, props: any) => [
              `${val}% (${props?.payload?.completedTopics}/${props?.payload?.totalTopics} topics)`,
              props?.payload?.fullTitle || 'Completion',
            ]}
          />
          <Bar dataKey="completion" fill={barColor} radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
