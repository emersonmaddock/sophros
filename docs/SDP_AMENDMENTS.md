# SDP & Design Document Amendments

LAST UPDATED: 03/09/2026 by Eduard Tanase

This document formally records approved amendments to the Software Development Plan (`SDP.md`) and Design Document (`DesignDocument.md`). Each amendment describes what changed, why, and any impact on requirements or design scores.

---

## Amendment 1: State Management — Redux Replaced by TanStack React Query + React Context

**Affects:** DesignDocument.md — Technology Stack table

**Original:** Redux listed as the frontend state management library.

**Amendment:** Redux is not used. State management is split between:

- **TanStack React Query** for all server state (user profile, meal plans, schedules, nutrient targets). Provides caching, background refetching, and mutation lifecycle management out of the box.
- **React Context** for lightweight local app state (current user object, onboarding flow progress).

**Rationale:** The majority of Sophros's frontend state is server-derived data. React Query eliminates the boilerplate of manually managing loading, error, and cache states that would have required significant Redux middleware (e.g., Redux Thunk or RTK Query). For the remaining local state (auth status, onboarding form), React Context is sufficient without the overhead of a full Redux store. This choice reduces bundle size and developer complexity while providing equivalent functionality.

**Impact:** None on functional requirements. No change to SDP requirements or design criteria.

---

## Amendment 2: Backend Hosting — AWS Lambda Replaced by Standard FastAPI Deployment

**Affects:** DesignDocument.md — Technology Stack table (`AWS Lambda/API Gateway`)

**Original:** Backend hosting listed as AWS Lambda / API Gateway (serverless).

**Amendment:** The backend is deployed as a standard FastAPI application running on Uvicorn. Serverless (Lambda) architecture is not used.

**Rationale:** FastAPI's async architecture with asyncpg provides comparable concurrency to Lambda without the cold-start latency penalty, which conflicts with NFR-1 (sub-2s response times). Lambda's execution model also complicates long-running operations like weekly meal plan generation, which involves multiple sequential external API calls. A persistent server simplifies connection pooling with PostgreSQL and removes the need for a Lambda-specific ASGI adapter (Mangum). Hosting provider is selected at deployment time and is not hardcoded in the application.

**Impact:** NFR-2 (99.5% uptime) now depends on the chosen hosting provider's SLA rather than AWS Lambda's. This does not weaken the requirement — AWS ECS, Railway, Fly.io, or similar providers offer equivalent or better uptime guarantees.

---

## Amendment 3: Activity Level Scale — 4-Level USDA Scale Replaced by 5-Level Scale

**Affects:** SDP.md — FR-1 Supporting Context; `DesignDocument.md` — UP2 design

**Original:** FR-1 states physical activity is "measured on a scale of 1 to 4 (inactive, low active, active, and very active) for DRI calculation purposes."

**Amendment:** The system uses a 5-level activity scale: `SEDENTARY`, `LIGHT`, `MODERATE`, `ACTIVE`, `VERY_ACTIVE`, corresponding to TDEE multipliers of 1.2, 1.375, 1.55, 1.725, and 1.9 respectively.

**Rationale:** The 5-level scale from the Mifflin-St Jeor equation (the industry standard for TDEE estimation) provides a more precise subdivision of the "low active" to "active" range. This is more familiar to fitness applications and avoids ambiguity in the middle activity categories. The DRI nutrient targets produced by this scale are equivalent in accuracy to the 4-level USDA scale; the finer granularity benefits the optimization engine.

**Impact:** FR-1 test method is unaffected (pass/fail is based on data acceptance rate, not the number of levels). The nutrient target outputs remain USDA DRI-compliant.

---

## Amendment 4: Nutrition Algorithm — Genetic Mixed Model Replaced by DRI-Based Linear Allocator

**Affects:** DesignDocument.md — System Element 2 (Nutrition Algorithm), design choice NA3

**Original:** Design document selected NA3 (Genetic Mixed Model): a neural network constrains the recipe search space, a linear regression scores meal plans, and a genetic algorithm iteratively improves candidate sets.

**Amendment:** The nutrition engine uses a deterministic DRI-based linear allocation approach:

