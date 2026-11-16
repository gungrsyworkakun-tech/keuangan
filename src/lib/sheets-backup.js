// Cadangan ke Google Sheets milik pengguna sendiri (izin "drive.file": aplikasi hanya bisa
// melihat file yang ia buat sendiri, bukan seluruh Drive). Tidak bergantung pada bagian lain
// aplikasi supaya mudah diuji: token dan fetch diberikan dari luar.

export const NAMA_FILE = 'Duitku Backup'
export const TABEL = {
  transactions: ['Transaksi', ['id', 'date', 'desc', 'amount', 'type', 'category', 'accountId']],
  accounts: ['Rekening', ['id', 'name', 'balance', 'jenis']],
  investments: ['Investasi', ['id', 'name', 'type', 'invested', 'value', 'sumber', 'kode', 'qty']],
  goals: ['Goal', ['id', 'name', 'target', 'saved', 'deadline']],
  budgets: ['Anggaran', ['category', 'limit', 'tipe']],
  savings: ['Tabungan', ['id', 'month', 'amount', 'note', 'pos']],
}
const ANGKA = new Set(['amount', 'balance', 'invested', 'value', 'target', 'saved', 'limit', 'qty'])
const PILIHAN = new Set(['jenis', 'sumber', 'kode', 'pos', 'qty', 'tipe'])
const TAB_INFO = 'Info'
const KUNCI = Object.keys(TABEL)
const MAKS_BARIS = 5000

export const kosong = (state) => KUNCI.every((k) => !(state && state[k] && state[k].length))
export const hitung = (state) => KUNCI.reduce((n, k) => n + ((state && state[k]) || []).length, 0)

// data aplikasi -> baris tabel (judul kolom + isi)
export function keBaris(state) {
  const hasil = {}
  for (const k of KUNCI) {
    const [nama, kolom] = TABEL[k]
    const baris = ((state && state[k]) || []).slice(0, MAKS_BARIS)
    hasil[nama] = [kolom, ...baris.map((o) => kolom.map((c) => {
      const v = o[c]
      if (v === undefined || v === null) return ''
      return ANGKA.has(c) ? (Number(v) || 0) : String(v).slice(0, 200)
    }))]
  }
  return hasil
}

// baris tabel -> data aplikasi (abaikan baris tanpa id/kategori)
export function dariBaris(nilai) {
  const state = {}
  for (const k of KUNCI) {
    const [nama, kolom] = TABEL[k]
    const baris = (nilai[nama] || []).slice(1, MAKS_BARIS + 1)
    state[k] = baris
      .filter((r) => String(r[0] === undefined ? '' : r[0]).trim() !== '')
      .map((r) => {
        const o = {}
        kolom.forEach((c, i) => {
          const v = r[i]
          const kosongSel = v === undefined || v === null || v === ''
          if (kosongSel && PILIHAN.has(c)) return // kolom pilihan yang kosong tidak ikut
          o[c] = ANGKA.has(c) ? (Number(v) || 0) : String(kosongSel ? '' : v).slice(0, 200)
        })
        return o
      })
  }
  return state
}

export class ErrorGoogle extends Error {
  constructor(pesan, status) { super(pesan); this.status = status }
}

// ambilToken(paksa) -> Promise<string>; paksa=true berarti minta token baru
export function buatKlien({ ambilToken, fetcher = (...a) => fetch(...a) }) {
  async function minta(url, opsi = {}, ulang = true) {
    const token = await ambilToken(!ulang)
    const res = await fetcher(url, {
      ...opsi,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(opsi.headers || {}) },
    })
    if (res.status === 401 && ulang) return minta(url, opsi, false) // token kedaluwarsa: minta baru sekali
    if (!res.ok) {
      let pesan = 'Google menolak permintaan (' + res.status + ')'
      try { const j = await res.json(); if (j.error && j.error.message) pesan = j.error.message } catch {}
      throw new ErrorGoogle(pesan, res.status)
    }
    return res.json()
  }
  const sheets = 'https://sheets.googleapis.com/v4/spreadsheets'

  async function cari() {
    const q = encodeURIComponent(`name='${NAMA_FILE}' and trashed=false and mimeType='application/vnd.google-apps.spreadsheet'`)
    const r = await minta(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)&pageSize=1`)
    return r.files && r.files[0] ? r.files[0].id : ''
  }
  async function buat() {
    const nama = [...KUNCI.map((k) => TABEL[k][0]), TAB_INFO]
    const r = await minta(sheets, { method: 'POST', body: JSON.stringify({ properties: { title: NAMA_FILE }, sheets: nama.map((title) => ({ properties: { title } })) }) })
    return r.spreadsheetId
  }
  async function pastikanTab(id) {
    const r = await minta(`${sheets}/${id}?fields=sheets.properties.title`)
    const ada = new Set((r.sheets || []).map((s) => s.properties.title))
    const perlu = [...KUNCI.map((k) => TABEL[k][0]), TAB_INFO].filter((n) => !ada.has(n))
    if (perlu.length) await minta(`${sheets}/${id}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: perlu.map((title) => ({ addSheet: { properties: { title } } })) }) })
  }
  async function tulis(id, state) {
    const baris = keBaris(state)
    const info = [['Aplikasi', 'Duitku'], ['Terakhir dicadangkan', new Date().toISOString()], ['Jumlah baris data', hitung(state)]]
    const kerja = async () => {
      await minta(`${sheets}/${id}/values:batchClear`, { method: 'POST', body: JSON.stringify({ ranges: [...Object.keys(baris), TAB_INFO].map((n) => `${n}!A:Z`) }) })
      // RAW: isi disimpan apa adanya sebagai teks/angka, tidak pernah dianggap rumus
      await minta(`${sheets}/${id}/values:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: 'RAW', data: [...Object.entries(baris).map(([n, v]) => ({ range: `${n}!A1`, values: v })), { range: `${TAB_INFO}!A1`, values: info }] }),
      })
    }
    try { await kerja() } catch (e) {
      if (e.status === 400) { await pastikanTab(id); await kerja() } else throw e // tab terhapus: buat lagi sekali
    }
  }
  async function baca(id) {
    const nama = KUNCI.map((k) => TABEL[k][0])
    const q = nama.map((n) => 'ranges=' + encodeURIComponent(n + '!A:Z')).join('&')
    const r = await minta(`${sheets}/${id}/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE`)
    const nilai = {}
    ;(r.valueRanges || []).forEach((v, i) => { nilai[nama[i]] = v.values || [] })
    return dariBaris(nilai)
  }
  return { cari, buat, tulis, baca, pastikanTab }
}
