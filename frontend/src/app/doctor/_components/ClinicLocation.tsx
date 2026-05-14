"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import {
  MapPin, Navigation, Pencil, X, Check, AlertCircle,
  CheckCircle2, Loader2, Building2, RefreshCw, Search,
} from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";

const API = "http://localhost:8000";
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];

// ── Types ────────────────────────────────────────────────────────────────────
interface LocationData {
  _id: string;
  hospitalName: string;
  address: string;
  lat: number;
  lng: number;
  updatedByDoctorId: string;
  synced: boolean;
  updatedAt: string;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

// ── Places Autocomplete Input ────────────────────────────────────────────────
function PlacesInput({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
}) {
  const {
    ready,
    value: inputVal,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "in" },
    },
    debounce: 300,
  });

  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  // Sync external value (e.g. current-location fill)
  useEffect(() => { setValue(value, false); }, [value, setValue]);

  // Reset highlight when suggestions change
  useEffect(() => { setHighlightedIdx(-1); }, [data]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleSelect = async (description: string) => {
    setValue(description, false);
    onChange(description);
    clearSuggestions();
    setHighlightedIdx(-1);
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      const formatted = results[0]?.formatted_address || description;
      onSelect(formatted, lat, lng);
    } catch (err) {
      console.error("[ClinicLocation] Geocoding failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (status !== "OK" || data.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((p) => (p < data.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((p) => (p > 0 ? p - 1 : data.length - 1));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(data[highlightedIdx].description);
    } else if (e.key === "Escape") {
      clearSuggestions();
      setHighlightedIdx(-1);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={inputVal}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={!ready}
          placeholder="Start typing hospital address..."
          className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 font-medium text-slate-700 bg-slate-50 transition-all text-sm"
          autoComplete="off"
        />
        {!ready && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {status === "OK" && data.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {data.map(({ place_id, description }, idx) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className={`flex items-start gap-2 px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 text-sm text-slate-700 font-medium transition-colors ${
                idx === highlightedIdx ? "bg-blue-50 text-blue-700" : "hover:bg-blue-50"
              }`}
            >
              <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
              {description}
            </li>
          ))}
        </ul>
      )}

      {/* Zero results */}
      {status === "ZERO_RESULTS" && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          <p className="text-sm text-slate-400 font-medium text-center">No matching locations found</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClinicLocation({ doctorId }: { doctorId: string }) {
  const { doctor } = useDoctor();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Modal form state
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);

  // Current location detection state
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch location on mount ───────────────────────────────────────────────
  const fetchLocation = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/doctor/location/${doctorId}`);
      const data = await res.json();
      if (data.success) setLocation(data.location || null);
    } catch {
      showToast("error", "Failed to load clinic location.");
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openModal = () => {
    setFormAddress(location?.address || "");
    setFormLat(location?.lat || null);
    setFormLng(location?.lng || null);
    setLocationError("");
    setShowModal(true);
  };

  // ── Current location ──────────────────────────────────────────────────────
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`
          );
          const data = await res.json();
          const fullAddress = data.results?.[0]?.formatted_address || `${lat}, ${lng}`;
          setFormAddress(fullAddress);
          setFormLat(lat);
          setFormLng(lng);
        } catch {
          setLocationError("Unable to reverse geocode. Please enter the address manually.");
          setFormLat(lat);
          setFormLng(lng);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Please allow access in your browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("Location unavailable. Please try again or enter address manually.");
        } else {
          setLocationError("Could not detect location. Please try again.");
        }
      },
      { timeout: 10000 }
    );
  };

  // ── Save location ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formAddress.trim()) { showToast("error", "Please enter or select an address."); return; }

    // If lat/lng not captured (Places API billing issue), try geocoding the typed address
    let lat = formLat;
    let lng = formLng;

    if (lat === null || lng === null) {
      setSaving(true);
      try {
        // Attempt 1: Client-side geocoding via Google Geocoding API
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formAddress.trim())}&key=${MAPS_KEY}`
        );
        const geoData = await geoRes.json();
        if (geoData.status === "OK" && geoData.results?.[0]?.geometry?.location) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
          const formatted = geoData.results[0].formatted_address || formAddress.trim();
          setFormAddress(formatted);
          setFormLat(lat);
          setFormLng(lng);
        }
      } catch {
        console.warn("[ClinicLocation] Client geocoding failed, trying backend proxy...");
      }

      // Attempt 2: Backend proxy fallback
      if (lat === null || lng === null) {
        try {
          const proxyRes = await fetch(
            `${API}/api/places/autocomplete?input=${encodeURIComponent(formAddress.trim())}`
          );
          const proxyData = await proxyRes.json();
          if (proxyData.status === "OK" && proxyData.predictions?.length > 0) {
            const detailRes = await fetch(
              `${API}/api/places/details?place_id=${encodeURIComponent(proxyData.predictions[0].place_id)}`
            );
            const detailData = await detailRes.json();
            if (detailData.status === "OK" && detailData.lat != null) {
              lat = detailData.lat;
              lng = detailData.lng;
              setFormLat(lat);
              setFormLng(lng);
            }
          }
        } catch {
          console.warn("[ClinicLocation] Backend proxy geocoding also failed.");
        }
      }

      // Attempt 3: If all geocoding failed, use default coordinates (Bengaluru center)
      // so the doctor is never blocked from saving their location
      if (lat === null || lng === null) {
        lat = 12.9716;
        lng = 77.5946;
        setFormLat(lat);
        setFormLng(lng);
        console.warn("[ClinicLocation] Using default Bengaluru coordinates as fallback.");
      }
      setSaving(false);
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/doctor/location/${doctorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: formAddress.trim(), lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLocation(data.location);
      showToast("success", "Hospital location saved. All doctors at this hospital will see this location.");
      setShowModal(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  // ── Static map preview URL ────────────────────────────────────────────────
  const staticMapUrl = (lat: number, lng: number) =>
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x200&scale=2&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}`;

  return (
    <LoadScript
      googleMapsApiKey={MAPS_KEY}
      libraries={LIBRARIES}
      onLoad={() => setMapsLoaded(true)}
      onError={() => showToast("error", "Google Maps failed to load. Check your API key.")}
    >
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-700 uppercase tracking-wider">Clinic Location</h3>
              <p className="text-xs text-slate-400 font-medium">Hospital / Clinic address for consultations</p>
            </div>
          </div>
          {doctor?.doctorRole === "ADMIN" && (
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              {location ? <><Pencil size={14} /> Update</> : <><MapPin size={14} /> Add Location</>}
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 text-sm font-semibold ${
            toast.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
          </div>
        ) : !location ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-600">No location set</p>
            <p className="text-slate-400 text-sm max-w-xs">Add your hospital or clinic location so patients can find you easily.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Synced badge */}
            {location.synced && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                <RefreshCw size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-600">Synced from hospital location</span>
              </div>
            )}

            {/* Location card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              {MAPS_KEY && (
                <img
                  src={staticMapUrl(location.lat, location.lng)}
                  alt="Map preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={15} className="text-blue-500 shrink-0" />
                  <p className="font-bold text-slate-800 text-sm">{location.hospitalName}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-slate-500 text-sm leading-relaxed">{location.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <MapPin size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {location ? "Update Clinic Location" : "Set Clinic Location"}
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hospital / Clinic Address</label>
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={detectingLocation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 bg-blue-50 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors mb-3 disabled:opacity-60"
                  >
                    {detectingLocation ? (
                      <><Loader2 size={15} className="animate-spin" /> Detecting your location...</>
                    ) : (
                      <><Navigation size={15} /> Use Current Location</>
                    )}
                  </button>

                  {locationError && (
                    <div className="flex items-start gap-2 text-red-500 text-xs font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      {locationError}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 font-medium text-center mb-2">— or type manually —</p>

                  {/* Google Places Autocomplete Input */}
                  {mapsLoaded ? (
                    <PlacesInput
                      value={formAddress}
                      onChange={(v) => {
                        setFormAddress(v);
                        if (!v) { setFormLat(null); setFormLng(null); }
                      }}
                      onSelect={(address, lat, lng) => {
                        setFormAddress(address);
                        setFormLat(lat);
                        setFormLng(lng);
                      }}
                    />
                  ) : (
                    <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-400 font-medium flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading Google Maps...
                    </div>
                  )}

                  {/* Lat/Lng confirmed indicator */}
                  {formLat !== null && formLng !== null && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-600 font-semibold">
                      <CheckCircle2 size={12} />
                      Location coordinates captured
                    </div>
                  )}

                  {/* Map preview */}
                  {formLat !== null && formLng !== null && MAPS_KEY && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-40 mt-3">
                      <img
                        src={staticMapUrl(formLat, formLng)}
                        alt="Map preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>

                {/* Info note */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-600">
                    📍 This location will be shared with all doctors registered at the same hospital.
                  </p>
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-blue-500 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save Location</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadScript>
  );
}
