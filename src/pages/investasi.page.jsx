import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, Empty } from './ui'
import { BarChart, Donut } from '../components/charts'
import { rupiah, hariIni } from '../lib/format'
import { JENIS_INVESTASI } from '../lib/store'
import { call, MODE_SHEETS } from '../lib/api'
import EditDialog from './edit-dialog'

const SUMBER = [['', 'Isi nilai manual'], ['emasid', 'Emas toko Indonesia (Antam, Galeri 24, UBS)'], ['emas', 'Emas harga dunia (acuan)'], ['kripto', 'Kripto (kode CoinGecko)'], ['saham', 'Saham BEI (kode saham)']]
const EMAS_ID = [['ANTAM|buyback', 'Antam · harga buyback (jual kembali)'], ['ANTAM|jual', 'Antam · harga jual (beli)'], ['GALERI 24|buyback', 'Galeri 24 · harga buyback'], ['GALERI 24|jual', 'Galeri 24 · harga jual'], ['UBS|buyback', 'UBS · harga buyback'], ['UBS|jual', 'UBS · harga jual']]
const JENIS_DARI_SUMBER = { emasid: 'Emas', emas: 'Emas', kripto: 'Kripto', saham: 'Saham' }
const SATUAN = { emasid: 'gram', emas: 'gram', kripto: 'koin', saham: 'lembar' }
const kunci = (i) => i.sumber + ':' + (i.sumber === 'emas' ? '' : (i.kode || ''))
const waktuLabel = (iso) => iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

