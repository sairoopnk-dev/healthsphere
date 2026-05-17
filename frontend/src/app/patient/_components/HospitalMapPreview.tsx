"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ExternalLink, Building2, AlertCircle, Route, Search, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL!;
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];

// ── Types ────────────────────────────────────────────────────────────────────
interface HospitalMapPreviewProps {
  doctorId: string;
  doctorName: string;
  hospitalName: string;
  patientLat?: number | null;
  patientLng?: number | null;
  compact?: boolean;
}

interface LocationData {
  hospitalName: string;
  address: string;
  lat: number;
  lng: number;
}

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Dark map style ───────────────────────────────────────────────────────────
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
];

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function MapSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 ${compact ? "h-44" : "h-56"}`}>
      <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <MapPin size={20} className="text-slate-300" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading map...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fallback Card ────────────────────────────────────────────────────────────
function FallbackCard({
  hospitalName, address, navigateUrl, compact,
}: {
  hospitalName: string; address?: string | null; navigateUrl?: string | null; compact?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-4 py-3">
        <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          Hospital Locator <span className="text-base">🏥</span>
        </p>
      </div>
      <div className={`flex flex-col items-center justify-center gap-3 px-5 ${compact ? "py-8" : "py-10"}`}>
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
          <AlertCircle size={22} className="text-amber-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-700 text-sm">{hospitalName}</p>
          {address ? (
            <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">{address}</p>
          ) : (
            <p className="text-slate-400 text-xs mt-1">Hospital location not available yet</p>
          )}
        </div>
        {navigateUrl ? (
          <a href={navigateUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm mt-1">
            <Navigation size={13} /> Navigate
          </a>
        ) : (
          <p className="text-[11px] text-slate-300 font-medium mt-1">Doctor has not set their clinic location yet</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Map Search Component ───────────────────────────────────────────────────────
function MapSearchBox({ onSelect, onClose }: { onSelect: (lat: number, lng: number) => void, onClose: () => void }) {
  const { ready, value, suggestions: { status, data }, setValue, clearSuggestions } = usePlacesAutocomplete({
    requestOptions: { types: ["establishment", "geocode"] }, // Match requirements
    debounce: 300,
  });

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(lat, lng);
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
  };

  return (
    <div className="relative w-64 bg-white/95 backdrop-blur-sm shadow-xl rounded-xl border border-slate-200 overflow-visible">
      <div className="flex items-center px-2 py-1.5">
        <Search size={14} className="text-slate-400 ml-1 mr-2" />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Search locations..."
          className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder-slate-400 min-w-0"
        />
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>

      {status === "OK" && (
        <ul className="absolute top-full right-0 w-72 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl max-h-48 overflow-y-auto z-50 py-1">
          {data.map(({ place_id, description }) => (
            <li key={place_id}>
              <button
                type="button"
                onClick={() => handleSelect(description)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors flex items-start gap-2"
              >
                <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                <span className="truncate">{description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════
export default function HospitalMapPreview({
  doctorId, doctorName, hospitalName, patientLat, patientLng, compact = false,
}: HospitalMapPreviewProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    id: "healthsphere-maps",
    libraries: LIBRARIES,
  });

  // ── Map search (re-center without losing hospital marker) ──────────────────
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Fetch hospital location ────────────────────────────────────────────────
  const fetchLocation = useCallback(async () => {
    if (!doctorId) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/doctor/location/${doctorId}`);
      const data = await res.json();
      if (data.success && data.location) {
        setLocation({
          hospitalName: data.location.hospitalName,
          address: data.location.address,
          lat: data.location.lat,
          lng: data.location.lng,
        });
      } else {
        setError("no-location");
      }
    } catch {
      setError("fetch-failed");
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  // ── Distance ───────────────────────────────────────────────────────────────
  const distance =
    location && patientLat != null && patientLng != null
      ? haversineKm(patientLat, patientLng, location.lat, location.lng)
      : null;

  const navigateUrl = location
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
    : null;
  const viewMapUrl = location
    ? `https://www.google.com/maps/?q=${location.lat},${location.lng}`
    : null;

  if (loadError || (!MAPS_KEY && !loading)) {
    return <FallbackCard hospitalName={hospitalName} address={location?.address} navigateUrl={navigateUrl} compact={compact} />;
  }

  if (loading || !isLoaded) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <MapSkeleton compact={compact} />
      </motion.div>
    );
  }

  if (error || !location) {
    return <FallbackCard hospitalName={hospitalName} address={null} navigateUrl={null} compact={compact} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-teal-400" />
          </div>
          <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            Hospital Locator <span className="text-base">🏥</span>
          </p>
        </div>
        {distance !== null && (
          <div className="flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/25 rounded-lg px-2.5 py-1">
            <Route size={12} className="text-teal-400" />
            <span className="text-teal-300 text-[11px] font-bold">
              ~{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
            </span>
          </div>
        )}
      </div>

      {/* Hospital info strip */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 min-w-0">
        <MapPin size={13} className="text-teal-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{location.hospitalName}</p>
          <p className="text-[11px] text-slate-400 truncate">{location.address}</p>
        </div>
      </div>

      {/* Google Map */}
      <div className={`relative ${compact ? "h-44" : "h-56"}`}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter ?? { lat: location.lat, lng: location.lng }}
          zoom={15}
          onLoad={() => setMapReady(true)}
          options={{ disableDefaultUI: true, zoomControl: true, styles: MAP_STYLES, gestureHandling: "cooperative" }}
        >
          {/* Always show hospital marker */}
          {mapReady && (
            <Marker
              position={{ lat: location.lat, lng: location.lng }}
              onClick={() => setShowInfo(true)}
              animation={google.maps.Animation.DROP}
            />
          )}
          {showInfo && (
            <InfoWindow
              position={{ lat: location.lat, lng: location.lng }}
              onCloseClick={() => setShowInfo(false)}
              options={{ pixelOffset: new google.maps.Size(0, -35) }}
            >
              <div style={{ padding: "4px 2px", minWidth: 160 }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", marginBottom: 2 }}>{doctorName}</p>
                <p style={{ fontWeight: 600, fontSize: 11, color: "#0d9488", marginBottom: 4 }}>{location.hospitalName}</p>
                <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{location.address}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* ── Floating map search (overlaid on top-right of map) ── */}
        {mapReady && (
          <div className="absolute top-2 right-2 z-10">
            {!searchOpen ? (
              <button
                onClick={() => setSearchOpen(true)}
                title="Search on map"
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-teal-600 transition-all"
              >
                <Search size={12} /> Search
              </button>
            ) : (
              <MapSearchBox
                onSelect={(lat, lng) => { setMapCenter({ lat, lng }); setSearchOpen(false); }}
                onClose={() => setSearchOpen(false)}
              />
            )}
          </div>
        )}

        {/* Reset to hospital button when map has been moved via search */}
        {mapCenter && mapReady && (
          <button
            onClick={() => setMapCenter(null)}
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-teal-600 hover:bg-white transition-all"
          >
            <MapPin size={10} /> Back to hospital
          </button>
        )}

        <AnimatePresence>
          {!mapReady && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-slate-100 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-400">Rendering map...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center gap-2">
        <a href={navigateUrl!} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm">
          <Navigation size={13} /> Navigate
        </a>
        <a href={viewMapUrl!} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-colors">
          <ExternalLink size={13} /> View Larger Map
        </a>
      </div>
    </motion.div>
  );
}
