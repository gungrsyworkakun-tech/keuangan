const P = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  swap: <path d="M7 7h13l-4-4M17 17H4l4 4" />,
  bank: <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  pie: <><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.2A9 9 0 0 1 20.8 9H15z" /></>,
  piggy: <><path d="M5 11a7 6 0 0 1 12-3h2v3l2 1v3h-2.5L16 18v2h-3v-2H9v2H6v-2.5A6 6 0 0 1 5 11z" /><circle cx="15" cy="10.5" r=".8" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />,
  backup: <path d="M12 16V8M8 12l4-4 4 4M20 16.5A4.5 4.5 0 0 0 17 8h-1A6 6 0 1 0 5 15" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
}
export const I = ({ n, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{P[n]}</svg>
)
