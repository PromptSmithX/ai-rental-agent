import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RoomSearchHit, RoomView } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { formatPriceCompact, formatPriceMonthly, formatDistanceVi, LOCATION_ACCURACY_LABELS } from '@/shared/utils/format';
import { Info, Layers, X } from 'lucide-react';

interface RoomMapProps {
  rooms: (RoomView & { hit: RoomSearchHit })[];
}

type MapTileProvider = 'google' | 'google-satellite' | 'carto' | 'osm';

const TILE_PROVIDERS: Record<
  MapTileProvider,
  { label: string; url: string; subdomains?: string[] | string; attribution: string; maxZoom?: number }
> = {
  google: {
    label: 'Google Maps',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  'google-satellite': {
    label: 'Vệ tinh',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps Vệ tinh',
    maxZoom: 20,
  },
  carto: {
    label: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  },
  osm: {
    label: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  },
};

// Map center adjuster & resize hook
const MapUpdater: React.FC<{
  center: [number, number];
  selectedCoords: [number, number] | null;
}> = ({ center, selectedCoords }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (selectedCoords) {
      map.flyTo(selectedCoords, 15, { duration: 0.8 });
    } else if (center) {
      map.setView(center, 14);
    }
  }, [center, selectedCoords, map]);

  return null;
};

// Create custom DOM icon for Campus
function createCampusIcon(campusName: string) {
  return L.divIcon({
    className: 'custom-campus-icon',
    html: `
      <div style="background-color: #0F172A; color: white; padding: 5px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); border: 2px solid white; white-space: nowrap;">
        🎓 ${campusName}
      </div>
    `,
    iconSize: [140, 28],
    iconAnchor: [70, 14],
  });
}

