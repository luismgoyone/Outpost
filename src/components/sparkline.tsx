"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

import type { WeekBucket } from "@/lib/stats";

const weekFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/**
 * PRs-per-week sparkline. Per the dataviz guidance: the line is a de-emphasis hue, the
 * current week is marked in the accent, hover shows the exact value, and the numbers are
 * available as text for screen readers.
 */
export function Sparkline({ data, label }: { data: WeekBucket[]; label: string }) {
  const summary = data
    .map((w) => `${weekFormat.format(new Date(w.weekStart))}: ${w.count}`)
    .join(", ");
  const lastIndex = data.length - 1;

  return (
    <figure className="h-8 w-24" aria-label={`${label}. ${summary}`} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            cursor={{ stroke: "rgb(255 255 255 / 0.16)", strokeWidth: 1 }}
            contentStyle={{
              background: "#161b26",
              border: "1px solid rgb(255 255 255 / 0.12)",
              borderRadius: 4,
              padding: "4px 8px",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
            }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#f8fafc", padding: 0 }}
            labelFormatter={(_, payload) => {
              const week = payload?.[0]?.payload as WeekBucket | undefined;
              return week ? `Week of ${weekFormat.format(new Date(week.weekStart))}` : "";
            }}
            formatter={(value) => [`${value} PRs`, ""]}
            separator=""
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#94a3b8"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === lastIndex ? (
                <circle
                  key="current"
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill="#0ea5e9"
                  stroke="#161b26"
                  strokeWidth={2}
                />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 4, fill: "#0ea5e9", stroke: "#161b26", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
