import { useId, useLayoutEffect, useRef, useState } from 'react'
import { rupiah, ringkas } from '../lib/format'

export const warna = (i) => `var(--data-${(i % 6) + 1})`

function useLebar() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

// skala sumbu Y yang "rapi" (0, 2 jt, 4 jt, ...)
function skala(max) {
  if (max <= 0) return { top: 1, list: [0, 1] }
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
  const top = Math.ceil(max / step) * step
  const list = []
  for (let v = 0; v <= top + 1e-9; v += step) list.push(v)
  return { top, list }
}

export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((it, i) => (
        <li key={it.label}><span className="sw" style={{ background: it.color || warna(i) }} />{it.label}</li>
      ))}
    </ul>
  )
}

/** Grafik batang berkelompok. data: [{label, a, b}], series: [{key,label,color}] */
export function BarChart({ data, series, height = 220 }) {
  const [ref, w] = useLebar()
  const pad = { l: 44, r: 6, t: 8, b: 26 }
  const maxVal = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)))
  const { top, list } = skala(maxVal)
  const iw = Math.max(0, w - pad.l - pad.r), ih = height - pad.t - pad.b
  const gw = data.length ? iw / data.length : 0
  const bw = Math.max(4, Math.min(26, (gw * 0.72) / series.length))
  const grup = bw * series.length + 4 * (series.length - 1)
  const y = (v) => pad.t + ih - (v / top) * ih
  const ringkasan = data.map((d) => `${d.label}: ` + series.map((s) => `${s.label} ${rupiah(d[s.key] || 0)}`).join(', ')).join('; ')
  return (
    <>
      <div ref={ref} className="chartbox" style={{ height }}>
        {w > 0 && (
          <svg width={w} height={height} role="img" aria-label={ringkasan}>
            {list.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{ringkas(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const x0 = pad.l + gw * i + (gw - grup) / 2
              return (
                <g key={d.label + i}>
                  {series.map((s, j) => {
                    const v = d[s.key] || 0
                    const h = (v / top) * ih
                    return (
                      <rect key={s.key} x={x0 + j * (bw + 4)} y={pad.t + ih - h} width={bw} height={Math.max(h, v > 0 ? 2 : 0)} rx="3" style={{ fill: s.color }}>
                        <title>{`${d.label} · ${s.label}: ${rupiah(v)}`}</title>
                      </rect>
                    )
                  })}
                  <text x={pad.l + gw * i + gw / 2} y={height - 8} textAnchor="middle" className="axis">{d.label}</text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
      {series.length > 1 && <Legend items={series} />}
    </>
  )
}

/** Donat + legenda. items: [{label, value, color?}] */
export function Donut({ items, tengah, sub, size = 148 }) {
  const total = items.reduce((a, i) => a + i.value, 0)
  const r = size / 2 - 12, c = 2 * Math.PI * r, mid = size / 2
  let acc = 0
  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={items.map((i) => `${i.label} ${rupiah(i.value)}`).join(', ')}>
        <circle cx={mid} cy={mid} r={r} fill="none" strokeWidth="20" className="track" />
        {items.map((it, i) => {
          const len = total ? (it.value / total) * c : 0
          const el = (
            <circle key={it.label} cx={mid} cy={mid} r={r} fill="none" strokeWidth="20" style={{ stroke: it.color || warna(i) }}
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${c - Math.max(len - 1.5, 0)}`} strokeDashoffset={-acc} transform={`rotate(-90 ${mid} ${mid})`}>
              <title>{`${it.label}: ${rupiah(it.value)}`}</title>
            </circle>
          )
          acc += len
          return el
        })}
        {tengah && <text x={mid} y={mid - 2} textAnchor="middle" className="dc-main">{tengah}</text>}
        {sub && <text x={mid} y={mid + 14} textAnchor="middle" className="dc-sub">{sub}</text>}
      </svg>
      <ul className="dlegend">
        {items.map((it, i) => (
          <li key={it.label}>
            <span className="sw" style={{ background: it.color || warna(i) }} />
            <span className="nm">{it.label}</span>
            <b>{total ? Math.round((it.value / total) * 100) : 0}%</b>
            <small>{rupiah(it.value)}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Grafik garis + area. data: [{label, value}] (boleh negatif) */
export function LineChart({ data, height = 200, color = 'var(--data-1)' }) {
  const [ref, w] = useLebar()
  const gid = useId()
  const pad = { l: 44, r: 14, t: 10, b: 26 }
  const vals = data.map((d) => d.value)
  const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals)
  const rentang = maxV - minV || 1
  const iw = Math.max(0, w - pad.l - pad.r), ih = height - pad.t - pad.b
  const x = (i) => pad.l + (data.length === 1 ? iw / 2 : (iw * i) / (data.length - 1))
  const y = (v) => pad.t + ih - ((v - minV) / rentang) * ih
  const garis = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ')
  const area = data.length > 1 ? `${garis} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : ''
  const ticks = [maxV, (maxV + minV) / 2, minV].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div ref={ref} className="chartbox" style={{ height }}>
      {w > 0 && data.length > 0 && (
        <svg width={w} height={height} role="img" aria-label={data.map((d) => `${d.label}: ${rupiah(d.value)}`).join('; ')}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{ringkas(t)}</text>
            </g>
          ))}
          <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} className="zero" />
          {area && <path d={area} fill={`url(#${gid})`} />}
          <path d={garis} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: color }} />
          {data.map((d, i) => (
            <g key={d.label + i}>
              <circle cx={x(i)} cy={y(d.value)} r="4" className="dot-pt" style={{ stroke: color }}><title>{`${d.label}: ${rupiah(d.value)}`}</title></circle>
              <text x={x(i)} y={height - 8} textAnchor="middle" className="axis">{d.label}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

/** Cincin progres untuk goal */
export function Ring({ value, max, size = 76 }) {
  const pct = max ? Math.min(1, value / max) : 0
  const r = size / 2 - 7, c = 2 * Math.PI * r, mid = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct * 100)} persen tercapai`}>
      <circle cx={mid} cy={mid} r={r} fill="none" strokeWidth="9" className="track" />
      <circle cx={mid} cy={mid} r={r} fill="none" strokeWidth="9" strokeLinecap="round" style={{ stroke: pct >= 1 ? 'var(--color-success)' : 'var(--color-primary)' }}
        strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${mid} ${mid})`} />
      <text x={mid} y={mid + 5} textAnchor="middle" className="ring-t">{Math.round(pct * 100)}%</text>
    </svg>
  )
}
