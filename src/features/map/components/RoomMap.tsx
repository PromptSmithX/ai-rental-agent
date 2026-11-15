import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RoomSearchHit, RoomView } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { formatPriceCompact, formatPriceMonthly, formatDistanceEn, LOCATION_ACCURACY_LABELS } from '@/shared/utils/format';
import { Info, Layers, X, Navigation } from 'lucide-react';

interface RoomMapProps {
  rooms: (RoomView & { hit: RoomSearchHit })[];
}

type MapTileProvider = 'google' | 'google-satellite' | 'carto';

const TILE_PROVIDERS: Record<
  MapTileProvider,
  { label: string; url: string; subdomains?: string[] | string; attribution: string; maxZoom?: number }
> = {
  google: {
    label: 'Đường phố',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  'google-satellite': {
    label: 'Vệ tinh',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Satellite',
    maxZoom: 20,
  },
  carto: {
    label: 'Tối giản',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CARTO',
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
      <div style="background-color: #0F172A; color: white; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.4); border: 2px solid white; white-space: nowrap;">
        <span style="font-size: 13px;">🎓</span>
        <span>${campusName}</span>
      </div>
    `,
    iconSize: [160, 30],
    iconAnchor: [80, 15],
  });
}

// Create custom Price Marker icon
function createPriceIcon(price: number, isSelected: boolean, isApproximate: boolean) {
  const text = formatPriceCompact(price);
  const bgColor = isSelected ? '#0F172A' : '#FFFFFF';
  const textColor = isSelected ? '#FFFFFF' : '#0F172A';
  const borderColor = isSelected ? '#0F172A' : isApproximate ? '#D97706' : '#E2E8F0';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';
  const zIndex = isSelected ? 1000 : 1;
  const shadow = isSelected ? '0 8px 20px rgba(15, 23, 42, 0.45)' : '0 2px 8px rgba(15, 23, 42, 0.15)';
  const tipColor = bgColor;

  return L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div style="transform: ${scale}; transform-origin: bottom center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); z-index: ${zIndex}; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background-color: ${bgColor}; color: ${textColor}; padding: 3px 9px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 1.5px solid ${borderColor}; box-shadow: ${shadow}; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;">
          ${text}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid ${tipColor}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
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
      <div className="absolute top-3 left-14 z-[400] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/90 text-xs">
        <div className="flex items-center gap-1 px-2 py-0.5 text-slate-400 font-semibold text-[11px] border-r border-slate-200 mr-1">
          <Layers className="w-3.5 h-3.5 text-teal-600" />
        </div>
        {(['google', 'google-satellite', 'carto'] as MapTileProvider[]).map((prov) => (
          <button
            key={prov}
            type="button"
            onClick={() => setActiveProvider(prov)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeProvider === prov
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
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
        aria-label="Bản đồ tương tác cơ sở trường và phòng trọ sinh viên"
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
              <div className="p-1.5 text-xs">
                <div className="font-bold text-slate-900">{currentCampus.universityName}</div>
                <div className="text-teal-700 font-medium">{currentCampus.campusName}</div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  Mốc đo bán kính đường chim bay
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
              fillOpacity: 0.04,
              weight: 1.5,
              dashArray: '5, 5',
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
                <div className="p-1 max-w-[220px] text-xs">
                  <div className="font-bold text-slate-900 line-clamp-1">{room.title}</div>
                  <div className="text-slate-900 font-extrabold text-sm mt-0.5">
                    {formatPriceMonthly(room.priceMonthlyVnd)}
                  </div>
                  <div className="text-teal-700 font-medium text-[11px] mt-0.5">
                    {formatDistanceEn(room.hit.distanceKm)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded font-medium border border-slate-200">
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
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 p-3.5 rounded-xl shadow-lg text-xs max-w-xs animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                Chú giải bản đồ
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                aria-label="Đóng chú giải"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                <span>Cơ sở trường học (Mốc chuẩn)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[9px] font-bold">
                  2,8 tr
                </span>
                <span>Phòng đang chọn xem</span>
              </div>
              {radiusMeters && (
                <div className="flex items-center gap-2 text-teal-800 font-medium">
                  <span className="w-3 h-0 border-t-2 border-teal-600 border-dashed inline-block"></span>
                  <span>Bán kính tìm kiếm ≤ {currentFilters.maxDistanceKm} km</span>
                </div>
              )}
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
              * Khoảng cách tính theo đường chim bay từ cổng trường, vị trí ước lượng.
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-xl shadow-sm border border-slate-200/90 text-xs font-medium transition-all hover:bg-white"
          >
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Chú giải</span>
          </button>
        )}
      </div>
    </div>
  );
};
