'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AXIS,
  ChartEmpty,
  GRID,
  RoundedBar,
  SignedLabel,
  TooltipBox,
  moneyRow,
  niceScale,
  yTickMoney,
} from './base'
import { month, monthShort, moneyCompact } from '@/lib/format'
import type { PeriodicPnl } from '@/types/db'

export default function MonthlyPnlChart({ data }: { data: PeriodicPnl[] }) {
  if (data.length === 0) {
    return <ChartEmpty>Henüz gerçekleşen kâr/zarar yok — bir satış yaptığınızda burada görünür.</ChartEmpty>
  }

  const values = data.map((d) => Number(d.net_pnl))
  const scale = niceScale(Math.min(...values), Math.max(...values))

  return (
    <div className="h-64 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 16, bottom: 14, left: 8 }}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="period"
            {...AXIS}
            tickFormatter={monthShort}
          />
          <YAxis {...AXIS} width={72} tickFormatter={yTickMoney} domain={scale.domain} ticks={scale.ticks} />
          <ReferenceLine y={0} stroke="var(--viz-axis)" strokeWidth={1} />
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
                      {moneyRow(
                        row.net_pnl >= 0 ? 'Net kâr' : 'Net zarar',
                        row.net_pnl,
                        row.net_pnl >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)',
                      )}
                      {moneyRow('Brüt K/Z', row.gross_pnl)}
                      {moneyRow('Komisyon', row.commission)}
                    </>
                  }
                />
              )
            }}
          />
          <Bar dataKey="net_pnl" name="Net K/Z" shape={<RoundedBar />} maxBarSize={44}>
            {data.map((d) => (
              <Cell
                key={d.period}
                fill={d.net_pnl >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)'}
              />
            ))}
            {/* Doğrudan etiket: işaret yalnızca renkle taşınmasın */}
            <LabelList
              dataKey="net_pnl"
              content={(props) => (
                <SignedLabel
                  {...props}
                  format={(n) => (n > 0 ? `+${moneyCompact(n)}` : moneyCompact(n))}
                />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
