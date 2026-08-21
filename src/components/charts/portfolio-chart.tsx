'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS, ChartEmpty, GRID, TooltipBox, moneyRow, yTickMoney } from './base'
import { date } from '@/lib/format'
import type { PortfolioHistoryPoint } from '@/types/db'

const SERIES = [
  { key: 'total_value', label: 'Toplam varlık', color: 'var(--viz-1)' },
  { key: 'market_value', label: 'Hisse değeri', color: 'var(--viz-2)' },
] as const

export default function PortfolioChart({ data }: { data: PortfolioHistoryPoint[] }) {
  if (data.length < 2) {
    return (
      <ChartEmpty>
        Grafik için en az iki günlük veri gerekiyor. İşlem ve fiyat girdikçe burası dolacak.
      </ChartEmpty>
    )
  }

  return (
    <div className="h-72 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="day"
            {...AXIS}
            minTickGap={48}
            tickFormatter={(v: string) => date(v).slice(0, 5)}
          />
          <YAxis {...AXIS} width={72} tickFormatter={yTickMoney} />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={date(String(label))}
                  rows={
                    <>
                      {payload.map((p) => (
                        <tr key={p.dataKey as string}>
                          <td className="pr-2 align-middle">
                            <span
                              className="inline-block h-2 w-2 rounded-full align-middle"
                              style={{ background: p.color }}
                            />
                          </td>
                          <td className="pr-3 text-[var(--muted)]">{p.name}</td>
                          <td className="text-right font-medium">
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                              maximumFractionDigits: 0,
                            }).format(Number(p.value))}
                          </td>
                        </tr>
                      ))}
                      {moneyRow('Nakit', Number(payload[0]?.payload?.cash_balance ?? 0))}
                    </>
                  }
                />
              ) : null
            }
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
