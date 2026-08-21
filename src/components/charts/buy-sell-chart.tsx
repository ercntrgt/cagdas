'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS, ChartEmpty, GRID, RoundedBar, TooltipBox, moneyRow, yTickMoney } from './base'
import { month, monthShort } from '@/lib/format'
import type { PeriodicPnl } from '@/types/db'

/** Aylık alış ve satış tutarlarını yan yana karşılaştırır. */
export default function BuySellChart({ data }: { data: PeriodicPnl[] }) {
  if (data.length === 0) return <ChartEmpty>Henüz işlem yok.</ChartEmpty>

  return (
    <div className="h-64 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={2}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="period" {...AXIS} tickFormatter={monthShort} />
          <YAxis {...AXIS} width={72} tickFormatter={yTickMoney} />
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
                      {moneyRow('Alış', Number(row.buy_amount), 'var(--viz-1)')}
                      {moneyRow('Satış', Number(row.sell_amount), 'var(--viz-2)')}
                      {moneyRow('Hacim', Number(row.volume))}
                    </>
                  }
                />
              )
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={26}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }}
          />
          <Bar
            dataKey="buy_amount"
            name="Alış"
            fill="var(--viz-1)"
            shape={<RoundedBar />}
            maxBarSize={26}
          />
          <Bar
            dataKey="sell_amount"
            name="Satış"
            fill="var(--viz-2)"
            shape={<RoundedBar />}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
