"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Salad, Sparkles, AlertCircle, X, ChevronDown, ChevronUp,
  Loader2, Apple, Coffee, UtensilsCrossed, Cookie, Moon,
  Ruler, Weight, RefreshCw, Save, CheckCircle2, Info,
  Activity, Stethoscope, Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface DietPreferences {
  dietType: "vegan" | "vegetarian" | "non-vegetarian" | "";
  allergies: string;
  goal: "weight-loss" | "weight-gain" | "maintenance" | "";
}

interface SavedPlan {
  _id: string;
  patientId: string;
  preferences: DietPreferences;
  metrics: { bmi: number; dailyCalories: number };
  generatedPlan: string;
  createdAt: string;
}

interface ProfilePatch {
  height: string;
  weight: string;
}

// ── Parse plan text into sections ──────────────────────────────────────────
function parsePlanSections(plan: string) {
  const lines = plan.split("\n");
  const sections: { title: string; icon: any; color: string; items: string[] }[] = [];
  const sectionDefs: Record<string, { icon: any; color: string }> = {
    "BREAKFAST":         { icon: Coffee,          color: "from-orange-400 to-amber-500" },
    "MID-MORNING SNACK": { icon: Cookie,           color: "from-yellow-400 to-lime-500" },
    "LUNCH":             { icon: UtensilsCrossed,  color: "from-teal-400 to-emerald-500" },
    "EVENING SNACK":     { icon: Apple,            color: "from-pink-400 to-rose-500" },
    "DINNER":            { icon: Moon,             color: "from-indigo-400 to-violet-500" },
    "DIET BASIS":        { icon: Info,             color: "from-cyan-400 to-blue-500" },
    "NOTES":             { icon: Info,             color: "from-slate-400 to-slate-500" },
  };

  let currentKey: string | null = null;
  let currentItems: string[] = [];
  let calorieHeader = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Calorie header
    if (line.startsWith("DAILY CALORIE")) { calorieHeader = line; continue; }

    // Section boundary
    const secMatch = line.match(/^---([^-]+)---$/);
    if (secMatch) {
      if (currentKey && currentItems.length) {
        const def = sectionDefs[currentKey] || { icon: Salad, color: "from-slate-400 to-slate-500" };
        sections.push({ title: currentKey, icon: def.icon, color: def.color, items: [...currentItems] });
      }
      currentKey = secMatch[1].trim().toUpperCase();
      currentItems = [];
      continue;
    }

    if (currentKey) {
      // Strip bullet chars
      const clean = line.replace(/^[•\-\*]\s*/, "").trim();
      if (clean) currentItems.push(clean);
    }
  }

  // Flush last section
  if (currentKey && currentItems.length) {
    const def = sectionDefs[currentKey] || { icon: Salad, color: "from-slate-400 to-slate-500" };
    sections.push({ title: currentKey, icon: def.icon, color: def.color, items: [...currentItems] });
  }

  return { calorieHeader, sections };
}

// ── Colour chips for diet types ────────────────────────────────────────────
const DIET_COLORS: Record<string, string> = {
  vegan:           "bg-green-500",
  vegetarian:      "bg-emerald-500",
  "non-vegetarian":"bg-orange-500",
};
const GOAL_LABELS: Record<string, string> = {
  "weight-loss":  "⬇ Weight Loss",
  "weight-gain":  "⬆ Weight Gain",
  maintenance:    "↔ Maintenance",
};

// ══════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════
interface DietPlanTabProps {
  profile: any; // patient profile from parent
  onProfileUpdate: (updated: any) => void;
}

