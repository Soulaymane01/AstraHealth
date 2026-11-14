import { BACK_MUSCLES, FRONT_MUSCLES, MUSCLE_GROUPS } from "body-muscles";

export type StepKey = "vitals" | "sleep" | "mood" | "symptoms" | "training";

export interface MetricField {
  code: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  section?: string;
}

export interface ScaleField {
  code: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  labels: string[];
  hint?: string;
  optional?: boolean;
}

export interface StepDefinition {
  key: StepKey;
  title: string;
  short: string;
  description: string;
  fields: MetricField[];
  scales: ScaleField[];
  article: {
    slug: string;
    title: string;
    source: string;
    body: string;
  };
}

const VITALS: MetricField[] = [
  {
    code: "heart_rate",
    label: "Resting heart rate",
    unit: "bpm",
    min: 30,
    max: 220,
    step: 1,
    placeholder: "e.g. 68",
    section: "Cardiovascular",
  },
  {
    code: "hrv_rmssd",
    label: "HRV (RMSSD)",
    unit: "ms",
    min: 5,
    max: 250,
    step: 1,
    placeholder: "e.g. 52",
    hint: "From a wearable or the morning reading.",
    optional: true,
    section: "Cardiovascular",
  },
  {
    code: "systolic_bp",
    label: "Systolic pressure",
    unit: "mmHg",
    min: 60,
    max: 250,
    step: 1,
    placeholder: "e.g. 118",
    optional: true,
    section: "Cardiovascular",
  },
  {
    code: "diastolic_bp",
    label: "Diastolic pressure",
    unit: "mmHg",
    min: 30,
    max: 150,
    step: 1,
    placeholder: "e.g. 76",
    optional: true,
    section: "Cardiovascular",
  },
  {
    code: "orthostatic_hr_rise",
    label: "Orthostatic HR rise",
    unit: "bpm",
    min: 0,
    max: 80,
    step: 1,
    placeholder: "e.g. 8",
    hint: "Heart-rate increase after standing for one minute.",
    optional: true,
    section: "Cardiovascular",
  },
  {
    code: "body_temp_c",
    label: "Core temperature",
    unit: "°C",
    min: 33,
    max: 43,
    step: 0.1,
    placeholder: "e.g. 36.7",
    section: "Body",
  },
  {
    code: "spo2",
    label: "Oxygen saturation",
    unit: "%",
    min: 70,
    max: 100,
    step: 1,
    placeholder: "e.g. 98",
    optional: true,
    section: "Body",
  },
  {
    code: "blood_glucose",
    label: "Blood glucose",
    unit: "mg/dL",
    min: 30,
    max: 500,
    step: 1,
    placeholder: "e.g. 95",
    optional: true,
    section: "Body",
  },
];

const SLEEP: MetricField[] = [
  {
    code: "sleep_duration_h",
    label: "Sleep duration",
    unit: "h",
    min: 0,
    max: 16,
    step: 0.1,
    placeholder: "e.g. 7.2",
  },
  {
    code: "sleep_efficiency_pct",
    label: "Sleep efficiency",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    placeholder: "e.g. 91",
    hint: "Time asleep divided by time in bed.",
    optional: true,
  },
  {
    code: "sleep_latency_min",
    label: "Sleep latency",
    unit: "min",
    min: 0,
    max: 180,
    step: 1,
    placeholder: "e.g. 16",
    hint: "Minutes needed to fall asleep.",
    optional: true,
  },
];

const MOOD_SCALES: ScaleField[] = [
  {
    code: "mood_score",
    label: "Mood",
    lowLabel: "Very low",
    highLabel: "Very good",
    labels: ["Very low", "Low", "Moderate", "Good", "Very good"],
  },
  {
    code: "stress_score",
    label: "Stress",
    lowLabel: "Calm",
    highLabel: "Overloaded",
    labels: ["None", "Mild", "Moderate", "High", "Severe"],
  },
  {
    code: "social_interaction_score",
    label: "Crew contact",
    lowLabel: "Isolated",
    highLabel: "Well connected",
    labels: ["Isolated", "Limited", "Neutral", "Connected", "Very connected"],
    hint: "Quality of contact with crewmates and family.",
    optional: true,
  },
];

