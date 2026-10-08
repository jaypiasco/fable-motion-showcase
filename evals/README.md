# Model Evaluation Suite & Quality Regression Gates (`evals/`)

This directory contains the automated evaluation framework and golden dataset used to benchmark FableMotion's multimodal generative pipelines prior to deployment.

## 🎯 Purpose & Methodology

Generative media pipelines are susceptible to **semantic drift**, **schema malformations**, and **runaway token spend**. FableMotion integrates an automated evaluation gate into CI/CD to enforce deterministic quality benchmarks before code merges into `main`.

The evaluation framework scores outputs across 5 core dimensions:
1. **Schema & Structural Completeness (20%)**: Validates strict JSON schema adhering to `pipeline_state_schema.json`, verifying required scene boundaries, timestamps, and camera cues.
2. **Cross-Scene Character Token Persistence (25%)**: Verifies that character visual tokens (wardrobe textures, face sculpt features, proportions) persist across sequential cut prompts without visual drift.
3. **Pacing & 3-Second Viral Hook Verification (10%)**: Enforces Scene 1 hook presence and tight dialogue word limits (5 to 8 words per cut, maximum 9 words) for vertical video retention.
4. **Safety & Grounded Guardrails (15%)**: Asserts absence of prohibited supernatural glowing eye flares, energy auras, and banned deity/god tropes in dialogue.
5. **Multi-Platform CTA & Social Distribution (15%)**: Validates Phase 5 SEO packages for YouTube Shorts, TikTok, and Instagram Reels, checking call-to-action inclusion and hashtag limits.

## 📊 Evaluation Rubric Weights

| Evaluation Dimension | Metric Target | Weight | Pass Threshold |
| :--- | :--- | :--- | :--- |
| **Schema Completeness** | 100% valid required keys | 0.20 | ≥ 0.90 |
| **Character Consistency** | Name presence + visual token hits | 0.25 | ≥ 0.85 |
| **Dialogue Pacing** | 5–8 words/cut, concise hooks | 0.10 | ≥ 0.80 |
| **Guardrails & Safety** | Zero banned tropes/glows | 0.15 | 1.00 |
| **Camera Cues & Framing** | Cinematic vertical camera directions | 0.15 | ≥ 0.80 |
| **Scene Count Boundaries** | Optimal 10–14 scene arc | 0.15 | 1.00 |

**Minimum Composite Quality Gate:** `≥ 0.85` (Failing scores block GitHub Actions deployment).

## 🗂️ Golden Dataset Structure (`test_cases.json`)

The golden dataset covers production archetypes:
* `tc_produce_soap_opera_retention`: Viral 3D Produce Melodrama (Arthur & Elena prenuptial betrayal).
* `tc_fitness_underdog_revenge`: Underdog transformation (Garret garlic athlete, testing strict dialogue conciseness).
* `tc_moral_parable_luxury_exile`: Multi-act environment arc (Penelope peach mother sanctuary arc).
* `tc_social_distribution_and_cta`: Social distribution metadata & platform-tailored CTA validation.
* `tc_sci_fi_coherence`: Autonomous character continuity in high-tech setting.

## 🚀 Running Evaluations Locally

```bash
# Run CI mock regression gate (deterministic)
python evals/run_evals.py --threshold 0.85 --mock

# Run evaluations against a custom dataset
python evals/run_evals.py --test-cases evals/test_cases.json --threshold 0.85
```

## 📈 Observability & Tracing (Langfuse)

All evaluation runs stream real-time traces, composite scores, and latency metrics directly into **Langfuse** under the tag `ci-pipeline` and `automated-testing`, enabling longitudinal tracking of model drift and prompt regressions.
