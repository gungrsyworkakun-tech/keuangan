import { useState } from 'react'
import { Panel } from './ui'
import { LineChart } from '../components/charts'
import { rupiah } from '../lib/format'
import { setoranDiperlukan, bulanTercapai, proyeksi, geserBulanKey } from '../lib/hitung'
import { bulanLabel, hariIni } from '../lib/format'

const selisihBulan = (dari, ke) => (+ke.slice(0, 4) - +dari.slice(0, 4)) * 12 + (+ke.slice(5, 7) - +dari.slice(5, 7))

export default function Simulasi({ goals }) {
  const [id, setId] = useState('')
  const [mode, setMode] = useState('setoran') // setoran = berapa per bulan; lama = berapa lama
  const [v, setV] = useState({ target: '', awal: '', bulan: '12', setoran: '', bunga: '0' })
  const g = goals.find((x) => x.id === id)
  const target = g ? g.target : Number(v.target), awal = g ? g.saved : Number(v.awal) || 0
  const bulanDeadline = g && g.deadline ? Math.max(1, selisihBulan(hariIni().slice(0, 7), g.deadline.slice(0, 7))) : null
  const bulan = mode === 'setoran' ? Math.round(Number(v.bulan)) || (bulanDeadline ?? 12) : 0
  const bunga = Math.min(30, Math.max(0, Number(v.bunga) || 0))
  const ok = target > 0
  let hasil = null, titik = []
  if (ok && mode === 'setoran' && bulan > 0) {
    const s = Math.ceil(setoranDiperlukan({ target, awal, bulan, bungaTahun: bunga }))
    hasil = s === 0 ? 'Targetmu sudah tercapai tanpa setoran tambahan.' : `Setor sekitar ${rupiah(s)} per bulan selama ${bulan} bulan.`
    titik = proyeksi({ awal, setoran: s, bungaTahun: bunga, bulan })
  } else if (ok && mode === 'lama') {
    const s = Number(v.setoran)
    if (s > 0 || awal >= target) {
      const n = bulanTercapai({ target, awal, setoran: s, bungaTahun: bunga })
      if (n === null) hasil = 'Dengan setoran segitu target tidak tercapai dalam 100 tahun. Naikkan setoran.'
      else if (n === 0) hasil = 'Targetmu sudah tercapai.'
      else { hasil = `Target tercapai sekitar ${n} bulan lagi (${bulanLabel(geserBulanKey(hariIni().slice(0, 7), n))}).`; titik = proyeksi({ awal, setoran: s, bungaTahun: bunga, bulan: Math.min(n, 120) }) }
    }
  }
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <Panel title="Simulasi target" sub="Hitung-hitungan saja, tidak mengubah datamu">
      <div className="stack">
        <label>Untuk goal
          <select value={id} onChange={(e) => { setId(e.target.value); setV((x) => ({ ...x, bulan: '' })) }}>
            <option value="">Target bebas (isi sendiri)</option>
            {goals.map((x) => <option key={x.id} value={x.id}>{x.name} · {rupiah(x.target)}</option>)}
          </select>
        </label>
        {!g && <>
          <label>Target (Rp)<input type="number" inputMode="numeric" min="0" value={v.target} onChange={set('target')} /></label>
          <label>Sudah punya (Rp)<input type="number" inputMode="numeric" min="0" value={v.awal} onChange={set('awal')} /></label>
        </>}
        {g && <p className="hint">Sudah terkumpul {rupiah(g.saved)} dari {rupiah(g.target)}{bulanDeadline ? `. Batas waktu ${bulanDeadline} bulan lagi.` : '.'}</p>}
        <div className="seg seg-full">{[['setoran', 'Berapa per bulan?'], ['lama', 'Berapa lama?']].map(([k, l]) => <button key={k} type="button" className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>
        {mode === 'setoran'
          ? <label>Dalam berapa bulan<input type="number" inputMode="numeric" min="1" placeholder={bulanDeadline ? String(bulanDeadline) : '12'} value={v.bulan} onChange={set('bulan')} /></label>
          : <label>Setoran per bulan (Rp)<input type="number" inputMode="numeric" min="0" value={v.setoran} onChange={set('setoran')} /></label>}
        <label>Perkiraan bunga / keuntungan per tahun (%) <small className="hint">isi 0 kalau tidak mau memperhitungkan</small><input type="number" inputMode="decimal" min="0" max="30" value={v.bunga} onChange={set('bunga')} /></label>
        {hasil && <p role="status"><b>{hasil}</b></p>}
        {titik.length > 1 && <LineChart data={titik.map((p, i) => ({ label: i + ' bln', value: Math.round(p) }))} height={160} />}
        <small className="hint">Ini perkiraan. Bunga dianggap tetap dan setoran dilakukan tiap akhir bulan.</small>
      </div>
    </Panel>
  )
}
