import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RoomSearchHit, RoomView } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { formatPriceCompact, formatPriceMonthly, formatDistanceEn, LOCATION_ACCURACY_LABELS } from '@/shared/utils/format';
import { Info, Layers, X } from 'lucide-react';

interface RoomMapProps {
  rooms: (RoomView & { hit: RoomSearchHit })[];
}

type MapTileProvider = 'google' | 'google-satellite' | 'carto';

const TILE_PROVIDERS: Record<
  MapTileProvider,
  { label: string; url: string; subdomains?: string[] | string; attribution: string; maxZoom?: number }
> = {
  google: {
    label: 'Street',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  'google-satellite': {
    label: 'Satellite',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Satellite',
    maxZoom: 20,
  },
  carto: {
    label: 'Minimalist',
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
      <div style="background-color: #0F172A; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35); border: 1.5px solid white; white-space: nowrap;">
        🎓 ${campusName}
      </div>
    `,
    iconSize: [140, 26],
    iconAnchor: [70, 13],
  });
}

// Create custom Price Marker icon
function createPriceIcon(price: number, isSelected: boolean, isApproximate: boolean) {
  const text = formatPriceCompact(price);
  const bgColor = isSelected ? '#0F172A' : '#FFFFFF';
  const textColor = isSelected ? '#FFFFFF' : '#0F172A';
  const borderColor = isSelected ? '#0F172A' : isApproximate ? '#D97706' : '#CBD5E1';
  const borderWidth = isSelected ? '2px' : '1.5px';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';
  const zIndex = isSelected ? 1000 : 1;
  const shadow = isSelected ? '0 8px 16px rgba(15, 23, 42, 0.4)' : '0 2px 6px rgba(0,0,0,0.15)';

  return L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div style="transform: ${scale}; transform-origin: center; transition: all 0.2s ease; z-index: ${zIndex};">
        <div style="background-color: ${bgColor}; color: ${textColor}; padding: 2px 7px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: monospace; border: ${borderWidth} solid ${borderColor}; box-shadow: ${shadow}; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; cursor: pointer;">
          ${text}
        </div>
      </div>
    `,
    iconSize: [46, 22],
    iconAnchor: [23, 11],
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
      <div className="absolute top-3 left-14 z-[400] flex items-center bg-white/95 backdrop-blur-xs p-1 rounded-lg shadow-sm border border-slate-200 text-xs">
        <div className="flex items-center gap-1 px-1.5 py-0.5 text-slate-400 font-semibold text-[11px] border-r border-slate-200 mr-1">
          <Layers className="w-3.5 h-3.5 text-slate-700" />
        </div>
        {(['google', 'google-satellite', 'carto'] as MapTileProvider[]).map((prov) => (
          <button
            key={prov}
            type="button"
            onClick={() => setActiveProvider(prov)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              activeProvider === prov
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
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
        aria-label="Interactive Campus & Rental Map"
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
                <div className="text-[10px] text-slate-500 mt-1">
                  Main campus entrance
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
              color: '#0F172A',
              fillColor: '#0F172A',
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: '4, 4',
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
                  <div className="text-slate-900 font-extrabold text-sm mt-0.5">
                    {formatPriceMonthly(room.priceMonthlyVnd)}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {formatDistanceEn(room.hit.distanceKm)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-700 bg-slate-50 px-1 py-0.5 rounded font-medium border border-slate-200">
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
          <div className="bg-white/95 backdrop-blur-xs border border-slate-200 p-3 rounded-lg shadow-md text-xs max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-700" />
                Map Guide
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                aria-label="Close guide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                <span>Campus benchmark</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white text-[9px] font-mono font-bold">
                  2.8M
                </span>
                <span>Active selected room</span>
              </div>
              {radiusMeters && (
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-3 h-0 border-t border-slate-800 border-dashed inline-block"></span>
                  <span>Search radius ≤ {currentFilters.maxDistanceKm} km</span>
                </div>
              )}
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
              * Straight-line distance from campus entrance.
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-700 text-xs font-medium shadow-sm hover:bg-white transition-all"
            aria-label="Open map guide"
          >
            <Info className="w-3.5 h-3.5 text-slate-600" />
            <span>Map Guide</span>
          </button>
        )}
      </div>
    </div>
  );
};
