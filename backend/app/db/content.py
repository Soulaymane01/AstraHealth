"""Seed content for the AstraHealth demo.

This file holds the metric catalog, knowledge articles, quizzes, training
catalog and achievements. The content is a mix of operational
guidance and educational material. It is not a medical protocol.
"""

METRIC_DEFINITIONS = [
    {
        "code": "heart_rate",
        "name": "Heart rate",
        "unit": "bpm",
        "domain": "Cardiovascular",
        "description": "Resting heart rate. A rise can reflect stress, illness, dehydration, or sleep debt.",
        "normal_min": 50,
        "normal_max": 100,
        "floor_sd": 4,
        "frequency": "daily",
        "source_types": ["manual", "camera_rppg", "device"],
    },
    {
        "code": "hrv_rmssd",
        "name": "HRV (RMSSD)",
        "unit": "ms",
        "domain": "Cardiovascular",
        "description": "Beat-to-beat variability. A falling trend often precedes fatigue and illness.",
        "normal_min": 30,
        "normal_max": 80,
        "floor_sd": 5,
        "frequency": "daily",
        "source_types": ["manual", "device"],
    },
    {
        "code": "systolic_bp",
        "name": "Systolic blood pressure",
        "unit": "mmHg",
        "domain": "Cardiovascular",
        "description": "Pressure during heart contraction. Measured with a cuff on the ground or in orbit.",
        "normal_min": 90,
        "normal_max": 130,
        "floor_sd": 6,
        "frequency": "weekly",
        "source_types": ["manual", "device"],
    },
    {
        "code": "diastolic_bp",
        "name": "Diastolic blood pressure",
        "unit": "mmHg",
        "domain": "Cardiovascular",
        "description": "Pressure between beats. Read together with systolic pressure.",
        "normal_min": 60,
        "normal_max": 85,
        "floor_sd": 5,
        "frequency": "weekly",
        "source_types": ["manual", "device"],
    },
    {
        "code": "orthostatic_hr_rise",
        "name": "Orthostatic HR rise",
        "unit": "bpm",
        "domain": "Cardiovascular",
        "description": "Heart-rate increase when standing. A large rise can signal reduced orthostatic tolerance.",
        "normal_min": 0,
        "normal_max": 20,
        "floor_sd": 4,
        "frequency": "weekly",
        "source_types": ["manual", "derived"],
    },
    {
        "code": "exercise_load_min",
        "name": "Exercise load",
        "unit": "min",
        "domain": "Musculoskeletal",
        "description": "Minutes of prescribed aerobic or resistance work completed in the day.",
        "normal_min": 20,
        "normal_max": 60,
        "floor_sd": 10,
        "frequency": "every_3_days",
        "source_types": ["manual", "device"],
    },
    {
        "code": "bone_load_min",
        "name": "Bone-load minutes",
        "unit": "min",
        "domain": "Musculoskeletal",
        "description": "Minutes of mechanical loading that signal bone to retain density.",
        "normal_min": 15,
        "normal_max": 45,
        "floor_sd": 8,
        "frequency": "every_3_days",
        "source_types": ["manual"],
    },
    {
        "code": "strength_check",
        "name": "Strength check",
        "unit": "%",
        "domain": "Musculoskeletal",
        "description": "Relative strength against the pre-mission baseline, from a simple load test.",
        "normal_min": 80,
        "normal_max": 100,
        "floor_sd": 5,
        "frequency": "weekly",
        "source_types": ["manual"],
    },
    {
        "code": "body_mass",
        "name": "Body mass",
        "unit": "kg",
        "domain": "Musculoskeletal",
        "description": "Body mass trend. Rapid loss can signal inadequate intake or fluid loss.",
        "normal_min": 60,
        "normal_max": 85,
        "floor_sd": 1,
        "frequency": "weekly",
        "source_types": ["manual", "device"],
    },
    {
        "code": "sleep_duration_h",
        "name": "Sleep duration",
        "unit": "h",
        "domain": "Sleep & circadian",
        "description": "Total sleep in the last 24 hours. The usual target is 7–9 hours.",
        "normal_min": 7,
        "normal_max": 9,
        "floor_sd": 0.6,
        "frequency": "daily",
        "source_types": ["manual", "device"],
    },
    {
        "code": "sleep_efficiency_pct",
        "name": "Sleep efficiency",
        "unit": "%",
        "domain": "Sleep & circadian",
        "description": "Time asleep divided by time in bed. A falling trend suggests fragmented sleep.",
        "normal_min": 85,
        "normal_max": 100,
        "floor_sd": 4,
        "frequency": "daily",
        "source_types": ["manual", "device"],
    },
    {
        "code": "sleep_latency_min",
        "name": "Sleep latency",
        "unit": "min",
        "domain": "Sleep & circadian",
        "description": "Minutes needed to fall asleep. Long latency can reflect stress or circadian drift.",
        "normal_min": 5,
        "normal_max": 25,
        "floor_sd": 5,
        "frequency": "daily",
        "source_types": ["manual", "device"],
    },
    {
        "code": "mood_score",
        "name": "Mood",
        "unit": "/5",
        "domain": "Neurobehavioral",
        "description": "Self-reported mood on a 1–5 scale. A sustained drop is worth a conversation.",
        "normal_min": 3,
        "normal_max": 5,
        "floor_sd": 0.5,
        "frequency": "daily",
        "source_types": ["manual"],
    },
    {
        "code": "stress_score",
        "name": "Stress",
        "unit": "/5",
        "domain": "Neurobehavioral",
        "description": "Self-reported stress on a 1–5 scale. Read alongside sleep and workload.",
        "normal_min": 1,
        "normal_max": 3,
        "floor_sd": 0.5,
        "frequency": "daily",
        "source_types": ["manual"],
    },
    {
        "code": "reaction_time_ms",
        "name": "Reaction time",
        "unit": "ms",
        "domain": "Neurobehavioral",
        "description": "Simple reaction time from a short cognitive check. Fatigue slows it down.",
        "normal_min": 200,
        "normal_max": 300,
        "floor_sd": 20,
        "frequency": "weekly",
        "source_types": ["manual"],
    },
    {
        "code": "social_interaction_score",
        "name": "Social interaction",
        "unit": "/5",
        "domain": "Neurobehavioral",
        "description": "Self-reported quality of crew contact. Isolation is a spaceflight hazard.",
        "normal_min": 3,
        "normal_max": 5,
        "floor_sd": 0.5,
        "frequency": "every_3_days",
        "source_types": ["manual"],
    },
    {
        "code": "blood_glucose",
        "name": "Blood glucose",
        "unit": "mg/dL",
        "domain": "Metabolic & nutrition",
        "description": "Capillary glucose. Values below 70 or above 250 need immediate attention.",
        "normal_min": 70,
        "normal_max": 140,
        "floor_sd": 10,
        "frequency": "every_3_days",
        "source_types": ["manual", "device"],
    },
    {
        "code": "hydration_l",
        "name": "Hydration",
        "unit": "L",
        "domain": "Metabolic & nutrition",
        "description": "Fluid intake in the last 24 hours. Fluid shifts make hydration easy to misread.",
        "normal_min": 2.0,
        "normal_max": 3.0,
        "floor_sd": 0.3,
        "frequency": "daily",
        "source_types": ["manual"],
    },
    {
        "code": "caloric_intake",
        "name": "Caloric intake",
        "unit": "kcal",
        "domain": "Metabolic & nutrition",
        "description": "Estimated energy intake. Long missions require steady intake to protect mass.",
        "normal_min": 1800,
        "normal_max": 2600,
        "floor_sd": 150,
        "frequency": "daily",
        "source_types": ["manual"],
    },
    {
        "code": "vitamin_d",
        "name": "Vitamin D",
        "unit": "ng/mL",
        "domain": "Metabolic & nutrition",
        "description": "Vitamin D status. Low values affect bone and immune health.",
        "normal_min": 30,
        "normal_max": 50,
        "floor_sd": 5,
        "frequency": "weekly",
        "source_types": ["manual", "device"],
    },
    {
        "code": "body_temp_c",
        "name": "Core temperature",
        "unit": "°C",
        "domain": "Immune & sensory",
        "description": "Core temperature. A value at or above 38 °C with tachycardia is an escalation.",
        "normal_min": 36.1,
        "normal_max": 37.5,
        "floor_sd": 0.3,
        "frequency": "daily",
        "source_types": ["manual", "device"],
    },
    {
        "code": "symptom_score",
        "name": "Symptom load",
        "unit": "/10",
        "domain": "Immune & sensory",
        "description": "Combined severity of reported symptoms. Derived from the symptom log.",
        "normal_min": 0,
        "normal_max": 2,
        "floor_sd": 1,
        "frequency": "daily",
        "source_types": ["manual", "derived"],
    },
    {
        "code": "vision_change_score",
        "name": "Vision change",
        "unit": "/10",
        "domain": "Immune & sensory",
        "description": "Self-reported change in visual acuity or field. Any sudden loss is an escalation.",
        "normal_min": 0,
        "normal_max": 0,
        "floor_sd": 1,
        "frequency": "weekly",
        "source_types": ["manual"],
    },
    {
        "code": "spo2",
        "name": "Oxygen saturation",
        "unit": "%",
        "domain": "Immune & sensory",
        "description": "Peripheral oxygen saturation. A persistent drop below 92% needs review.",
        "normal_min": 95,
        "normal_max": 100,
        "floor_sd": 1,
        "frequency": "every_3_days",
        "source_types": ["manual", "device"],
    },
]

