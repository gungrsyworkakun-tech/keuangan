import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, Empty } from './ui'
import { BarChart, Donut } from '../components/charts'
import { rupiah } from '../lib/format'
import { JENIS_INVESTASI } from '../lib/store'
import { call, MODE_SHEETS } from '../lib/api'
import EditDialog from './edit-dialog'

const SUMBER = [['', 'Isi nilai manual'], ['emas', 'Emas (per gram, harga dunia)'], ['kripto', 'Kripto (kode CoinGecko)'], ['saham', 'Saham BEI (kode saham)']]
const JENIS_DARI_SUMBER = { emas: 'Emas', kripto: 'Kripto', saham: 'Saham' }
const SATUAN = { emas: 'gram', kripto: 'koin', saham: 'lembar' }
const kunci = (i) => i.sumber + ':' + (i.sumber === 'emas' ? '' : (i.kode || ''))
const waktuLabel = (iso) => iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

export default function Investasi({ state, dispatch }) {
  const [f, setF] = useState({ name: '', type: JENIS_INVESTASI[0], invested: '', sumber: '', kode: '', qty: '' })
  const [ed, setEd] = useState(null)
  const [harga, setHarga] = useState({})        // { 'emas:': {p, t} | {err} }
  const [muat, setMuat] = useState('idle')      // idle | loading | ok | error
  const otomatis = useMemo(() => state.investments.filter((i) => i.sumber), [state.investments])
  const daftarKey = otomatis.map(kunci).join('|')

  const segarkan = useCallback(async () => {
    if (!MODE_SHEETS || !otomatis.length) return
    setMuat('loading')
    try {
      const unik = [...new Map(otomatis.map((i) => [kunci(i), { sumber: i.sumber, kode: i.kode || '' }])).values()]
      const r = await call('harga', { daftar: unik })
      if (!r.ok) throw new Error(r.error)
      setHarga(r.harga || {}); setMuat('ok')
    } catch { setMuat('error') }
  }, [daftarKey])
  useEffect(() => { segarkan() }, [segarkan])

  // nilai sekarang: kalau ada harga pasar -> jumlah x harga, kalau tidak -> nilai tersimpan
  const nilai = (i) => (i.sumber && harga[kunci(i)]?.p ? Math.round(i.qty * harga[kunci(i)].p) : i.value)
  // simpan nilai terbaru ke data supaya Ringkasan ikut sama
  useEffect(() => {
    otomatis.forEach((i) => { const n = nilai(i); if (harga[kunci(i)]?.p && Math.abs(n - i.value) >= 1) dispatch({ type: 'updateInvestment', id: i.id, patch: { value: n } }) })
  }, [harga, state.investments])

  const tot = state.investments.reduce((a, i) => ({ inv: a.inv + i.invested, val: a.val + nilai(i) }), { inv: 0, val: 0 })
  const gain = tot.val - tot.inv
  const add = (e) => {
    e.preventDefault()
    const auto = Boolean(f.sumber)
    if (!f.name.trim() || !(Number(f.invested) > 0)) return
    if (auto && !(Number(f.qty) > 0)) return
    if (f.sumber && f.sumber !== 'emas' && !f.kode.trim()) return
    dispatch({ type: 'addInvestment', payload: { name: f.name.trim(), type: f.type, invested: Number(f.invested), value: Number(f.invested), sumber: f.sumber, kode: f.sumber === 'emas' ? '' : f.kode.trim(), qty: auto ? Number(f.qty) : 0 } })
    setF({ ...f, name: '', invested: '', kode: '', qty: '' })
  }
  const pilihSumber = (sumber) => setF({ ...f, sumber, type: JENIS_DARI_SUMBER[sumber] || f.type })
  const perJenis = {}
  state.investments.forEach((i) => (perJenis[i.type] = (perJenis[i.type] || 0) + nilai(i)))
  const alok = Object.entries(perJenis).map(([label, value]) => ({ label, value })).filter((x) => x.value > 0)
  const batang = state.investments.map((i) => ({ label: i.name.length > 9 ? i.name.slice(0, 8) + '…' : i.name, modal: i.invested, nilai: nilai(i) }))
  const waktuTerbaru = Object.values(harga).map((h) => h.t).filter(Boolean).sort().pop()
  return (
    <>
      <section className="hero">
        <small>Nilai investasi sekarang</small>
        <div className="hero-amt">{rupiah(tot.val)}</div>
        <div className="hero-sub">
          <div><small>Modal</small><b>{rupiah(tot.inv)}</b></div>
          <div><small>Untung / rugi</small><b className={gain >= 0 ? 'pos' : 'neg'}>{gain >= 0 ? '+' : '−'}{rupiah(Math.abs(gain))}{tot.inv ? ` (${((gain / tot.inv) * 100).toFixed(1)}%)` : ''}</b></div>
        </div>
      </section>
      {otomatis.length > 0 && (
        <div className="hargabar">
          <span>{muat === 'loading' ? 'Mengambil harga terbaru…' : muat === 'ok' ? `Harga pasar diperbarui ${waktuLabel(waktuTerbaru)}` : muat === 'error' ? 'Harga belum bisa diambil, memakai nilai terakhir' : MODE_SHEETS ? '' : 'Harga otomatis aktif setelah terhubung ke Google Sheets'}</span>
          {MODE_SHEETS && <button className="btn sm" onClick={segarkan} disabled={muat === 'loading'}>Perbarui harga</button>}
        </div>
      )}
      <div className="grid-main">
        <Panel title="Modal vs nilai sekarang" sub="Per aset">
          {batang.length === 0 ? <Empty>Belum ada investasi.</Empty> : <BarChart data={batang} series={[{ key: 'modal', label: 'Modal', color: 'var(--data-2)' }, { key: 'nilai', label: 'Nilai sekarang', color: 'var(--data-1)' }]} />}
        </Panel>
        <Panel title="Alokasi aset" sub="Berdasarkan nilai sekarang">
          {alok.length === 0 ? <Empty>Belum ada investasi.</Empty> : <Donut items={alok} />}
        </Panel>
      </div>
      <Panel title="Portofolio" sub="Selisih nilai sekarang dengan modal">
        {state.investments.length === 0 ? <Empty>Belum ada investasi.</Empty> : state.investments.map((i) => {
          const n = nilai(i), g = n - i.invested, h = i.sumber ? harga[kunci(i)] : null
          return (
            <div key={i.id} className="trow">
              <div>
                <strong>{i.name}</strong>
                <small>{i.type} · modal {rupiah(i.invested)}</small>
                {i.sumber && <small>{i.qty} {SATUAN[i.sumber]}{h?.p ? ` × ${rupiah(h.p)}/${SATUAN[i.sumber]}` : h?.err ? ` · ${h.err}` : ''}</small>}
                <button className="linkbtn" onClick={() => setEd(i)}>Ubah / hapus</button>
              </div>
              <div className="right">
                {i.sumber
                  ? <b className="num">{rupiah(n)}</b>
                  : <label className="mini">Nilai<input type="number" inputMode="numeric" defaultValue={i.value} onBlur={(e) => Number(e.target.value) >= 0 && Number(e.target.value) !== i.value && dispatch({ type: 'updateInvestmentValue', id: i.id, value: Number(e.target.value) })} /></label>}
                <small className={g >= 0 ? 'in' : 'out'}>{g >= 0 ? '+' : '−'}{rupiah(Math.abs(g))}{i.invested ? ` (${((g / i.invested) * 100).toFixed(1)}%)` : ''}</small>
              </div>
            </div>
          )
        })}
      </Panel>
      <EditDialog item={ed} title="Ubah investasi" onClose={() => setEd(null)}
        fields={[
          { k: 'name', label: 'Nama', type: 'text' },
          { k: 'type', label: 'Jenis', type: 'select', options: JENIS_INVESTASI.map((j) => [j, j]) },
          { k: 'invested', label: 'Modal (Rp)', type: 'number', min: 0 },
          { k: 'sumber', label: 'Cara hitung nilai', type: 'select', options: SUMBER },
          { k: 'kode', label: 'Kode (mis. BBCA / bitcoin)', type: 'text', tampilJika: (x) => x.sumber === 'kripto' || x.sumber === 'saham' },
          { k: 'qty', label: 'Jumlah (gram / koin / lembar)', type: 'number', min: 0, tampilJika: (x) => Boolean(x.sumber) },
          { k: 'value', label: 'Nilai sekarang (Rp)', type: 'number', min: 0, tampilJika: (x) => !x.sumber },
        ]}
        onSave={(patch) => dispatch({ type: 'updateInvestment', id: ed.id, patch: { ...patch, sumber: patch.sumber || '', kode: patch.sumber === 'emas' || !patch.sumber ? '' : patch.kode } })}
        onDelete={() => dispatch({ type: 'deleteInvestment', id: ed.id })} />
      <Panel title="Tambah investasi">
        <form className="stack" onSubmit={add}>
          <div className="inline">
            <input placeholder="Nama (mis. Emas Antam)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama investasi" />
            <select value={f.sumber} onChange={(e) => pilihSumber(e.target.value)} aria-label="Cara hitung nilai">{SUMBER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div className="inline">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Jenis">{JENIS_INVESTASI.map((j) => <option key={j}>{j}</option>)}</select>
            {(f.sumber === 'kripto' || f.sumber === 'saham') && <input placeholder={f.sumber === 'saham' ? 'Kode saham, mis. BBCA' : 'ID koin, mis. bitcoin'} value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} aria-label="Kode" />}
            {f.sumber && <input type="number" inputMode="decimal" step="any" placeholder={'Jumlah (' + SATUAN[f.sumber] + ')'} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} aria-label="Jumlah" />}
            <input type="number" inputMode="numeric" placeholder="Modal / total beli (Rp)" value={f.invested} onChange={(e) => setF({ ...f, invested: e.target.value })} aria-label="Modal" />
            <button className="btn primary">Tambah</button>
          </div>
        </form>
        <small className="hint">Pilih “Emas” lalu isi jumlah gram: nilainya otomatis ikut harga emas hari ini, dan untung/rugi dihitung dari modal. Harga emas memakai harga dunia (acuan), bisa sedikit berbeda dari harga toko atau Antam.</small>
      </Panel>
    </>
  )
}
