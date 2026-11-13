import { useMemo, useState } from 'react'
import { Panel, Progress, Empty } from './ui'
import { rupiah, bulanKey, bulanLabel, tanggal } from '../lib/format'
import { adalahTransfer, posDari, adalahBulan } from '../lib/store'

const geser = (key, n) => { const [y, m] = key.split('-').map(Number); const i = y * 12 + m - 1 + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}` }
const bulat = (n) => Math.round(n / 10000) * 10000
const persen = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

export default function Rekap({ state, dispatch }) {
  const tx = state.transactions.filter((t) => !adalahTransfer(t))
  const months = useMemo(() => [...new Set(tx.map((t) => bulanKey(t.date)))].sort().reverse(), [state.transactions])
  const [pilih, setPilih] = useState(months[0])
  const key = months.includes(pilih) ? pilih : months[0]
  if (!key) return <Empty>Belum ada transaksi. Catat transaksi dulu, nanti rekap dan saran muncul di sini.</Empty>

  const jumlah = (k, type) => tx.filter((t) => bulanKey(t.date) === k && t.type === type).reduce((a, t) => a + t.amount, 0)
  const perKat = (k) => { const o = {}; tx.filter((t) => bulanKey(t.date) === k && t.type === 'out').forEach((t) => (o[t.category] = (o[t.category] || 0) + t.amount)); return o }
  const masuk = jumlah(key, 'in'), keluar = jumlah(key, 'out'), selisih = masuk - keluar
  const kini = perKat(key), lalu = perKat(geser(key, -1))
  const daftar = Object.entries(kini).sort((a, b) => b[1] - a[1])
  const maks = daftar[0]?.[1] || 0
  const batas = (c) => state.budgets.find((b) => b.category === c)?.limit || 0
  const ditabung = (state.savings || []).filter((x) => adalahBulan(x) && x.amount > 0 && x.month === key).reduce((a, x) => a + x.amount, 0)
  const terbesar = tx.filter((t) => bulanKey(t.date) === key && t.type === 'out').sort((a, b) => b.amount - a.amount).slice(0, 5)

  // rata-rata pengeluaran 3 bulan terakhir (sampai bulan terpilih) untuk saran batas & dana darurat
  const tiga = [0, -1, -2].map((n) => geser(key, n)).filter((k) => months.includes(k))
  const rata3 = tiga.length ? tiga.reduce((a, k) => a + jumlah(k, 'out'), 0) / tiga.length : 0
  const darurat = (state.savings || []).filter((x) => posDari(x) === 'darurat' && adalahBulan(x)).reduce((a, x) => a + x.amount, 0)

  const tanda = (c, v) => {
    const t = []
    if (persen(v, keluar) >= 35 && daftar.length > 2) t.push('Porsi besar')
    if (batas(c) && v > batas(c)) t.push('Lewat anggaran')
    const l = lalu[c] || 0
    if (l > 0 && v >= l * 1.25 && v - l >= 100000) t.push('Naik tajam')
    return t
  }

  const saran = []
  if (selisih < 0) saran.push({ judul: 'Pengeluaran lebih besar dari pemasukan', isi: `Bulan ini defisit ${rupiah(-selisih)}. Itu berarti kamu memakai tabungan atau saldo lama. Mulai kurangi dari kategori terbesar di bawah, dan tunda belanja yang bukan kebutuhan.` })
  if (masuk > 0 && ditabung < masuk * 0.2) saran.push({ judul: 'Sisihkan tabungan di awal bulan', isi: `Tabungan bulan ini ${rupiah(ditabung)} (${persen(ditabung, masuk)}% dari pemasukan). Patokan yang mudah: sisihkan sekitar 20%, yaitu ${rupiah(bulat(masuk * 0.2))}, begitu gajian, jangan menunggu sisa di akhir bulan.` })
  if (daftar.length > 2 && persen(daftar[0][1], keluar) >= 35) {
    const [c, v] = daftar[0]
    saran.push({ judul: `${c} paling besar`, isi: `${c} menghabiskan ${persen(v, keluar)}% pengeluaran (${rupiah(v)}). Turun 10–15% saja sudah menghemat sekitar ${rupiah(bulat(v * 0.1))}–${rupiah(bulat(v * 0.15))} per bulan.` })
  }
  daftar.forEach(([c, v]) => {
    const l = lalu[c] || 0
    if (l > 0 && v >= l * 1.25 && v - l >= 100000) saran.push({ judul: `${c} naik dibanding bulan lalu`, isi: `Naik ${rupiah(v - l)} (dari ${rupiah(l)} jadi ${rupiah(v)}). Cek transaksinya: kalau bukan kebutuhan sekali-sekali, batasi supaya tidak jadi kebiasaan.` })
    if (batas(c) && v > batas(c)) saran.push({ judul: `${c} melewati anggaran`, isi: `Terpakai ${rupiah(v)} dari batas ${rupiah(batas(c))}, lebih ${rupiah(v - batas(c))}. Kurangi bulan depan atau naikkan batas kalau memang kebutuhannya naik.` })
  })
  const tanpa = daftar.filter(([c, v]) => !batas(c) && persen(v, keluar) >= 10)
  if (tanpa.length) saran.push({ judul: 'Beri batas anggaran', isi: `${tanpa.map(([c]) => c).join(', ')} belum punya batas. Pakai saran batas di bawah supaya pengeluaran lebih terkendali.` })
  if ((kini['Lainnya'] || 0) > 0 && persen(kini['Lainnya'], keluar) >= 15) saran.push({ judul: 'Terlalu banyak di “Lainnya”', isi: `${persen(kini['Lainnya'], keluar)}% pengeluaran masuk “Lainnya” (${rupiah(kini['Lainnya'])}). Pilih kategori yang lebih tepat saat mencatat supaya kelihatan boros di mana.` })
  if (rata3 > 0) {
    const butuh = rata3 * 3
    saran.push(darurat >= butuh
      ? { judul: 'Dana darurat sudah aman', isi: `Dana darurat ${rupiah(darurat)} sudah menutup lebih dari 3 bulan pengeluaran (${rupiah(butuh)}). Pertahankan, jangan dipakai untuk keinginan.`, baik: true }
      : { judul: 'Lengkapi dana darurat', isi: `Dana darurat ${rupiah(darurat)}. Patokan minimal 3 bulan pengeluaran, yaitu ${rupiah(butuh)}. Masih kurang ${rupiah(butuh - darurat)}; isi lewat menu Tabungan, pos Dana darurat.` })
  }
  if (selisih >= 0 && !saran.some((s) => !s.baik)) saran.unshift({ judul: 'Keuangan bulan ini sehat', isi: 'Pemasukan cukup, pengeluaran terkendali. Pertahankan polanya.', baik: true })

  // saran batas anggaran: rata-rata 3 bulan dikurangi 10%
  const batasSaran = daftar.slice(0, 6).map(([c]) => {
    const rata = tiga.reduce((a, k) => a + (perKat(k)[c] || 0), 0) / (tiga.length || 1)
    return { c, rata, usul: Math.max(10000, bulat(rata * 0.9)), kini: batas(c) }
  }).filter((x) => !x.kini || x.usul < x.kini) // batas yang sudah ada tidak disarankan naik

  return (
    <>
      <div className="chips" role="group" aria-label="Pilih bulan" style={{ marginBottom: 12 }}>
        {months.map((m) => <button key={m} className={'chip' + (m === key ? ' on' : '')} aria-pressed={m === key} onClick={() => setPilih(m)}>{bulanLabel(m)}</button>)}
      </div>
      <section className="hero">
        <small>Selisih {bulanLabel(key)}</small>
        <div className="hero-amt">{selisih < 0 ? '−' : ''}{rupiah(Math.abs(selisih))}</div>
        <div className="hero-sub">
          <div><small>Pemasukan</small><b>{rupiah(masuk)}</b></div>
          <div><small>Pengeluaran</small><b>{rupiah(keluar)}</b></div>
          <div><small>Ditabung</small><b>{rupiah(ditabung)}</b></div>
        </div>
      </section>

      <Panel title="Ke mana uangnya pergi" sub="Urut dari yang terbesar, dibandingkan bulan lalu">
        {daftar.length === 0 ? <Empty>Tidak ada pengeluaran di bulan ini.</Empty> : daftar.map(([c, v]) => {
          const l = lalu[c] || 0, t = tanda(c, v)
          return (
            <div key={c} className="budget">
              <div className="trow">
                <div>
                  <strong>{c}</strong>
                  <small>{persen(v, keluar)}% dari pengeluaran{l > 0 ? ` · ${v >= l ? '▲' : '▼'} ${rupiah(Math.abs(v - l))} vs bulan lalu` : ''}</small>
                  {t.length > 0 && <small className="out">{t.join(' · ')}</small>}
                </div>
                <b className="num">{rupiah(v)}</b>
              </div>
              <Progress value={v} max={maks} warn={t.length > 0} />
            </div>
          )
        })}
      </Panel>

      <Panel title="Saran agar keuangan stabil" sub="Dihitung dari data bulan ini">
        {saran.length === 0 ? <Empty>Belum ada saran.</Empty> : saran.map((s, i) => (
          <div key={i} className="budget"><strong>{s.baik ? '✅ ' : '💡 '}{s.judul}</strong><p style={{ margin: '4px 0 0' }}>{s.isi}</p></div>
        ))}
      </Panel>

      {batasSaran.length > 0 && (
        <Panel title="Saran batas anggaran" sub={`Rata-rata ${tiga.length} bulan terakhir dikurangi 10% (target hemat)`}>
          {batasSaran.map((x) => (
            <div key={x.c} className="budget"><div className="trow">
              <div><strong>{x.c}</strong><small>Rata-rata {rupiah(Math.round(x.rata))} · batas sekarang {x.kini ? rupiah(x.kini) : 'belum ada'}</small></div>
              <button className="btn" onClick={() => dispatch({ type: 'setBudget', category: x.c, limit: x.usul })}>Pakai {rupiah(x.usul)}</button>
            </div></div>
          ))}
        </Panel>
      )}

      {terbesar.length > 0 && (
        <Panel title="Pengeluaran terbesar" sub={bulanLabel(key)}>
          {terbesar.map((t) => <div key={t.id} className="trow"><div><strong>{t.desc}</strong><small>{t.category} · {tanggal(t.date)}</small></div><b className="num">{rupiah(t.amount)}</b></div>)}
        </Panel>
      )}
    </>
  )
}
