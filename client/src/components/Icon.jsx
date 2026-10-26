// Bitta to'plam: 20px, 1.6px ingichka kontur, kulrang. Konteynersiz, rangsiz.
const PATHS = {
  data: <><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 8.5h14M3 12.5h14M8 8.5V16" /></>,
  photos: <><rect x="3" y="4" width="14" height="12" rx="2" /><circle cx="7.5" cy="8.5" r="1.3" /><path d="m3.5 14.5 4-3.5 3 2.5 2.5-2 3.5 3" /></>,
  monitor: <path d="M2.5 11h3l2.2-5.5 3.2 9 2.2-5.5h4.4" />,
  groups: <><circle cx="7.5" cy="7.5" r="2.5" /><path d="M2.5 16c.4-2.6 2.4-4 5-4s4.6 1.4 5 4" /><circle cx="14" cy="8" r="2" /><path d="M14.5 12.2c2 .3 3.2 1.5 3.5 3.3" /></>,
  overview: <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></>,
  settings: <><path d="M3 6h7M14 6h3M3 14h3M10 14h7" /><circle cx="12" cy="6" r="2" /><circle cx="8" cy="14" r="2" /></>,
  more: <><circle cx="4.5" cy="10" r="1.1" fill="currentColor" /><circle cx="10" cy="10" r="1.1" fill="currentColor" /><circle cx="15.5" cy="10" r="1.1" fill="currentColor" /></>,
  user: <><circle cx="10" cy="7" r="3" /><path d="M3.5 16.5c.6-3 3-4.5 6.5-4.5s5.9 1.5 6.5 4.5" /></>,
  lock: <><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>,
  sun: <><circle cx="10" cy="10" r="3.2" /><path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3" /></>,
  moon: <path d="M16.5 11.8A6.8 6.8 0 0 1 8.2 3.5a6.8 6.8 0 1 0 8.3 8.3Z" />,
  device: <><rect x="2.5" y="4" width="15" height="10" rx="2" /><path d="M7 17h6M10 14v3" /></>,
  download: <path d="M10 3.5v9M6.5 9.5 10 13l3.5-3.5M4 16.5h12" />,
  form: <><path d="M5 3.5h7l3 3V16.5H5z" /><path d="M12 3.5v3h3M7.5 10h5M7.5 13h5" /></>,
  logout: <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3M12 6.5 15.5 10 12 13.5M15.5 10H8" />,
  link: <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0L5 10.8a3 3 0 0 0 4.2 4.2l.8-.8" />,
};

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