export default function DietPlanTab({ profile, onProfileUpdate }: DietPlanTabProps) {
  // ── Profile-gate modal ───────────────────────────────────────────────────
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePatch, setProfilePatch] = useState<ProfilePatch>({ height: "", weight: "" });
  const [patchSaving, setPatchSaving] = useState(false);
  const [patchError, setPatchError]   = useState("");

  // ── Preferences form ─────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<DietPreferences>({ dietType: "", allergies: "", goal: "" });
  const [formError, setFormError] = useState("");

  // ── Plan state ───────────────────────────────────────────────────────────
  const [savedPlan, setSavedPlan]     = useState<SavedPlan | null>(null);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState("");
  const [justSaved, setJustSaved]     = useState(false);

  // ── Symptom-based diet toggle ───────────────────────────────────────────
  const [useSymptoms, setUseSymptoms] = useState(false);
  const [recentSymptoms, setRecentSymptoms] = useState<string[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(false);
  const [dietMode, setDietMode] = useState<'general' | 'symptom-based'>('general');
  const [symptomsUsed, setSymptomsUsed] = useState<string[]>([]);

  // ── Auto-open modal / load saved plan on mount ───────────────────────────
  useEffect(() => {
    if (!profile?.height || !profile?.weight) {
      setShowProfileModal(true);
    } else {
      loadSavedPlan();
    }
    // Fetch recent symptoms
    const patientId = profile?.patientId || profile?.id;
    if (patientId) {
      setSymptomsLoading(true);
      fetch(`http://localhost:8000/api/diet-plans/${patientId}/recent-symptoms`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.symptoms?.length > 0) {
            setRecentSymptoms(data.symptoms);
          }
        })
        .catch(() => {})
        .finally(() => setSymptomsLoading(false));
    }
  }, [profile?.patientId]);

  const loadSavedPlan = async () => {
    const patientId = profile?.patientId || profile?.id;
    if (!patientId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/diet-plans/${patientId}`);
      const data = await res.json();
      if (data.success && data.plan) {
        setSavedPlan(data.plan);
        // Pre-fill prefs from saved
        setPrefs({
          dietType:  data.plan.preferences?.dietType || "",
          allergies: data.plan.preferences?.allergies || "",
          goal:      data.plan.preferences?.goal || "",
        });
      }
    } catch { /* silent */ }
  };

  // ── Submit profile patch ──────────────────────────────────────────────────
  const handlePatchProfile = async () => {
    setPatchError("");
    if (!profilePatch.height || !profilePatch.weight) {
      setPatchError("Both height and weight are required.");
      return;
    }
    const h = Number(profilePatch.height);
    const w = Number(profilePatch.weight);
    if (h < 50 || h > 250) { setPatchError("Height must be between 50–250 cm."); return; }
    if (w < 10 || w > 300) { setPatchError("Weight must be between 10–300 kg.");  return; }

    setPatchSaving(true);
    try {
      const patientId = profile?.patientId || profile?.id;
      const res = await fetch(`http://localhost:8000/api/diet-plans/${patientId}/update-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height: h, weight: w }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onProfileUpdate(data.profile); // sync parent profile
      setShowProfileModal(false);
      loadSavedPlan();
    } catch (err: any) {
      setPatchError(err.message || "Something went wrong.");
    } finally {
      setPatchSaving(false);
    }
  };

  // ── Generate diet plan ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    setFormError("");
    if (!prefs.dietType) { setFormError("Please select a diet preference to continue."); return; }

    // Check profile completeness again
    if (!profile?.height || !profile?.weight) {
      setShowProfileModal(true);
      return;
    }

    setGenerating(true);
    setGenError("");
    try {
      const patientId = profile?.patientId || profile?.id;
      const res = await fetch(`http://localhost:8000/api/diet-plans/${patientId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, useSymptoms }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.missingProfile) { setShowProfileModal(true); setGenerating(false); return; }
        throw new Error(data.message);
      }
      setSavedPlan(data.plan);
      setDietMode(data.dietMode || 'general');
      setSymptomsUsed(data.symptomsUsed || []);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      setGenError(err.message || "Failed to generate diet plan.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasProfile  = !!(profile?.height && profile?.weight);
  const { calorieHeader, sections } = savedPlan?.generatedPlan
    ? parsePlanSections(savedPlan.generatedPlan)
    : { calorieHeader: "", sections: [] };

  const bmi = savedPlan?.metrics?.bmi;
  const bmiLabel =
    !bmi     ? "" :
    bmi < 18.5 ? "Underweight" :
    bmi < 25   ? "Normal" :
    bmi < 30   ? "Overweight" : "Obese";
  const bmiColor =
    !bmi     ? "text-slate-500" :
    bmi < 18.5 ? "text-blue-500" :
    bmi < 25   ? "text-emerald-500" :
    bmi < 30   ? "text-orange-500" : "text-red-500";

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-[1100px] space-y-6">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-7 flex items-center gap-6 shadow-xl shadow-teal-500/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
          <Salad size={32} className="text-white" />
        </div>
        <div className="flex-1 relative z-10">
          <h2 className="text-2xl font-black text-white">AI Personalized Diet Plan</h2>
          <p className="text-teal-100 text-sm mt-1 max-w-xl">
            Get a customized daily meal plan powered by AI — tailored to your BMI, dietary preferences, and health goals.
          </p>
        </div>
        {savedPlan && (
          <div className="shrink-0 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-3 text-center">
            <p className="text-white text-[10px] font-black uppercase tracking-widest mb-0.5">Last Generated</p>
            <p className="text-white font-bold text-sm">
              {(() => { const d = new Date(savedPlan.createdAt); return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`; })()}
            </p>
          </div>
        )}
      </div>

      {/* ── Profile incomplete warning (inline) ── */}
      {!hasProfile && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Profile Incomplete</p>
            <p className="text-amber-700 text-xs mt-0.5">Height and weight are required to generate your personalized diet plan.</p>
          </div>
          <button onClick={() => setShowProfileModal(true)}
            className="shrink-0 bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
            Complete Profile
          </button>
        </motion.div>
      )}

      {/* ── Preferences + Metrics Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Preferences Form */}
        <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Your Preferences</h3>
              <p className="text-xs text-slate-500">Customize your diet plan inputs</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Diet Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                Diet Preference <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["vegan", "vegetarian", "non-vegetarian"] as const).map(dt => (
                  <button key={dt} type="button"
                    onClick={() => setPrefs(p => ({ ...p, dietType: dt }))}
                    className={`py-3 rounded-xl text-xs font-bold border-2 capitalize transition-all
                      ${prefs.dietType === dt
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300"}`}>
                    {dt === "vegan" ? "🌱 Vegan" : dt === "vegetarian" ? "🥗 Veg" : "🍗 Non-Veg"}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Allergies / Food to Avoid
                <span className="text-xs font-normal text-slate-400 ml-1">(optional)</span>
              </label>
              <input type="text"
                value={prefs.allergies}
                onChange={e => setPrefs(p => ({ ...p, allergies: e.target.value }))}
                placeholder="e.g. peanuts, dairy, gluten, shellfish"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all" />
            </div>

            {/* Goal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                Health Goal
                <span className="text-xs font-normal text-slate-400 ml-1">(optional)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["weight-loss", "maintenance", "weight-gain"] as const).map(g => (
                  <button key={g} type="button"
                    onClick={() => setPrefs(p => ({ ...p, goal: p.goal === g ? "" : g }))}
                    className={`py-3 rounded-xl text-xs font-bold border-2 transition-all
                      ${prefs.goal === g
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300"}`}>
                    {g === "weight-loss" ? "⬇ Lose Weight" : g === "weight-gain" ? "⬆ Gain Weight" : "↔ Maintain"}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-red-600 text-xs font-medium">{formError}</p>
              </div>
            )}
            {genError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-red-600 text-xs font-medium">{genError}</p>
              </div>
            )}

            {/* Symptom-based diet toggle */}
            {recentSymptoms.length > 0 && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-violet-600" />
                    <p className="text-sm font-bold text-slate-800">Use Recent Symptoms?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseSymptoms(!useSymptoms)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      useSymptoms ? 'bg-violet-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      useSymptoms ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  {useSymptoms
                    ? '✨ Diet will be tailored to manage your recent symptoms'
                    : 'Toggle ON to get a diet plan based on your recent symptoms'
                  }
                </p>
                {useSymptoms && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {recentSymptoms.slice(0, 8).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/80 border border-violet-200/60 rounded-lg text-[10px] font-bold text-violet-700 capitalize">
                        {s}
                      </span>
                    ))}
                    {recentSymptoms.length > 8 && (
                      <span className="px-2 py-0.5 bg-violet-100 rounded-lg text-[10px] font-bold text-violet-600">
                        +{recentSymptoms.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Generate Button */}
            <button onClick={handleGenerate}
              disabled={generating || !hasProfile}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 disabled:from-teal-300 disabled:to-emerald-300 text-white font-bold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/25 mt-1">
              {generating ? (
                <><Loader2 size={18} className="animate-spin" /> Generating your plan...</>
              ) : savedPlan ? (
                <><RefreshCw size={18} /> Regenerate Diet Plan</>
              ) : (
                <><Sparkles size={18} /> Generate My Diet Plan</>
              )}
            </button>

            {justSaved && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 justify-center text-emerald-600 text-sm font-bold">
                <CheckCircle2 size={16} /> Plan saved to your account!
              </motion.div>
            )}
          </div>
        </div>

        {/* Metrics Panel */}
        <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-3 mb-0">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity20 />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Your Health Metrics</h3>
              <p className="text-xs text-slate-500">Calculated from your profile</p>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Height" value={profile?.height ? `${profile.height} cm` : "—"} icon={<Ruler size={16} />} color="teal" />
            <MetricCard label="Weight" value={profile?.weight ? `${profile.weight} kg` : "—"} icon={<Weight size={16} />} color="blue" />
            <MetricCard label="Gender" value={profile?.gender || "—"} icon={null} color="purple" />
            <MetricCard label="Age" value={profile?.dob ? calcAgeDisplay(profile.dob) : "—"} icon={null} color="orange" />
          </div>

          {/* BMI Card */}
          {bmi ? (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your BMI</p>
              <p className={`text-5xl font-black ${bmiColor} mb-1`}>{bmi}</p>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                bmi < 18.5 ? "bg-blue-100 text-blue-700" :
                bmi < 25   ? "bg-emerald-100 text-emerald-700" :
                bmi < 30   ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
              }`}>{bmiLabel}</span>
              <p className="text-xs text-slate-400 mt-3">Daily Calories: <span className="font-black text-slate-700">{savedPlan.metrics.dailyCalories} kcal</span></p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 flex flex-col items-center text-center gap-2 flex-1">
              <Salad size={32} className="text-slate-300" />
              <p className="text-slate-400 text-sm font-semibold">No metrics yet</p>
              <p className="text-slate-400 text-xs">Generate a plan to see your BMI & calorie data</p>
            </div>
          )}

          {/* Previous plan badge */}
          {savedPlan && (
            <div className="flex flex-wrap gap-2">
              <span className={`text-white text-xs font-bold px-3 py-1.5 rounded-xl capitalize ${DIET_COLORS[savedPlan.preferences.dietType] || "bg-slate-500"}`}>
                {savedPlan.preferences.dietType === "non-vegetarian" ? "🍗 Non-Veg" :
                 savedPlan.preferences.dietType === "vegetarian"     ? "🥗 Vegetarian" : "🌱 Vegan"}
              </span>
              {savedPlan.preferences.goal && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                  {GOAL_LABELS[savedPlan.preferences.goal]}
                </span>
              )}
              {savedPlan.preferences.allergies && (
                <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-100">
                  ⚠ Avoids: {savedPlan.preferences.allergies}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Generated Plan Display ── */}
      <AnimatePresence>
        {savedPlan?.generatedPlan && sections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Header */}
            <div className="bg-white rounded-2xl px-6 py-4 border border-slate-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Your Daily Meal Plan</h3>
                {calorieHeader && (
                  <p className="text-sm text-teal-600 font-semibold mt-0.5">{calorieHeader}</p>
                )}
                {/* Diet mode badge */}
                <div className="flex items-center gap-2 mt-1.5">
                  {dietMode === 'symptom-based' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-200/60 px-2.5 py-1 rounded-full">
                      <Stethoscope size={10} />
                      Symptom-Based Diet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-full">
                      <Zap size={10} />
                      General Profile-Based Diet
                    </span>
                  )}
                  {symptomsUsed.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      · {symptomsUsed.slice(0, 3).join(', ')}{symptomsUsed.length > 3 ? ` +${symptomsUsed.length - 3}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Generated on {(() => { const d = new Date(savedPlan.createdAt); return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`; })()}
              </span>
            </div>

            {/* Meal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sections.map((sec, idx) => {
                const Icon = sec.icon;
                const isNotes = sec.title === "NOTES";
                const isDietBasis = sec.title === "DIET BASIS";
                return (
                  <motion.div
                    key={sec.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden ${(isNotes || isDietBasis) ? "md:col-span-2 xl:col-span-3" : ""}`}>

                    {/* Meal Header gradient */}
                    <div className={`bg-gradient-to-r ${sec.color} p-4 flex items-center gap-3`}>
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Icon size={18} className="text-white" />
                      </div>
                      <h4 className="font-black text-white text-sm tracking-wide capitalize">
                        {sec.title.split("-").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                      </h4>
                    </div>

                    {/* Items */}
                    <ul className="p-4 space-y-2">
                      {sec.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          {isNotes ? (
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 shrink-0" />
                          ) : (
                            <span className="w-5 h-5 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</span>
                          )}
                          <span className="text-slate-700 font-medium leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs font-medium leading-relaxed">
                <strong>Disclaimer:</strong> This diet plan is AI-generated for informational purposes only.
                Please consult a registered dietitian or your doctor before making significant dietary changes,
                especially if you have a chronic condition or are on medication.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile Completion Modal ── */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">

              {/* Close — only if profile already has data */}
              {hasProfile && (
                <button onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              )}

              {/* Icon */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <Salad size={28} className="text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Complete Your Profile</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Required to generate your diet plan</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 leading-relaxed">
                Your <strong>height</strong> and <strong>weight</strong> are used to calculate your BMI and estimate daily calorie needs.
                This data will also sync with your main profile.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Height (cm) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number"
                      value={profilePatch.height}
                      onChange={e => setProfilePatch(p => ({ ...p, height: e.target.value }))}
                      placeholder="e.g. 170" min={50} max={250}
                      className="w-full pl-8 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number"
                      value={profilePatch.weight}
                      onChange={e => setProfilePatch(p => ({ ...p, weight: e.target.value }))}
                      placeholder="e.g. 65" min={10} max={300}
                      className="w-full pl-8 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                  </div>
                </div>

                {patchError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-xs font-medium">{patchError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {hasProfile && (
                  <button onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">
                    Cancel
                  </button>
                )}
                <button onClick={handlePatchProfile}
                  disabled={patchSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 disabled:from-teal-300 text-white font-bold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/20">
                  {patchSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save & Continue</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode | null; color: string }) {
  const bgMap: Record<string, string> = {
    teal:   "bg-teal-50 text-teal-600",
    blue:   "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
      <p className="text-xs text-slate-400 font-semibold mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${bgMap[color]}`}>{icon}</span>}
        <p className="font-black text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function Activity20() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function calcAgeDisplay(dob: string): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
}
