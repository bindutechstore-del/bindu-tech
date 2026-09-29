"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * Revenue over time.
 *
 * `revenue` arrives in TAKA, not paisa — the conversion happens once in
 * getRevenueSeries so the axis and tooltip both read naturally.
 */
export function RevenueChart({
  data,
}: {
  data: { date: string; label: string; revenue: number; orders: number }[];
}) {
  const hasRevenue = data.some((d) => d.revenue > 0);

  if (!hasRevenue) {
    return (
      <div className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed border-line-strong text-sm text-ink-muted">
        No revenue in the last 30 days yet.
      </div>
    );
  }

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#016952" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#016952" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#e6e5e1" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e6e5e1",
              fontSize: 12,
              boxShadow: "0 4px 12px rgb(20 22 26 / 0.08)",
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              return name === "revenue"
                ? [`৳${n.toLocaleString("en-US")}`, "Revenue"]
                : [String(n), "Orders"];
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#016952"
            strokeWidth={2}
            fill="url(#revFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
