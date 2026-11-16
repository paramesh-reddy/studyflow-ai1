import { useMemo } from 'react';
import type { Topic } from '../../types';

interface PrerequisiteGraphProps {
  topics: Topic[];
  onSelectTopic?: (topic: Topic) => void;
}

/**
 * Interactive SVG DAG visualizer arranging topics by topological depth layer.
 */
export function PrerequisiteGraph({ topics, onSelectTopic }: PrerequisiteGraphProps) {
  const layout = useMemo(() => {
    if (topics.length === 0) return null;

    const topicMap = new Map(topics.map((t) => [t.id, t]));
    const depthMap = new Map<string, number>();

    const computeDepth = (id: string, visited = new Set<string>()): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const topic = topicMap.get(id);
      if (!topic || topic.prerequisites.length === 0) {
        depthMap.set(id, 0);
        return 0;
      }

      const maxParent = Math.max(
        ...topic.prerequisites.map((p) => computeDepth(p.id, new Set(visited)))
      );
      const depth = maxParent + 1;
      depthMap.set(id, depth);
      return depth;
    };

    topics.forEach((t) => computeDepth(t.id));

    const columns = new Map<number, Topic[]>();
    for (const t of topics) {
      const col = depthMap.get(t.id) || 0;
      const list = columns.get(col) || [];
      list.push(t);
      columns.set(col, list);
    }

    const colCount = Math.max(...Array.from(columns.keys()), 0) + 1;
    const maxRows = Math.max(...Array.from(columns.values()).map((c) => c.length), 1);

    const nodeW = 200;
    const nodeH = 64;
    const colGap = 76;
    const rowGap = 24;
    const padX = 24;
    const padY = 24;

    const width = Math.max(640, padX * 2 + colCount * nodeW + (colCount - 1) * colGap);
    const height = Math.max(200, padY * 2 + maxRows * nodeH + (maxRows - 1) * rowGap);

    const positions = new Map<string, { x: number; y: number }>();

    for (let c = 0; c < colCount; c++) {
      const colTopics = columns.get(c) || [];
      const colHeight = colTopics.length * nodeH + Math.max(0, colTopics.length - 1) * rowGap;
      const startY = (height - colHeight) / 2;

      colTopics.forEach((t, idx) => {
        positions.set(t.id, {
          x: padX + c * (nodeW + colGap),
          y: startY + idx * (nodeH + rowGap),
        });
      });
    }

    const edges: Array<{ from: string; to: string; completed: boolean }> = [];
    for (const t of topics) {
      for (const p of t.prerequisites) {
        edges.push({
          from: p.id,
          to: t.id,
          completed: p.isCompleted,
        });
      }
    }

    return { width, height, nodeW, nodeH, positions, edges };
  }, [topics]);

  if (!layout || topics.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] p-3">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block mx-auto"
        role="img"
        aria-label="Topic prerequisite dependency graph"
      >
        <defs>
          <marker
            id="arrow-done"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#16A34A" />
          </marker>
          <marker
            id="arrow-pending"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
          </marker>
        </defs>

        {layout.edges.map((edge) => {
          const fromPos = layout.positions.get(edge.from);
          const toPos = layout.positions.get(edge.to);
          if (!fromPos || !toPos) return null;

          const x1 = fromPos.x + layout.nodeW;
          const y1 = fromPos.y + layout.nodeH / 2;
          const x2 = toPos.x - 4;
          const y2 = toPos.y + layout.nodeH / 2;
          const midX = (x1 + x2) / 2;

          return (
            <path
              key={`${edge.from}->${edge.to}`}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={edge.completed ? '#16A34A' : '#94A3B8'}
              strokeWidth={edge.completed ? 2 : 1.5}
              strokeDasharray={edge.completed ? undefined : '4 4'}
              markerEnd={edge.completed ? 'url(#arrow-done)' : 'url(#arrow-pending)'}
            />
          );
        })}

        {topics.map((t) => {
          const pos = layout.positions.get(t.id);
          if (!pos) return null;

          const borderStroke =
            t.status === 'completed'
              ? '#16A34A'
              : t.status === 'available'
              ? '#4F46E5'
              : '#CBD5E1';

          const statusLabel =
            t.status === 'completed' ? 'Completed' : t.status === 'available' ? 'Available' : 'Locked';

          return (
            <g
              key={t.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onSelectTopic?.(t)}
              className={onSelectTopic ? 'cursor-pointer' : undefined}
            >
              <rect
                width={layout.nodeW}
                height={layout.nodeH}
                rx={10}
                className="fill-white dark:fill-[#111827]"
                stroke={borderStroke}
                strokeWidth={t.status === 'available' ? 2 : 1.25}
              />
              <text
                x={12}
                y={26}
                fontSize={12.5}
                fontWeight={600}
                className="fill-[#0F172A] dark:fill-[#F8FAFC]"
              >
                {t.title.length > 23 ? `${t.title.slice(0, 21)}...` : t.title}
              </text>
              <text
                x={12}
                y={46}
                fontSize={11}
                className={
                  t.status === 'completed'
                    ? 'fill-emerald-600 dark:fill-emerald-400'
                    : t.status === 'available'
                    ? 'fill-indigo-600 dark:fill-indigo-400'
                    : 'fill-slate-500 dark:fill-slate-400'
                }
              >
                {statusLabel} · {t.estimatedMinutes}m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
