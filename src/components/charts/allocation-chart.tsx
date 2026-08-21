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
import { AXIS, ChartEmpty, GRID, RoundedBar, TooltipBox, moneyRow, yTickMoney } from './base'
import { TooltipRow } from './base'

export type AllocationRow = {
  symbol: string
  title?: string | null
  value: number
  cost: number
}

/**
 * Portföy ağırlığı: hangi hisse portföyün ne kadarını oluşturuyor.
 * Büyüklük çubuk uzunluğuyla taşındığı için tek renk yeterli — renk burada
 * bir bilgi taşımıyor, ayrım yüzde etiketleriyle yapılıyor.
 */
export default function AllocationChart({ data }: { data: AllocationRow[] }) {
  const toplam = data.reduce((s, d) => s + Number(d.value), 0)
  const rows = data
    .filter((d) => Number(d.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))
    .map((d) => ({ ...d, pay: toplam > 0 ? (Number(d.value) / toplam) * 100 : 0 }))

  if (rows.length === 0) {
    return <ChartEmpty>Açık pozisyon yok. Bir alış kaydettiğinizde burası dolacak.</ChartEmpty>
  }

  return (
    <div className="px-2 py-4" style={{ height: Math.max(180, rows.length * 34 + 48) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
          <CartesianGrid {...GRID} vertical horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={yTickMoney} />
          <YAxis type="category" dataKey="symbol" {...AXIS} width={64} />
          <Tooltip
            cursor={{ fill: 'var(--viz-grid)', fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as AllocationRow & { pay: number }
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
                      {moneyRow('Piyasa değeri', Number(row.value), 'var(--viz-1)')}
                      {moneyRow('Maliyet', Number(row.cost))}
                      <TooltipRow
                        label="Portföy payı"
                        value={`%${row.pay.toLocaleString('tr-TR', {
                          maximumFractionDigits: 1,
                        })}`}
                      />
                    </>
                  }
                />
              )
            }}
          />
          <Bar
            dataKey="value"
            name="Piyasa değeri"
            fill="var(--viz-1)"
            shape={<RoundedBar axisDir="horizontal" />}
            maxBarSize={22}
          >
            <LabelList
              dataKey="pay"
              position="right"
              fontSize={10}
              fill="var(--muted)"
              formatter={(v) =>
                `%${Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