const MOOD_METRICS: MetricField[] = [
  {
    code: "reaction_time_ms",
    label: "Reaction time",
    unit: "ms",
    min: 100,
    max: 800,
    step: 1,
    placeholder: "e.g. 248",
    hint: "Only if you completed the short cognitive check.",
    optional: true,
  },
];

const TRAINING: MetricField[] = [
  {
    code: "exercise_load_min",
    label: "Exercise load",
    unit: "min",
    min: 0,
    max: 300,
    step: 1,
    placeholder: "e.g. 45",
    section: "Loading",
  },
  {
    code: "bone_load_min",
    label: "Bone-load minutes",
    unit: "min",
    min: 0,
    max: 180,
    step: 1,
    placeholder: "e.g. 28",
    hint: "Impact or heavy resistance work.",
    optional: true,
    section: "Loading",
  },
  {
    code: "strength_check",
    label: "Strength check",
    unit: "%",
    min: 0,
    max: 150,
    step: 1,
    placeholder: "e.g. 92",
    hint: "Relative to your pre-mission baseline.",
    optional: true,
    section: "Loading",
  },
  {
    code: "body_mass",
    label: "Body mass",
    unit: "kg",
    min: 30,
    max: 250,
    step: 0.1,
    placeholder: "e.g. 72.0",
    optional: true,
    section: "Fuel & mass",
  },
  {
    code: "hydration_l",
    label: "Hydration",
    unit: "L",
    min: 0,
    max: 10,
    step: 0.1,
    placeholder: "e.g. 2.3",
    section: "Fuel & mass",
  },
  {
    code: "caloric_intake",
    label: "Caloric intake",
    unit: "kcal",
    min: 0,
    max: 8000,
    step: 10,
    placeholder: "e.g. 2150",
    optional: true,
    section: "Fuel & mass",
  },
  {
    code: "vitamin_d",
    label: "Vitamin D",
    unit: "ng/mL",
    min: 0,
    max: 150,
    step: 1,
    placeholder: "e.g. 38",
    optional: true,
    section: "Fuel & mass",
  },
];

export const CHECKIN_STEPS: StepDefinition[] = [
  {
    key: "vitals",
    title: "Vitals",
    short: "Vitals",
    description: "Sensor-filled. Edit only if needed.",
    fields: VITALS,
    scales: [],
    article: {
      slug: "hrv-basics",
      title: "Why HRV falls before you feel tired",
      source: "NASA Human Research Program",
      body: "Heart rate, blood pressure, temperature, and oxygen saturation are captured by habitat and suit sensors. We compare them with your own 21-day baseline, not a population average, because microgravity changes what normal looks like. A single reading is context; a trend over several days is the signal.",
    },
  },
  {
    key: "sleep",
    title: "Sleep",
    short: "Sleep",
    description: "Last night.",
    fields: SLEEP,
    scales: [],
    article: {
      slug: "sleep-circadian",
      title: "Sleep loss in a 24-hour light cycle",
      source: "NASA Human Research Program",
      body: "Without a sunrise, the circadian clock drifts. Duration, efficiency, and latency show whether sleep is short or fragmented before it shows up in mood and HRV. Sleep under six hours for several nights, efficiency below 85%, or rising latency are early warning signs.",
    },
  },
  {
    key: "mood",
    title: "Mood & Stress",
    short: "Mood",
    description: "Private. No right answer.",
    fields: MOOD_METRICS,
    scales: MOOD_SCALES,
    article: {
      slug: "isolation-confinement",
      title: "Isolation, confinement, and mood",
      source: "NASA Human Research Program",
      body: "Behavioral health changes can be gradual. Mood below baseline for several days, withdrawal from crew contact, irritability, and low motivation are early signals. Sleep, social contact, and a predictable routine are the first countermeasures. Persistent low mood or any thought of self-harm is an immediate escalation.",
    },
  },
  {
    key: "symptoms",
    title: "Symptoms",
    short: "Symptoms",
    description: "Tap the body. Red flags escalate.",
    fields: [],
    scales: [],
    article: {
      slug: "red-flags",
      title: "When to contact the flight surgeon",
      source: "NASA Human Research Program",
      body: "Chest pain, shortness of breath, fainting, sudden vision loss, or a fever with tachycardia should never wait for a trend. The same is true for a new rash with fever, persistent vomiting, or a head injury. This check-in is guidance, not a diagnosis.",
    },
  },
  {
    key: "training",
    title: "Training & Nutrition",
    short: "Training",
    description: "Load, fuel, hydration.",
    fields: TRAINING,
    scales: [],
    article: {
      slug: "bone-loading",
      title: "Bone loss and the loading budget",
      source: "NASA Human Research Program",
      body: "Mechanical loading is the signal bone needs. Resistance work that loads the squat, hinge, push, pull, and carry patterns is prescribed as a minimum effective dose. Pair it with steady fluid and energy intake. Consistency matters more than one heroic session.",
    },
  },
];