// Create custom Price Marker icon
function createPriceIcon(price: number, isSelected: boolean, isApproximate: boolean) {
  const text = formatPriceCompact(price);
  const bgColor = isSelected ? '#0D9488' : '#FFFFFF';
  const textColor = isSelected ? '#FFFFFF' : '#0F172A';
  const borderColor = isSelected ? '#0F766E' : isApproximate ? '#D97706' : '#94A3B8';
  const borderWidth = isSelected ? '2px' : '1.5px';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';
  const zIndex = isSelected ? 1000 : 1;
  const shadow = isSelected ? '0 10px 15px -3px rgba(13, 148, 136, 0.5)' : '0 2px 5px rgba(0,0,0,0.2)';

  return L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div style="transform: ${scale}; transform-origin: center; transition: all 0.2s ease; z-index: ${zIndex};">
        <div style="background-color: ${bgColor}; color: ${textColor}; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: ${borderWidth} solid ${borderColor}; box-shadow: ${shadow}; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; cursor: pointer;">
          ${text}
        </div>
      </div>
    `,
    iconSize: [48, 24],
    iconAnchor: [24, 12],
  });
}

export const RoomMap: React.FC<RoomMapProps> = ({ rooms }) => {
  const { currentFilters, allCampuses, selectedRoomId, setSelectedRoomId } = useSearchStore();
  const [activeProvider, setActiveProvider] = useState<MapTileProvider>('google');
  const [showLegend, setShowLegend] = useState(false);

  const currentCampus = useMemo(() => {
    return allCampuses.find((c) => c.id === currentFilters.campusId) ?? allCampuses[0];
  }, [allCampuses, currentFilters.campusId]);

  const mapCenter: [number, number] = useMemo(() => {
    return currentCampus ? [currentCampus.latitude, currentCampus.longitude] : [10.7721, 106.6579];
  }, [currentCampus]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const selectedCoords: [number, number] | null = useMemo(() => {
    if (selectedRoom && selectedRoom.latitude !== null && selectedRoom.longitude !== null) {
      return [selectedRoom.latitude, selectedRoom.longitude];
    }
    return null;
  }, [selectedRoom]);

  // Filter only rooms with valid coordinates
  const roomsWithCoords = useMemo(() => {
    return rooms.filter((r) => r.latitude !== null && r.longitude !== null);
  }, [rooms]);

  const radiusMeters = currentFilters.maxDistanceKm ? currentFilters.maxDistanceKm * 1000 : null;
  const currentTileConfig = TILE_PROVIDERS[activeProvider];

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden bg-slate-100">
      {/* Map Layer Switcher Control */}
      <div className="absolute top-3 left-14 z-[400] flex items-center bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200 text-xs">
        <div className="flex items-center gap-1 px-1.5 py-0.5 text-slate-500 font-semibold text-[11px] border-r border-slate-200 mr-1">
          <Layers className="w-3.5 h-3.5 text-brand-600" />
        </div>
        {(['google', 'google-satellite', 'carto'] as MapTileProvider[]).map((prov) => (
          <button
            key={prov}
            type="button"
            onClick={() => setActiveProvider(prov)}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              activeProvider === prov
                ? 'bg-brand-600 text-white shadow-xs font-semibold'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {TILE_PROVIDERS[prov].label}
          </button>
        ))}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        aria-label="Bản đồ tương tác các phòng trọ sinh viên phong cách Google Maps"
      >
        <MapUpdater center={mapCenter} selectedCoords={selectedCoords} />

        <TileLayer
          key={activeProvider}
          attribution={currentTileConfig.attribution}
          url={currentTileConfig.url}
          subdomains={currentTileConfig.subdomains}
          maxZoom={currentTileConfig.maxZoom ?? 20}
        />

        {/* Campus Marker */}
        {currentCampus && (
          <Marker
            position={[currentCampus.latitude, currentCampus.longitude]}
            icon={createCampusIcon(currentCampus.campusName)}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-slate-900">{currentCampus.universityName}</div>
                <div className="text-slate-600">{currentCampus.campusName}</div>
                <div className="text-[10px] text-brand-600 mt-1 font-medium">
                  Điểm mốc tính bán kính đường chim bay
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Max Distance Radius Circle */}
        {currentCampus && radiusMeters && (
          <Circle
            center={[currentCampus.latitude, currentCampus.longitude]}
            radius={radiusMeters}
            pathOptions={{
              color: '#0D9488',
              fillColor: '#0D9488',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Room Price Markers */}
        {roomsWithCoords.map((room) => {
          const isSelected = room.id === selectedRoomId;
          const isApproximate = room.locationAccuracy === 'approximate';

          return (
            <Marker
              key={room.id}
              position={[room.latitude!, room.longitude!]}
              icon={createPriceIcon(room.priceMonthlyVnd, isSelected, isApproximate)}
              eventHandlers={{
                click: () => {
                  setSelectedRoomId(room.id);
                },
              }}
            >
              <Popup>
                <div className="p-1 max-w-[210px] text-xs">
                  <div className="font-bold text-slate-900 line-clamp-1">{room.title}</div>
                  <div className="text-brand-700 font-extrabold text-sm mt-0.5">
                    {formatPriceMonthly(room.priceMonthlyVnd)}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {formatDistanceVi(room.hit.distanceKm)}
                  </div>
                  <div className="mt-1 text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-medium">
                    {LOCATION_ACCURACY_LABELS[room.locationAccuracy].label}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Discrete Collapsible Map Legend at Bottom-Left */}
      <div className="absolute bottom-6 left-3 z-[400]">
        {showLegend ? (
          <div className="bg-white/95 backdrop-blur-xs border border-borderMuted p-2.5 rounded-card shadow-lg text-xs max-w-xs animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-brand-600" />
                Chú thích bản đồ:
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                aria-label="Đóng chú thích"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                <span>Cơ sở trường (điểm mốc)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded-full bg-brand-600 text-white text-[9px] font-bold">
                  2,8tr
                </span>
                <span>Phòng nổi bật / đang chọn</span>
              </div>
              {radiusMeters && (
                <div className="flex items-center gap-1.5 text-brand-700 font-medium">
                  <span className="w-3.5 h-0 border-t-2 border-brand-600 border-dashed inline-block"></span>
                  <span>Bán kính ≤ {currentFilters.maxDistanceKm} km</span>
                </div>
              )}
            </div>
            <div className="mt-1.5 pt-1 border-t border-slate-100 text-[10px] text-amber-700">
              * Khoảng cách đường chim bay, vị trí giả lập.
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-700 text-xs font-semibold shadow-md hover:bg-white transition-all"
            aria-label="Mở chú thích bản đồ"
          >
            <Info className="w-3.5 h-3.5 text-brand-600" />
            <span>Chú thích</span>
          </button>
        )}
      </div>
    </div>
  );
};
