"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Trash2, Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { parseSingleMedicine, extractCondition } from "@/utils/prescriptionParser";

interface MedicineCardProps {
  med: {
    medicineName: string;
    type: string;
    dosage: string;
    frequency: string;
    instructions: string;
    durationDays: string;
  };
  index: number;
  total: number;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
  onToast: (message: string, type: "success" | "error") => void;
  /** Append full raw transcript to the prescription Notes field */
  onAppendNotes: (transcript: string) => void;
  /** Set Prescription Title from extracted condition (parent guards: only if title empty) */
  onSetTitle: (condition: string) => void;
  disabled?: boolean;
}

/**
 * Fully self-contained medicine card.
 * Each card has its OWN microphone button + speech recognition instance.
 * Voice input fills ONLY this card's fields — strict isolation guaranteed.
 */
export default function MedicineCard({
  med,
  index,
  total,
  onUpdate,
  onRemove,
  onToast,
  onAppendNotes,
  onSetTitle,
  disabled = false,
}: MedicineCardProps) {
  const {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const prevTranscriptRef = useRef("");

  // Parse transcript and fill ONLY this card's empty fields
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      const parsed = parseSingleMedicine(transcript);

      // Fill only empty medicine fields — never overwrite manual entries
      if (parsed.name && !med.medicineName) onUpdate(index, "medicineName", parsed.name);
      if (parsed.dosage && !med.dosage) onUpdate(index, "dosage", parsed.dosage);
      if (parsed.frequency && !med.frequency) onUpdate(index, "frequency", parsed.frequency);
      if (parsed.durationDays && !med.durationDays) onUpdate(index, "durationDays", parsed.durationDays);

      // Append full transcript to Notes (build consultation history)
      onAppendNotes(transcript);

      // Extract condition → Prescription Title (parent only applies if title is empty)
      const condition = extractCondition(transcript);
      if (condition) onSetTitle(condition);

      if (parsed.name || parsed.dosage || parsed.frequency || parsed.durationDays) {
        onToast(`Medicine #${index + 1} updated via voice ✓`, "success");
      }
    }
  }, [transcript, med, index, onUpdate, onToast, onAppendNotes, onSetTitle]);

  useEffect(() => {
    if (error) onToast(error, "error");
  }, [error, onToast]);

  const handleMicToggle = useCallback(() => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      prevTranscriptRef.current = "";
      startListening();
    }
  }, [disabled, isListening, stopListening, resetTranscript, startListening]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl p-4 border relative transition-all duration-300 ${
        isListening
          ? "bg-teal-50/60 border-teal-300 shadow-md shadow-teal-500/10"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Pill size={12} className="text-purple-500" /> Medicine #{index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Per-card mic button */}
          {isSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={disabled}
              title={isListening ? "Stop listening" : "Voice input for this medicine"}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                disabled
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : isListening
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                  : "bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200"
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-lg bg-teal-400 animate-ping opacity-25" />
              )}
              {isListening ? (
                <MicOff size={13} className="relative z-10" />
              ) : (
                <Mic size={13} />
              )}
            </button>
          )}

          {/* Delete button — hidden for sole medicine */}
          {total > 1 && (
            <button
              onClick={() => onRemove(index)}
              className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-teal-100/60 border border-teal-200 rounded-lg px-3 py-1.5">
              <div className="flex items-end gap-[2px] h-3">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] bg-teal-500 rounded-full"
                    animate={{ height: ["4px", "12px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-teal-700">
                Listening for Medicine #{index + 1}…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript preview */}
      <AnimatePresence>
        {transcript && !isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5">
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider mb-0.5">🎙️ Heard</p>
              <p className="text-xs text-teal-800 leading-relaxed break-words">{transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 1: Medicine Name + Type */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Medicine Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={med.medicineName}
            onChange={(e) => onUpdate(index, "medicineName", e.target.value)}
            placeholder="e.g. Paracetamol"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Type</label>
          <select
            value={med.type}
            onChange={(e) => onUpdate(index, "type", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold bg-white"
          >
            <option value="tablet">💊 Tablet</option>
            <option value="capsule">💊 Capsule</option>
            <option value="syrup">🧪 Syrup</option>
            <option value="injection">💉 Injection</option>
            <option value="drops">💧 Drops</option>
            <option value="ointment">🧴 Ointment</option>
            <option value="other">🩺 Other</option>
          </select>
        </div>
      </div>

      {/* Row 2: Dosage + Frequency + Duration */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Dosage <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={med.dosage}
            onChange={(e) => onUpdate(index, "dosage", e.target.value)}
            placeholder="e.g. 500mg"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            value={med.frequency}
            onChange={(e) => onUpdate(index, "frequency", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold bg-white"
          >
            <option value="">Select…</option>
            <option value="Once daily">Once daily</option>
            <option value="Twice daily">Twice daily</option>
            <option value="Three times daily">Three times daily</option>
            <option value="Every 8 hours">Every 8 hours</option>
            <option value="Every 12 hours">Every 12 hours</option>
            <option value="Before breakfast">Before breakfast</option>
            <option value="After meals">After meals</option>
            <option value="Before bed">Before bed</option>
            <option value="As needed">As needed (PRN)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Duration (days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={med.durationDays}
            onChange={(e) => onUpdate(index, "durationDays", e.target.value)}
            placeholder="e.g. 7"
            className="w-full px-3 py-2 border border-purple-200 bg-purple-50/50 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-bold text-purple-700"
          />
        </div>
      </div>
    </motion.div>
  );
}
