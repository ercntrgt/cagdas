'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS, ChartEmpty, GRID, TooltipBox, moneyRow, yTickMoney } from './base'
import { date } from '@/lib/format'

export type CumulativePoint = {
  day: string
  /** O güne kadarki birikimli net kâr/zarar */
  cumulative: number
  /** O günün net kâr/zararı */
  daily: number
}

/**
 * Birikimli gerçekleşen kâr/zarar eğrisi.
 * Yukarı giden eğri kazandıran bir geçmişi, aşağı inen kaybettiren bir geçmişi gösterir.
 */
export default function CumulativePnlChart({ data }: { data: CumulativePoint[] }) {
  if (data.length < 2) {
    return (
      <ChartEmpty>
        Eğri için en az iki işlem günü gerekiyor. Satış yaptıkça burası dolacak.
      </ChartEmpty>
    )
  }

  const son = Number(data[data.length - 1].cumulative)
  const renk = son >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)'

  return (
    <div className="h-72 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="birikimliDolgu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={renk} stopOpacity={0.22} />
              <stop offset="100%" stopColor={renk} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="day"
            {...AXIS}
            minTickGap={48}
            tickFormatter={(v: string) => date(v).slice(0, 5)}
          />
          <YAxis {...AXIS} width={72} tickFormatter={yTickMoney} />
          <ReferenceLine y={0} stroke="var(--viz-axis)" strokeWidth={1} />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as CumulativePoint
              return (
                <TooltipBox
                  title={date(String(label))}
                  rows={
                    <>
                      {moneyRow('Birikimli', Number(row.cumulative), renk)}
                      {moneyRow('O gün', Number(row.daily))}
                    </>
                  }
                />
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="Birikimli net K/Z"
            stroke={renk}
            strokeWidth={2}
            fill="url(#birikimliDolgu)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