TRAINING_ITEMS = [
    {
        "code": "resistance-baseline",
        "name": "Resistance baseline",
        "description": "Full-body resistance session covering the major loading patterns.",
        "domain": "Musculoskeletal",
        "target_per_week": 3,
        "duration_min": 35,
    },
    {
        "code": "aerobic-interval",
        "name": "Aerobic intervals",
        "description": "Short intervals to maintain aerobic capacity and cardiovascular tone.",
        "domain": "Cardiovascular",
        "target_per_week": 2,
        "duration_min": 25,
    },
    {
        "code": "bone-load",
        "name": "Bone-load session",
        "description": "Impact and heavy-load work that signals bone to retain density.",
        "domain": "Musculoskeletal",
        "target_per_week": 2,
        "duration_min": 20,
    },
    {
        "code": "mobility",
        "name": "Mobility and posture",
        "description": "Joint range and postural work for the spine and hips.",
        "domain": "Musculoskeletal",
        "target_per_week": 3,
        "duration_min": 10,
    },
    {
        "code": "sleep-hygiene",
        "name": "Sleep wind-down",
        "description": "A short light and routine protocol to protect the sleep window.",
        "domain": "Sleep & circadian",
        "target_per_week": 7,
        "duration_min": 10,
    },
    {
        "code": "hydration-check",
        "name": "Hydration check",
        "description": "Two-minute fluid review against the daily target.",
        "domain": "Metabolic & nutrition",
        "target_per_week": 7,
        "duration_min": 2,
    },
    {
        "code": "recovery-check",
        "name": "Recovery and monitoring",
        "description": "Rest, hydration, and symptom check while awaiting the flight surgeon.",
        "domain": "Immune & sensory",
        "target_per_week": 7,
        "duration_min": 5,
    },
    {
        "code": "nutrition-check",
        "name": "Nutrition check",
        "description": "Review energy, protein, and micronutrient intake against the daily target.",
        "domain": "Metabolic & nutrition",
        "target_per_week": 7,
        "duration_min": 5,
    },
]