export type SymptomRegion = "head" | "chest" | "abdomen" | "back" | "arms" | "legs" | "whole";

export interface SymptomRegionDefinition {
  id: SymptomRegion;
  label: string;
}

export const SYMPTOM_REGIONS: SymptomRegionDefinition[] = [
  { id: "head", label: "Head & neck" },
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "back", label: "Back" },
  { id: "arms", label: "Arms & hands" },
  { id: "legs", label: "Legs & feet" },
  { id: "whole", label: "Whole body" },
];

export const SYMPTOM_OPTIONS: Record<SymptomRegion, string[]> = {
  head: [
    "Headache",
    "Dizziness",
    "Vision change",
    "Vision loss",
    "Sore throat",
    "Congestion",
    "Numbness or tingling",
  ],
  chest: ["Chest pain", "Shortness of breath", "Palpitations", "Pressure or tightness"],
  abdomen: ["Nausea", "Abdominal pain", "Cramping", "Loss of appetite"],
  back: ["Back pain", "Stiffness", "Numbness or tingling"],
  arms: ["Pain", "Swelling", "Numbness or tingling", "Weakness"],
  legs: ["Pain", "Swelling", "Numbness or tingling", "Weakness", "Cramping"],
  whole: ["Fever", "Rash", "Fatigue", "Chills", "Other"],
};

export const SYMPTOM_DURATIONS = ["Today", "1-3 days", "4-7 days", "Over a week"];

const GROUP_REGION: Record<string, SymptomRegion> = {
  "Head & Neck": "head",
  Chest: "chest",
  Abdominals: "abdomen",
  Back: "back",
  Shoulders: "arms",
  Arms: "arms",
  Legs: "legs",
  "Hands & Feet": "arms",
};

const MUSCLE_REGION: Record<string, SymptomRegion> = {};
for (const [group, ids] of Object.entries(MUSCLE_GROUPS)) {
  const region = GROUP_REGION[group] ?? "whole";
  for (const id of ids) MUSCLE_REGION[id] = region;
}
for (const id of Object.keys(MUSCLE_REGION)) {
  if (id.includes("foot")) MUSCLE_REGION[id] = "legs";
  if (id.includes("hand")) MUSCLE_REGION[id] = "arms";
}

export function symptomRegionForMuscle(id: string): SymptomRegion {
  return MUSCLE_REGION[id] ?? "whole";
}

export const SYMPTOM_MUSCLES = {
  front: FRONT_MUSCLES,
  back: BACK_MUSCLES,
} as const;
