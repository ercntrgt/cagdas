'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS, ChartEmpty, GRID, RoundedBar, TooltipBox, TooltipRow } from './base'
import { month, monthShort } from '@/lib/format'
import type { PeriodicPnl } from '@/types/db'

export default function MonthlyTradesChart({ data }: { data: PeriodicPnl[] }) {
  if (data.length === 0) {
    return <ChartEmpty>Henüz işlem yok.</ChartEmpty>
  }

  return (
    <div className="h-64 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="period"
            {...AXIS}
            tickFormatter={monthShort}
          />
          <YAxis {...AXIS} width={36} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--viz-grid)', fillOpacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as PeriodicPnl
              return (
                <TooltipBox
                  title={month(String(label))}
                  rows={
                    <>
                      <TooltipRow
                        color="var(--viz-1)"
                        label="Toplam işlem"
                        value={String(row.trade_count)}
                      />
                      <TooltipRow label="Alış" value={String(row.buy_count)} />
                      <TooltipRow label="Satış" value={String(row.sell_count)} />
                    </>
                  }
                />
              )
            }}
          />
          <Bar
            dataKey="trade_count"
            name="İşlem sayısı"
            fill="var(--viz-1)"
            shape={<RoundedBar />}
            maxBarSize={44}
          >
            <LabelList dataKey="trade_count" position="top" fontSize={10} fill="var(--muted)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
