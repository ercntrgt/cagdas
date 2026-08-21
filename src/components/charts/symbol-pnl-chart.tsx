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
import { moneyCompact } from '@/lib/format'
import type { SymbolPnl } from '@/types/db'

/** Yatay çubuk: hisse bazlı net gerçekleşen kâr/zarar (en büyük mutlak değerler). */
export default function SymbolPnlChart({ data }: { data: SymbolPnl[] }) {
  const rows = data
    .filter((d) => d.net_pnl !== 0)
    .sort((a, b) => Math.abs(b.net_pnl) - Math.abs(a.net_pnl))
    .slice(0, 10)
    .sort((a, b) => b.net_pnl - a.net_pnl)

  if (rows.length === 0) {
    return <ChartEmpty>Henüz gerçekleşen kâr/zarar yok.</ChartEmpty>
  }

  const values = rows.map((r) => Number(r.net_pnl))
  const scale = niceScale(Math.min(...values), Math.max(...values))

  return (
    <div className="px-2 py-4" style={{ height: Math.max(200, rows.length * 34 + 48) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
        >
          <CartesianGrid {...GRID} vertical horizontal={false} />
          <XAxis
            type="number"
            {...AXIS}
            tickFormatter={yTickMoney}
            domain={scale.domain}
            ticks={scale.ticks}
          />
          <YAxis type="category" dataKey="symbol" {...AXIS} width={64} />
          <ReferenceLine x={0} stroke="var(--viz-axis)" strokeWidth={1} />
          <Tooltip
            cursor={{ fill: 'var(--viz-grid)', fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as SymbolPnl
              return (
                <TooltipBox
                  title={
                    <>
                      {row.symbol}
                      <span className="ml-1.5 font-normal text-[var(--muted)]">{row.title}</span>
                    </>
                  }
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
          <Bar
            dataKey="net_pnl"
            name="Net K/Z"
            shape={<RoundedBar axisDir="horizontal" />}
            maxBarSize={22}
          >
            {rows.map((d) => (
              <Cell
                key={d.symbol}
                fill={d.net_pnl >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)'}
              />
            ))}
            <LabelList
              dataKey="net_pnl"
              content={(props) => (
                <SignedLabel
                  {...props}
                  axisDir="horizontal"
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
