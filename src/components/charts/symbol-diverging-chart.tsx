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

export type DivergingRow = {
  symbol: string
  title?: string | null
  value: number
  /** Tooltip'te gösterilecek ek satırlar */
  detay?: { etiket: string; tutar: number }[]
}

/**
 * Hisse bazlı ıraksak yatay çubuk: sıfırın sağı kâr, solu zarar.
 * İşaret renkle taşınmasın diye her çubuğun ucunda işaretli değer etiketi var.
 */
export default function SymbolDivergingChart({
  data,
  limit = 12,
  bos = 'Gösterilecek veri yok.',
}: {
  data: DivergingRow[]
  limit?: number
  bos?: string
}) {
  const rows = data
    .filter((d) => Number(d.value) !== 0)
    .sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))
    .slice(0, limit)
    .sort((a, b) => Number(b.value) - Number(a.value))

  if (rows.length === 0) return <ChartEmpty>{bos}</ChartEmpty>

  const values = rows.map((r) => Number(r.value))
  const scale = niceScale(Math.min(...values), Math.max(...values))

  return (
    <div className="px-2 py-4" style={{ height: Math.max(180, rows.length * 34 + 48) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
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
              const row = payload[0].payload as DivergingRow
              return (
                <TooltipBox
                  title={
                    <>
                      {row.symbol}
                      {row.title ? (
                        <span className="ml-1.5 font-normal text-[var(--muted)]">{row.title}</span>
                      ) : null}
                    </>
                  }
                  rows={
                    <>
                      {moneyRow(
                        Number(row.value) >= 0 ? 'Kâr' : 'Zarar',
                        Number(row.value),
                        Number(row.value) >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)',
                      )}
                      {(row.detay ?? []).map((d) => moneyRow(d.etiket, d.tutar))}
                    </>
                  }
                />
              )
            }}
          />
          <Bar
            dataKey="value"
            name="Kâr/zarar"
            shape={<RoundedBar axisDir="horizontal" />}
            maxBarSize={22}
          >
            {rows.map((d) => (
              <Cell
                key={d.symbol}
                fill={Number(d.value) >= 0 ? 'var(--viz-profit)' : 'var(--viz-loss)'}
              />
            ))}
            <LabelList
              dataKey="value"
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