1. **NutrientCalculator**: Computes daily calorie and macro targets using Mifflin-St Jeor BMR + TDEE multiplier + goal-based calorie offset.
2. **MealAllocator**: Distributes daily targets across breakfast (30%), lunch (35%), and dinner (35%) slots.
3. **SpoonacularClient**: Fetches recipes matching the per-slot macro targets using Spoonacular's built-in filtering.

**Rationale:** The genetic mixed model requires a labeled training dataset of meal plan quality scores, a trained neural network, and significant compute time per generation cycle — none of which are feasible within the project's budget and timeline constraints. The linear DRI allocator produces nutritionally valid meal plans that satisfy FR-7's requirement of ≥95% adherence to nutritional goals without training data or iterative computation. Spoonacular's server-side filtering performs the candidate narrowing that the neural network was intended to provide.

**Impact:** FR-7 test criteria (≥95% nutritional adherence across 20 user profiles) remains the acceptance standard. The implementation approach differs; the acceptance test is unchanged.

---

## Amendment 5: USDA FoodData Central API — Direct Integration Replaced by Internal DRI Formulas + Spoonacular

**Affects:** SDP.md — FR-11

**Original:** FR-11 requires the system to "retrieve nutritional data for ingredients and meals using the USDA FoodData Central API."

**Amendment:** USDA FoodData Central is not called directly. Nutritional data is sourced as follows:

- **DRI/BMR calculations**: Implemented internally in `nutrient_calculator.py` using published USDA Dietary Reference Intake formulas (Mifflin-St Jeor, AMDR percentages). No API call is needed as these are fixed mathematical formulas, not data lookups.
- **Recipe and ingredient nutrition**: Retrieved from the **Spoonacular API**, which maintains a nutritional database sourced from USDA and other verified providers.

**Rationale:** The USDA FoodData Central API is a raw ingredient lookup database not optimized for recipe search or meal planning. Spoonacular provides a superset of this functionality: recipe search, ingredient lists, and pre-computed per-recipe macronutrient data from USDA-compliant sources. Using one API instead of two reduces integration complexity, API key management overhead, and the need to aggregate per-ingredient data into per-meal totals.

**Impact:** FR-11's test method (100 queries, ≥95% return valid macro data) is satisfied through Spoonacular. The nutritional accuracy standard is maintained.

---

## Amendment 6: Recipe API — Spoonacular Selected as Recipe Provider

**Affects:** SDP.md — FR-6

**Original:** FR-6 generically refers to "a recipe database API."

**Amendment:** The selected recipe API is **Spoonacular** (`spoonacular.com/food-api`). The integration uses the `/recipes/complexSearch` endpoint with filtering by calorie range, macronutrient targets, diet type, allergen intolerances, and cuisine preferences.

**Rationale:** Spoonacular provides structured nutritional data per recipe (macros included), supports complex multi-parameter filtering in a single API call, and returns ingredient lists and cooking instructions. This satisfies both FR-6 (recipe retrieval) and the nutritional accuracy requirements of FR-7.

**Impact:** FR-6's test method (100 queries, ≥95% return valid matching recipes) applies to the Spoonacular integration. Budget note: Spoonacular's free tier is rate-limited; a paid plan is required for production usage.

---

## Summary Table

| #   | Area                | Original                      | Amended                                      | SDP Impact                |
| --- | ------------------- | ----------------------------- | -------------------------------------------- | ------------------------- |
| 1   | Frontend state      | Redux                         | TanStack React Query + React Context         | None                      |
| 2   | Backend hosting     | AWS Lambda / API Gateway      | Standard FastAPI / Uvicorn                   | NFR-2 provider-dependent  |
| 3   | Activity levels     | 4-level USDA scale            | 5-level Mifflin-St Jeor scale                | FR-1 unchanged            |
| 4   | Nutrition algorithm | NA3 Genetic Mixed Model       | DRI linear allocator + Spoonacular filtering | FR-7 criterion unchanged  |
| 5   | USDA API            | Direct FoodData Central calls | Internal formulas + Spoonacular              | FR-11 criterion unchanged |
| 6   | Recipe API          | Generic "recipe database API" | Spoonacular                                  | FR-6 criterion unchanged  |
