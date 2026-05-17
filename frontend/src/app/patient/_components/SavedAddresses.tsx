"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import {
  MapPin, Plus, Pencil, Trash2, Star, Navigation,
  X, Check, Home, Briefcase, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL!;
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];

// ── Types ────────────────────────────────────────────────────────────────────
interface Address {
  _id: string;
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

// ── Label options ─────────────────────────────────────────────────────────────
const LABEL_OPTIONS = ["Home", "Work", "Parents House", "Emergency Address", "Temporary Stay", "Other"];

const labelIcon = (label: string) => {
  if (label === "Home") return <Home size={14} />;
  if (label === "Work") return <Briefcase size={14} />;
  return <MapPin size={14} />;
};

// ── Autocomplete Input ────────────────────────────────────────────────────────
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
  } = usePlacesAutocomplete({ requestOptions: { language: "en" }, debounce: 300 });

  // Sync external value changes (e.g., when current-location is used)
  useEffect(() => {
    setValue(value, false);
  }, [value, setValue]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleSelect = async (description: string) => {
    setValue(description, false);
    onChange(description);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(description, lat, lng);
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
  };

  return (
    <div className="relative">
      <input
        value={inputVal}
        onChange={handleInput}
        disabled={!ready}
        placeholder="Start typing an address..."
        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all text-sm"
      />
      {status === "OK" && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="flex items-start gap-2 px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm text-slate-700 font-medium"
            >
              <MapPin size={14} className="text-teal-500 shrink-0 mt-0.5" />
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Map Preview ───────────────────────────────────────────────────────────────
function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 mt-3">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat, lng }}
        zoom={15}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        <Marker position={{ lat, lng }} />
      </GoogleMap>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SavedAddresses({ patientId }: { patientId: string }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Modal form state
  const [formLabel, setFormLabel] = useState("Home");
  const [customLabel, setCustomLabel] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [formDefault, setFormDefault] = useState(false);

  // Current location detection state
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch patient addresses on mount ──────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    if (!patientId || patientId === "...") return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/patients/${patientId}/dashboard`);
      const data = await res.json();
      setAddresses(data.profile?.addresses || []);
    } catch {
      showToast("error", "Failed to load saved addresses.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  // ── Open modal ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingAddr(null);
    setFormLabel("Home");
    setCustomLabel("");
    setFormAddress("");
    setFormLat(null);
    setFormLng(null);
    setFormDefault(false);
    setLocationError("");
    setShowModal(true);
  };

  const openEdit = (addr: Address) => {
    setEditingAddr(addr);
    const knownLabel = LABEL_OPTIONS.includes(addr.label) ? addr.label : "Other";
    setFormLabel(knownLabel);
    setCustomLabel(knownLabel === "Other" ? addr.label : "");
    setFormAddress(addr.fullAddress);
    setFormLat(addr.lat);
    setFormLng(addr.lng);
    setFormDefault(addr.isDefault);
    setLocationError("");
    setShowModal(true);
  };

  // ── Current location ─────────────────────────────────────────────────────
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

  // ── Save (add / update) ──────────────────────────────────────────────────
  const handleSave = async () => {
    const finalLabel = formLabel === "Other" ? customLabel.trim() : formLabel;
    if (!finalLabel) { showToast("error", "Please select or enter a label."); return; }
    if (!formAddress.trim()) { showToast("error", "Please enter or select an address."); return; }
    if (formLat === null || formLng === null) {
      showToast("error", "Please select an address from suggestions or use current location to get coordinates.");
      return;
    }

    setSaving(true);
    try {
      const body = { label: finalLabel, fullAddress: formAddress.trim(), lat: formLat, lng: formLng, isDefault: formDefault };
      let res;
      if (editingAddr) {
        res = await fetch(`${API}/api/patients/${patientId}/addresses/${editingAddr._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API}/api/patients/${patientId}/addresses`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAddresses(data.addresses || []);
      showToast("success", editingAddr ? "Address updated successfully." : "Address saved successfully.");
      setShowModal(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (addr: Address) => {
    setDeletingId(addr._id);
    try {
      const res = await fetch(`${API}/api/patients/${patientId}/addresses/${addr._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAddresses(data.addresses || []);
      showToast("success", "Address removed.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete address.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Set default ──────────────────────────────────────────────────────────
  const handleSetDefault = async (addr: Address) => {
    try {
      const res = await fetch(`${API}/api/patients/${patientId}/addresses/${addr._id}/default`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAddresses(data.addresses || []);
      showToast("success", `"${addr.label}" set as default.`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update default.");
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={MAPS_KEY}
      libraries={LIBRARIES}
      onLoad={() => setMapsLoaded(true)}
      onError={() => showToast("error", "Google Maps failed to load. Check your API key.")}
    >
      <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-2xl flex items-center justify-center">
              <MapPin size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Saved Addresses</h3>
              <p className="text-xs text-slate-400 font-medium">Manage locations for consultations & home care</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            disabled={!mapsLoaded}
            className="flex items-center gap-2 bg-teal-500 disabled:bg-teal-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Address
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 text-sm font-semibold ${
            toast.type === "success" ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Address list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="text-teal-400 animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <MapPin size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700">No saved addresses yet</p>
            <p className="text-slate-400 text-sm max-w-xs">Add your home, work, or any other address for quick access during consultations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  addr.isDefault ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {addr.isDefault && (
                  <span className="absolute top-3 right-3 bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={9} fill="white" /> DEFAULT
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-teal-600">
                    {labelIcon(addr.label)}
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{addr.label}</p>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{addr.fullAddress}</p>
                <div className="flex gap-2 flex-wrap">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr)}
                      className="flex items-center gap-1.5 text-xs font-bold text-teal-600 border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      <Star size={11} /> Set Default
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addr)}
                    disabled={deletingId === addr._id}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingId === addr._id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
                <div className="w-10 h-10 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <MapPin size={20} className="text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingAddr ? "Edit Address" : "Add New Address"}
                </h2>
              </div>

              <div className="space-y-5">
                {/* Label selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address Label</label>
                  <div className="flex flex-wrap gap-2">
                    {LABEL_OPTIONS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setFormLabel(l)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          formLabel === l
                            ? "bg-teal-500 border-teal-400 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-300"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {formLabel === "Other" && (
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Enter custom label..."
                      className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 text-sm transition-all"
                    />
                  )}
                </div>

                {/* Current location button */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={detectingLocation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-teal-300 text-teal-600 bg-teal-50 rounded-xl text-sm font-bold hover:bg-teal-100 transition-colors mb-3 disabled:opacity-60"
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

                  <PlacesInput
                    value={formAddress}
                    onChange={(v) => { setFormAddress(v); if (!v) { setFormLat(null); setFormLng(null); } }}
                    onSelect={(address, lat, lng) => { setFormAddress(address); setFormLat(lat); setFormLng(lng); }}
                  />

                  {formLat !== null && formLng !== null && mapsLoaded && (
                    <MapPreview lat={formLat} lng={formLng} />
                  )}
                </div>

                {/* Set as default toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setFormDefault(!formDefault)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${formDefault ? "bg-teal-500" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formDefault ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">Set as default address</span>
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-teal-500 disabled:bg-teal-300 text-white font-bold py-3.5 rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save Address</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadScript>
  );
}