export default function Investasi({ state, dispatch }) {
  const [f, setF] = useState({ name: '', type: JENIS_INVESTASI[0], invested: '', sumber: '', kode: '', qty: '' })
  const [ed, setEd] = useState(null)
  const [d, setD] = useState({ mode: 'tambah', id: '', amount: '', qty: '', acc: '' })
  const [dPesan, setDPesan] = useState({ t: '', ok: false })
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
    if ((f.sumber === 'kripto' || f.sumber === 'saham') && !f.kode.trim()) return
    dispatch({ type: 'addInvestment', payload: { name: f.name.trim(), type: f.type, invested: Number(f.invested), value: Number(f.invested), sumber: f.sumber, kode: f.sumber === 'emas' || !f.sumber ? '' : f.kode.trim(), qty: auto ? Number(f.qty) : 0 } })
    setF({ ...f, name: '', invested: '', kode: '', qty: '' })
  }
  const pilih = state.investments.find((i) => i.id === d.id) || state.investments[0]
  const hargaHariIni = pilih?.sumber ? harga[kunci(pilih)]?.p || 0 : 0
  const unitOtomatis = hargaHariIni > 0 && Number(d.amount) > 0 ? Math.round((Number(d.amount) / hargaHariIni) * 1e6) / 1e6 : 0
  const kirimDana = (e) => {
    e.preventDefault()
    if (!pilih) return
    const amount = Number(d.amount), n = nilai(pilih)
    const gagal = (t) => setDPesan({ t, ok: false })
    if (!(amount > 0)) return gagal('Jumlah (Rp) harus lebih dari 0')
    // jumlah unit: diisi manual kalau ada, kalau tidak dihitung otomatis dari harga pasar hari ini
    const qty = Number(d.qty) > 0 ? Number(d.qty) : unitOtomatis
    if (pilih.sumber && !(qty > 0)) return gagal('Harga hari ini belum bisa diambil. Isi jumlah ' + SATUAN[pilih.sumber] + ' secara manual, atau tekan “Perbarui harga” dulu')
    if (d.mode === 'tarik' && amount > n) return gagal('Melebihi nilai investasi saat ini (' + rupiah(n) + ')')
    if (d.mode === 'tarik' && qty > (pilih.qty || 0) && pilih.sumber) return gagal('Melebihi jumlah yang dimiliki (' + pilih.qty + ' ' + SATUAN[pilih.sumber] + ')')
    const acc = state.accounts.find((a) => a.id === d.acc)
    if (d.mode === 'tambah' && acc && acc.balance < amount) return gagal('Saldo ' + acc.name + ' tidak cukup')
    dispatch({ type: d.mode === 'tambah' ? 'investTambah' : 'investTarik', id: pilih.id, amount, qty, nilai: n })
    if (acc) dispatch({ type: 'addTransaction', payload: { date: hariIni(), desc: (d.mode === 'tambah' ? 'Setor ke ' : 'Tarik dari ') + pilih.name, amount, type: d.mode === 'tambah' ? 'out' : 'in', category: 'Transfer', accountId: acc.id } })
    setDPesan({ t: d.mode === 'tambah' ? `Dana ${rupiah(amount)} ditambahkan ke ${pilih.name}` : amount >= n ? `${pilih.name} ditarik semua dan dihapus dari portofolio` : `Dana ${rupiah(amount)} ditarik dari ${pilih.name}`, ok: true })
    setD({ ...d, amount: '', qty: '' })
  }
  const pilihSumber = (sumber) => setF({ ...f, sumber, kode: sumber === 'emasid' ? EMAS_ID[0][0] : '', type: JENIS_DARI_SUMBER[sumber] || f.type })
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
      <Panel title="Portofolio" sub="Ketuk untuk mengubah atau menghapus">
        {state.investments.length === 0 ? <Empty>Belum ada investasi.</Empty> : state.investments.map((i) => {
          const n = nilai(i), g = n - i.invested, h = i.sumber ? harga[kunci(i)] : null
          return (
            <button key={i.id} className="trow btnrow" onClick={() => setEd(i)} aria-label={'Ubah ' + i.name}>
              <div>
                <strong>{i.name}</strong>
                <small>{i.type} · modal {rupiah(i.invested)}</small>
                {i.sumber && <small>{i.qty} {SATUAN[i.sumber]}{h?.p ? ` × ${rupiah(h.p)}` : h?.err ? ` · ${h.err}` : ''}</small>}
              </div>
              <div className="right">
                <b className="num">{rupiah(n)}</b>
                <small className={g >= 0 ? 'in' : 'out'}>{g >= 0 ? '+' : '−'}{rupiah(Math.abs(g))}{i.invested ? ` (${((g / i.invested) * 100).toFixed(1)}%)` : ''}</small>
              </div>
            </button>
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
          { k: 'kode', label: 'Merek & jenis harga', type: 'select', options: EMAS_ID, tampilJika: (x) => x.sumber === 'emasid' },
          { k: 'qty', label: 'Jumlah (gram / koin / lembar)', type: 'number', min: 0, tampilJika: (x) => Boolean(x.sumber) },
          { k: 'value', label: 'Nilai sekarang (Rp)', type: 'number', min: 0, tampilJika: (x) => !x.sumber },
        ]}
        onSave={(patch) => dispatch({ type: 'updateInvestment', id: ed.id, patch: { ...patch, sumber: patch.sumber || '', kode: patch.sumber === 'emas' || !patch.sumber ? '' : (patch.sumber === 'emasid' && !/\|/.test(patch.kode || '') ? EMAS_ID[0][0] : patch.kode) } })}
        onDelete={() => dispatch({ type: 'deleteInvestment', id: ed.id })} />
      {state.investments.length > 0 && (
        <Panel title="Tambah atau tarik dana" sub="Untuk investasi yang sudah ada di portofolio">
          <div className="chips" role="group" aria-label="Jenis transaksi" style={{ marginBottom: 12 }}>
            <button type="button" className={'chip' + (d.mode === 'tambah' ? ' on' : '')} onClick={() => { setD({ ...d, mode: 'tambah' }); setDPesan({ t: '', ok: false }) }}>Tambah dana</button>
            <button type="button" className={'chip' + (d.mode === 'tarik' ? ' on' : '')} onClick={() => { setD({ ...d, mode: 'tarik' }); setDPesan({ t: '', ok: false }) }}>Tarik dana</button>
          </div>
          <form className="stack" onSubmit={kirimDana}>
            <div className="inline">
              <select value={pilih?.id || ''} onChange={(e) => setD({ ...d, id: e.target.value })} aria-label="Pilih investasi">{state.investments.map((i) => <option key={i.id} value={i.id}>{i.name} · {rupiah(nilai(i))}</option>)}</select>
              <input type="number" inputMode="numeric" placeholder={d.mode === 'tambah' ? 'Dana yang ditambahkan (Rp)' : 'Dana yang ditarik (Rp)'} value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} aria-label="Jumlah rupiah" />
              {pilih?.sumber && <input type="number" inputMode="decimal" step="any" placeholder={'Otomatis (' + SATUAN[pilih.sumber] + '), boleh diisi sendiri'} value={d.qty} onChange={(e) => setD({ ...d, qty: e.target.value })} aria-label="Jumlah unit" />}
              <select value={d.acc} onChange={(e) => setD({ ...d, acc: e.target.value })} aria-label="Rekening terkait">
                <option value="">Jangan catat ke rekening</option>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{d.mode === 'tambah' ? 'Ambil dari ' : 'Masuk ke '}{a.name}</option>)}
              </select>
              <button className="btn primary">{d.mode === 'tambah' ? 'Tambah' : 'Tarik'}</button>
            </div>
          </form>
          {pilih?.sumber && (
            <p className="hint" role="status">
              {hargaHariIni > 0
                ? `Harga hari ini ${rupiah(hargaHariIni)} per ${SATUAN[pilih.sumber]}${unitOtomatis > 0 && !(Number(d.qty) > 0) ? ` → ${d.mode === 'tambah' ? 'dapat' : 'terjual'} ≈ ${unitOtomatis} ${SATUAN[pilih.sumber]}, terisi otomatis` : ''}`
                : 'Harga hari ini belum tersedia, isi jumlah secara manual atau tekan “Perbarui harga”.'}
            </p>
          )}
          {dPesan.t && <p className={dPesan.ok ? 'hint' : 'empty'} role="status">{dPesan.t}</p>}
          <small className="hint">{d.mode === 'tambah' ? 'Modal dan nilai investasi bertambah sebesar jumlah ini.' : 'Modal berkurang sebanding dengan porsi yang ditarik, jadi untung/rugi tetap benar. Menarik semua nilai akan menghapus investasi dari portofolio.'} Kalau memilih rekening, saldo rekening ikut berubah dan tercatat sebagai Transfer (tidak dihitung pemasukan/pengeluaran).</small>
        </Panel>
      )}
      <Panel title="Tambah investasi">
        <form className="stack" onSubmit={add}>
          <div className="inline">
            <input placeholder="Nama (mis. Emas Antam)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama investasi" />
            <select value={f.sumber} onChange={(e) => pilihSumber(e.target.value)} aria-label="Cara hitung nilai">{SUMBER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div className="inline">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Jenis">{JENIS_INVESTASI.map((j) => <option key={j}>{j}</option>)}</select>
            {(f.sumber === 'kripto' || f.sumber === 'saham') && <input placeholder={f.sumber === 'saham' ? 'Kode saham, mis. BBCA' : 'ID koin, mis. bitcoin'} value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} aria-label="Kode" />}
            {f.sumber === 'emasid' && <select value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} aria-label="Merek dan jenis harga">{EMAS_ID.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
            {f.sumber && <input type="number" inputMode="decimal" step="any" placeholder={'Jumlah (' + SATUAN[f.sumber] + ')'} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} aria-label="Jumlah" />}
            <input type="number" inputMode="numeric" placeholder="Modal / total beli (Rp)" value={f.invested} onChange={(e) => setF({ ...f, invested: e.target.value })} aria-label="Modal" />
            <button className="btn primary">Tambah</button>
          </div>
        </form>
        <small className="hint">Pilih “Emas toko Indonesia” lalu isi jumlah gram: nilainya otomatis ikut harga Antam/Galeri 24/UBS hari ini (dari galeri24.co.id), dan untung/rugi dihitung dari modal. Pakai harga buyback kalau mau tahu nilai saat emas dijual kembali.</small>
      </Panel>
    </>
  )
}