ACHIEVEMENTS = [
    {
        "code": "first-check",
        "name": "First check",
        "description": "Completed the first Systems Check.",
        "icon": "clipboard",
        "criteria": {"checkins": 1},
    },
    {
        "code": "streak-7",
        "name": "Seven-day streak",
        "description": "Completed a check-in on seven consecutive days.",
        "icon": "flame",
        "criteria": {"checkin_streak": 7},
    },
    {
        "code": "sleep-steward",
        "name": "Sleep steward",
        "description": "Protected the sleep window for a full week.",
        "icon": "moon",
        "criteria": {"sleep_nights": 7},
    },
    {
        "code": "quiz-ace",
        "name": "Quiz ace",
        "description": "Scored 90% or better on a health literacy quiz.",
        "icon": "trophy",
        "criteria": {"quiz_score": 90},
    },
    {
        "code": "systems-restored",
        "name": "Systems restored",
        "description": "A caution alert returned to nominal after a countermeasure.",
        "icon": "activity",
        "criteria": {"recovered_alerts": 1},
    },
]

QUIZZES = [
    {
        "slug": "know-yourself",
        "title": "Know yourself: sleep, recovery, and red flags",
        "mode": "self",
        "questions": [
            {
                "id": "q1",
                "prompt": "Which sleep duration is the usual target for adults on a long mission?",
                "options": ["4–5 hours", "5–6 hours", "7–9 hours", "10–11 hours"],
                "answer_index": 2,
                "explanation": "Most adults need 7–9 hours. Chronic short sleep raises cardiovascular and neurobehavioral strain.",
            },
            {
                "id": "q2",
                "prompt": "What does a falling HRV usually indicate?",
                "options": [
                    "Better recovery",
                    "Rising autonomic strain",
                    "Higher bone density",
                    "Improved hydration",
                ],
                "answer_index": 1,
                "explanation": "A falling HRV often reflects autonomic strain from sleep loss, illness, or workload.",
            },
            {
                "id": "q3",
                "prompt": "Which daily fluid intake is a reasonable baseline in microgravity?",
                "options": ["0.5–1.0 L", "1.0–1.5 L", "2.0–3.0 L", "4.0–5.0 L"],
                "answer_index": 2,
                "explanation": "A 2.0–3.0 L daily target is a practical baseline; fluid shifts make intake easy to under-read.",
            },
            {
                "id": "q4",
                "prompt": "Which finding is a red flag that needs the flight surgeon?",
                "options": [
                    "Mild fatigue after exercise",
                    "Chest pain with shortness of breath",
                    "Slightly low mood",
                    "Muscle soreness",
                ],
                "answer_index": 1,
                "explanation": "Chest pain with dyspnea is a hard-rule escalation. Stop activity and contact the flight surgeon.",
            },
            {
                "id": "q5",
                "prompt": "What is the minimum effective dose for bone loading?",
                "options": [
                    "No exercise",
                    "Only stretching",
                    "Regular resistance exercise",
                    "Passive rest",
                ],
                "answer_index": 2,
                "explanation": "Mechanical loading is the signal bone needs. Resistance exercise is prescribed, not optional.",
            },
        ],
    },
    {
        "slug": "know-your-crew",
        "title": "Know your crew: noticing change without diagnosing",
        "mode": "crew",
        "questions": [
            {
                "id": "q1",
                "prompt": "Your crewmate has been quieter than usual for several days. What is the best first step?",
                "options": [
                    "Ignore it",
                    "Ask privately how they are doing",
                    "Tell the whole crew",
                    "Log it as a joke",
                ],
                "answer_index": 1,
                "explanation": "A private, non-judgmental check-in is the lowest-risk first step.",
            },
            {
                "id": "q2",
                "prompt": "A crewmate reports sleeping badly for three nights. What helps most?",
                "options": [
                    "More caffeine",
                    "Protect their sleep window and reduce load",
                    "Skip the next check-in",
                    "Tell them to push through",
                ],
                "answer_index": 1,
                "explanation": "Protecting the sleep window and reducing load is more effective than stimulants.",
            },
            {
                "id": "q3",
                "prompt": "Which change is worth a gentle check-in?",
                "options": [
                    "They finished a puzzle",
                    "They skipped meals two days in a row",
                    "They watched a movie",
                    "They chose a different coffee",
                ],
                "answer_index": 1,
                "explanation": "Skipped meals can signal stress, illness, or low mood. Ask, do not accuse.",
            },
            {
                "id": "q4",
                "prompt": "How should you share a concern about a crewmate?",
                "options": [
                    "On a public leaderboard",
                    "With consent and in private",
                    "In the group chat",
                    "Never",
                ],
                "answer_index": 1,
                "explanation": "Consent and privacy protect trust. Escalate only when safety requires it.",
            },
            {
                "id": "q5",
                "prompt": "What does a good crew check-in sound like?",
                "options": [
                    "You seem off, fix it",
                    "I noticed you have been quiet. How are you doing?",
                    "Why are you always tired?",
                    "You should try harder",
                ],
                "answer_index": 1,
                "explanation": "Describe what you noticed, then ask. Do not diagnose or prescribe.",
            },
        ],
    },
    {
        "slug": "phq9-depression",
        "title": "PHQ-9 · Depression screen",
        "mode": "self",
        "questions": [
            {
                "id": "q1",
                "prompt": "Little interest or pleasure in doing things.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q2",
                "prompt": "Feeling down, depressed, or hopeless.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q3",
                "prompt": "Trouble falling or staying asleep, or sleeping too much.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q4",
                "prompt": "Feeling tired or having little energy.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q5",
                "prompt": "Poor appetite or overeating.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q6",
                "prompt": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q7",
                "prompt": "Trouble concentrating on things, such as reading or watching a video.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q8",
                "prompt": "Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q9",
                "prompt": "Thoughts that you would be better off dead or of hurting yourself in some way.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
        ],
    },
    {
        "slug": "gad7-anxiety",
        "title": "GAD-7 · Anxiety screen",
        "mode": "self",
        "questions": [
            {
                "id": "q1",
                "prompt": "Feeling nervous, anxious, or on edge.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q2",
                "prompt": "Not being able to stop or control worrying.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q3",
                "prompt": "Worrying too much about different things.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q4",
                "prompt": "Trouble relaxing.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q5",
                "prompt": "Being so restless that it is hard to sit still.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q6",
                "prompt": "Becoming easily annoyed or irritable.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
            {
                "id": "q7",
                "prompt": "Feeling afraid, as if something awful might happen.",
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
            },
        ],
    },
]

KNOWLEDGE_ARTICLES = [
    {
        "slug": "hrv-basics",
        "title": "Why HRV falls before you feel tired",
        "domain": "Cardiovascular",
        "summary": "Heart-rate variability is an early indicator of autonomic strain. In spaceflight it is also confounded by fluid shifts, sleep disruption, and workload.",
        "body_md": """## What HRV measures

Heart-rate variability (HRV) is the variation in time between heartbeats. A healthy, well-recovered system tends to show more variation; a strained system tends to show less.

## Why it matters in spaceflight

Microgravity shifts fluid toward the head, changes blood volume, and alters autonomic tone. Add sleep disruption, confined living, and high workload, and HRV can move before you feel anything.

## How to read it

- Compare against **your own 21-day baseline**, not a population average.
- A single low reading is not a diagnosis. Look for a **trend over three or more days**.
- Pair it with sleep, hydration, and symptoms. HRV alone is ambiguous.

## What to do

If HRV is below baseline for several days, protect sleep, review hydration, reduce non-essential load, and repeat the measurement. If it is accompanied by chest pain, dyspnea, fever, or fainting, escalate to the flight surgeon.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://www.nasa.gov/hrp/",
        "citation": "NASA Human Research Program — Human Health Risks. Accessed 2026-11-14.",
    },
    {
        "slug": "sleep-circadian",
        "title": "Sleep loss in a 24-hour light cycle",
        "domain": "Sleep & circadian",
        "summary": "Without Earth's light cues, circadian rhythm drifts. The countermeasure is scheduled light exposure, not willpower.",
        "body_md": """## The hazard

A spacecraft has no sunrise. Without deliberate light cues, the circadian clock drifts, sleep becomes fragmented, and recovery suffers.

## What the evidence supports

- A consistent sleep and wake window.
- Bright light at the start of the day and dim light before sleep.
- Cooler, darker sleep quarters.
- Caffeine cut-off well before the sleep window.

## What to watch

Sleep duration under 6 hours for several nights, sleep efficiency below 85%, and rising sleep latency are early warning signs. They often precede HRV changes and mood decline.

## What to do

Protect the sleep window, log the change, and repeat the measurement. Persistent insomnia or daytime impairment deserves a conversation with the flight surgeon.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://humanresearchroadmap.nasa.gov/risks/",
        "citation": "NASA Human Research Roadmap — Sleep and circadian risk. Accessed 2026-11-14.",
    },
    {
        "slug": "bone-loading",
        "title": "Bone loss and the loading budget",
        "domain": "Musculoskeletal",
        "summary": "Mechanical loading is the signal bone needs. Resistance exercise is prescribed as a minimum effective dose, not a wellness suggestion.",
        "body_md": """## Why bone changes in space

Without gravity, bone loses the mechanical signal that maintains density. The effect is largest in the hips and spine.

## The loading budget

- Resistance work that loads the major patterns: squat, hinge, push, pull, carry.
- Impact or high-load work where the vehicle allows it.
- Consistency matters more than a single heroic session.

## Reading the trend

Strength below 80% of the pre-mission baseline, rapid body-mass loss, or a falling bone-load budget are reasons to review the plan. Pair the training log with the load measurements.

## What to do

Follow the prescribed plan, log sessions, and escalate new bone pain or a sudden loss of strength.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://humanresearchroadmap.nasa.gov/risks/",
        "citation": "NASA Human Research Roadmap — Musculoskeletal risk. Accessed 2026-11-14.",
    },
    {
        "slug": "fluid-shifts",
        "title": "Fluid shifts in microgravity",
        "domain": "Cardiovascular",
        "summary": "Headward fluid shift changes blood pressure, orthostatic tolerance, and how hydration should be read.",
        "body_md": """## What changes

In microgravity, fluid moves toward the head and chest. Blood volume falls, the heart changes shape, and orthostatic tolerance can drop after return to gravity.

## What to monitor

- Systolic and diastolic pressure.
- Orthostatic heart-rate rise.
- Hydration and salt intake.
- Dizziness or visual changes on standing.

## What to do

Keep a steady fluid target, avoid sudden salt loads, and repeat orthostatic checks under the same conditions. A rise above 30 bpm with symptoms is a caution finding; syncope or near-syncope is an escalation.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://www.nasa.gov/hrp/",
        "citation": "NASA Human Research Program — Cardiovascular and fluid shifts. Accessed 2026-11-14.",
    },
    {
        "slug": "space-radiation",
        "title": "Space radiation and the body",
        "domain": "Immune & sensory",
        "summary": "Galactic cosmic rays and solar particle events raise long-term cancer and tissue risk. Monitoring is about context, not a single number.",
        "body_md": """## The hazard

Space radiation includes galactic cosmic rays and solar particle events. Dose depends on shielding, orbit, and solar activity.

## Why the app shows space weather

A solar particle event can change the operational risk for a period. The app surfaces the event so the crew can connect a bad week to the environment, not only to personal behavior.

## What to watch

There is no wearable that measures cumulative radiation dose in this prototype. Use the event context, follow the mission's shielding and shelter plan, and report unusual symptoms.

## What to do

During a solar particle event, follow the shelter procedure. Do not interpret a single symptom as radiation injury; escalate persistent or severe symptoms.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://humanresearchroadmap.nasa.gov/risks/",
        "citation": "NASA Human Research Roadmap — Space radiation risk. Accessed 2026-11-14.",
    },
    {
        "slug": "isolation-confinement",
        "title": "Isolation, confinement, and mood",
        "domain": "Neurobehavioral",
        "summary": "Behavioral health changes can be gradual. Sleep, social contact, and routine are the early signals.",
        "body_md": """## The hazard

Isolation and confinement reduce privacy, variety, and social choice. On long missions, distance from Earth also delays support.

## Early signals

- Mood below baseline for several days.
- Withdrawal from crew contact.
- Irritability, low motivation, or sleep disruption.
- Skipped meals or reduced self-care.

## What helps

- Scheduled contact with family and crew.
- A predictable daily routine.
- Sleep protection.
- Private, non-judgmental check-ins.

## When to escalate

Persistent low mood, hopelessness, or any thought of self-harm is an immediate escalation to the flight surgeon. The app should make that path obvious and fast.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://humanresearchroadmap.nasa.gov/risks/",
        "citation": "NASA Human Research Roadmap — Behavioral health and performance. Accessed 2026-11-14.",
    },
    {
        "slug": "hydration-nutrition",
        "title": "Hydration and nutrition on long missions",
        "domain": "Metabolic & nutrition",
        "summary": "Fluid and energy balance are easy to misread in microgravity. Trend data beats a single measurement.",
        "body_md": """## Why intake is hard to judge

Fluid shifts change thirst and urine output. Food is shelf-stable and portioned, so intake is easy to under- or over-estimate. Body mass changes slowly.

## What to track

- Daily fluid intake against a personal target.
- Caloric intake and body mass trend.
- Blood glucose when indicated.
- Vitamin D status.

## What to do

Use the daily target, not thirst alone. A sustained drop in intake or a rapid mass change is worth a review. Glucose below 70 or above 250 mg/dL is an immediate escalation.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://www.nasa.gov/hrp/",
        "citation": "NASA Human Research Program — Nutrition and fluid balance. Accessed 2026-11-14.",
    },
    {
        "slug": "immune-changes",
        "title": "Immune changes in spaceflight",
        "domain": "Immune & sensory",
        "summary": "Immune dysregulation can make common infections more likely. Temperature and symptom load are the first signals.",
        "body_md": """## What changes

Spaceflight is associated with immune dysregulation, latent virus reactivation, and altered inflammatory responses. The clinical picture can be subtle.

## What to monitor

- Core temperature.
- Symptom load: fever, fatigue, sore throat, rash, GI symptoms.
- Heart rate at rest.
- Sleep and hydration, which modify the response.

## Red flags

Temperature at or above 38 °C with a resting heart rate above 100 bpm is a hard-rule escalation. So is a rapidly rising symptom load or a new rash with fever.

## What to do

Isolate if indicated, follow the mission's infection countermeasure, and contact the flight surgeon. Do not wait for the next scheduled check-in.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://humanresearchroadmap.nasa.gov/risks/",
        "citation": "NASA Human Research Roadmap — Immune system risk. Accessed 2026-11-14.",
    },
    {
        "slug": "red-flags",
        "title": "When to contact the flight surgeon",
        "domain": "General",
        "summary": "Some findings should never wait for a trend. This is the short list.",
        "body_md": """## Escalate now

- Chest pain, pressure, or tightness.
- Shortness of breath at rest or with minimal activity.
- Fainting or near-fainting.
- Sudden vision loss or a new visual field defect.
- Core temperature at or above 38 °C with a resting heart rate above 100 bpm.
- Blood glucose below 70 or above 250 mg/dL.
- Any thought of self-harm.

## Escalate soon

- A new rash with fever.
- Persistent vomiting or inability to keep fluids down.
- A fall or head injury, even if you feel fine.
- Symptoms that are worsening despite a countermeasure.

## How to escalate

Use the app's escalation action, then contact the flight surgeon on the next comms window. If the condition is immediately life-threatening, follow the mission's emergency medical procedure first.""",
        "source_name": "NASA Human Research Program",
        "source_url": "https://www.nasa.gov/hrp/",
        "citation": "NASA Human Research Program — Medical operations and crew health. Accessed 2026-11-14.",
    },
]
