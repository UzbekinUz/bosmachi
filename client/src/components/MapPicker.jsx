import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { Button, Modal } from './ui.jsx';

const TASHKENT = [41.3111, 69.2797];

function Clicker({ onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export const mapsLink = ([lat, lng]) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export function parseLink(link) {
  const m = String(link || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export default function MapPicker({ value, onClose, onSelect }) {
  const [pos, setPos] = useState(parseLink(value));
  return (
    <Modal title="Joylashuvni xaritadan belgilang" onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-400">Ijara turgan joyingizni xaritada bosib belgilang.</p>
      <div className="h-[50dvh] overflow-hidden rounded-xl border border-ink-600">
        <MapContainer center={pos || TASHKENT} zoom={pos ? 16 : 11} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Clicker onPick={setPos} />
          {pos && <CircleMarker center={pos} radius={10} pathOptions={{ color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }} />}
        </MapContainer>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button disabled={!pos} onClick={() => { onSelect(mapsLink(pos)); onClose(); }}>Tanlash</Button>
      </div>
    </Modal>
  );
}
