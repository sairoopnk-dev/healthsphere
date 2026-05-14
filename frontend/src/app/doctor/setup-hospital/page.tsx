"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Navigation,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";

const API = "http://localhost:8000";
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru

// Form state per design §setup-hospital
type FormState = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  submitting: boolean;
  error: string | null;
  mapLoadFailed: boolean; // flips true after 10s timeout (Req 10.5)
  geoError: string | null; // set on geolocation denial (Req 4.3)
};

const INITIAL_STATE: FormState = {
  name: "",
  latitude: null,
  longitude: null,
  address: "",
  submitting: false,
  error: null,
  mapLoadFailed: false,
  geoError: null,
};

// ── Places autocomplete (same pattern as ClinicLocation.tsx) ────────────────
function PlacesInput({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  const {
    ready,
    value: inputVal,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: "in" } },
    debounce: 300,
  });

  useEffect(() => {
    setValue(value, false);
  }, [value, setValue]);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    onChange(description);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(results[0]?.formatted_address || description, lat, lng);
    } catch (err) {
      console.error("[setup-hospital] Geocoding failed:", err);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
          disabled={!ready || disabled}
          placeholder="Search address (India)…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        />
      </div>
      {status === "OK" && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {data.map(({ place_id, description }) => (
            <li key={place_id}>
              <button
                type="button"
                onClick={() => handleSelect(description)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
              >
                {description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP HOSPITAL PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function SetupHospitalPage() {
  const router = useRouter();
  const { doctor, updateHospitalMembership, showToast } = useDoctor();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    []
  );

  // ── 10s map-load timeout fallback (Req 10.5) ─────────────────────────────
  useEffect(() => {
    if (mapsLoaded || state.mapLoadFailed) return;
    const t = setTimeout(() => {
      if (!mapsLoaded) {
        setState((s) => ({ ...s, mapLoadFailed: true }));
      }
    }, 10_000);
    return () => clearTimeout(t);
  }, [mapsLoaded, state.mapLoadFailed]);

  // ── Use-current-location (15s timeout, graceful failure per Req 4.3) ─────
  const handleUseCurrent = useCallback(() => {
    setState((s) => ({ ...s, geoError: null }));

    if (!navigator.geolocation) {
      setField("geoError", "Unable to access current location");
      return;
    }

    const abort = setTimeout(() => {
      setField("geoError", "Unable to access current location");
    }, 15_000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(abort);
        setState((s) => ({
          ...s,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          geoError: null,
        }));
      },
      () => {
        clearTimeout(abort);
        setField("geoError", "Unable to access current location");
      },
      { timeout: 15_000, maximumAge: 0 }
    );
  }, [setField]);

  // ── Marker drag handler (Req 10.4) ───────────────────────────────────────
  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      setState((s) => ({
        ...s,
        latitude: e.latLng!.lat(),
        longitude: e.latLng!.lng(),
      }));
    },
    []
  );

  // ── Submit flow (Req 4.4, 4.10) ──────────────────────────────────────────
  const submitDisabled =
    !state.name ||
    state.latitude == null ||
    state.longitude == null ||
    !state.address ||
    state.submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;
    if (!doctor?.id) {
      setField("error", "Session expired. Please sign in again.");
      return;
    }

    setState((s) => ({ ...s, submitting: true, error: null }));

    try {
      const res = await fetch(`${API}/api/hospital/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        credentials: "include",
        body: JSON.stringify({
          name: state.name,
          latitude: state.latitude,
          longitude: state.longitude,
          address: state.address,
          createdBy: doctor.id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // 4xx → inline; 5xx → toast (design §setup-hospital submit flow)
        if (res.status >= 500) {
          showToast(data?.message || "Server error", "error");
        } else {
          setField("error", data?.message || "Failed to create hospital");
        }
        setField("submitting", false);
        return;
      }

      // 201 → sync context + navigate (Req 4.10)
      updateHospitalMembership(data.hospitalId, "ADMIN");
      showToast("Hospital created successfully", "success");
      router.push("/doctor/overview");
    } catch (err: any) {
      showToast(err?.message || "Network error", "error");
      setField("submitting", false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const mapCenter =
    state.latitude != null && state.longitude != null
      ? { lat: state.latitude, lng: state.longitude }
      : DEFAULT_CENTER;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/40 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-3">
            <div
              className="p-3 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #10B981, #0EA5E9)" }}
            >
              <Building2 size={26} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Your Clinic
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Set up your hospital so you can start managing appointments,
            records, and your team of doctors.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Clinic / Hospital Name
            </label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. HealthSphere Clinic"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              disabled={state.submitting}
            />
          </div>

          {/* Location block */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Location
              </label>
              <button
                type="button"
                onClick={handleUseCurrent}
                disabled={state.submitting}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Navigation size={13} />
                Use Current Location
              </button>
            </div>

            {/* Geo error */}
            {state.geoError && (
              <div className="mb-3 flex items-start gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{state.geoError}</span>
              </div>
            )}

            {/* Places autocomplete (only when maps script is loaded) */}
            {mapsLoaded && !state.mapLoadFailed && (
              <div className="mb-3">
                <PlacesInput
                  value={state.address}
                  onChange={(v) => setField("address", v)}
                  onSelect={(formatted, lat, lng) =>
                    setState((s) => ({
                      ...s,
                      address: formatted,
                      latitude: lat,
                      longitude: lng,
                    }))
                  }
                  disabled={state.submitting}
                />
              </div>
            )}

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 h-[300px] relative bg-slate-100">
              {!state.mapLoadFailed && MAPS_KEY ? (
                <LoadScript
                  googleMapsApiKey={MAPS_KEY}
                  libraries={LIBRARIES}
                  onLoad={() => setMapsLoaded(true)}
                  loadingElement={
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Loading map…
                    </div>
                  }
                >
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={state.latitude != null ? 15 : 11}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      styles: [
                        {
                          featureType: "poi",
                          elementType: "labels",
                          stylers: [{ visibility: "off" }],
                        },
                      ],
                    }}
                    onClick={(e) => {
                      if (!e.latLng) return;
                      setState((s) => ({
                        ...s,
                        latitude: e.latLng!.lat(),
                        longitude: e.latLng!.lng(),
                      }));
                    }}
                  >
                    {state.latitude != null && state.longitude != null && (
                      <Marker
                        position={{ lat: state.latitude, lng: state.longitude }}
                        draggable
                        onDragEnd={handleMarkerDragEnd}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              ) : (
                // 10s timeout fallback (Req 10.5)
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50">
                  <AlertCircle size={22} className="text-amber-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 mb-4">
                    Map failed to load
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={state.latitude ?? ""}
                        onChange={(e) =>
                          setField(
                            "latitude",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={state.longitude ?? ""}
                        onChange={(e) =>
                          setField(
                            "longitude",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coords read-out */}
            {state.latitude != null && state.longitude != null && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <MapPin size={12} />
                {state.latitude.toFixed(5)}, {state.longitude.toFixed(5)}
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Address
            </label>
            <textarea
              value={state.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="123 Main Street, Bengaluru, Karnataka, 560001"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
              disabled={state.submitting}
            />
          </div>

          {/* Inline error */}
          {state.error && (
            <div className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #10B981, #0EA5E9)",
              boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)",
            }}
          >
            {state.submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating hospital
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Create Hospital
              </>
            )}
          </button>
        </motion.form>

        {/* Footer branding */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
          <Heart size={12} />
          <span className="text-xs font-medium">HealthSphere</span>
        </div>
      </div>
    </div>
  );
}
