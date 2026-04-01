# How-To Sophros

## End Users

### How to create an account

**Purpose:** Register for Sophros to access personalized meal planning.

**Preconditions:**
- The Sophros app installed on your device (or running locally via Expo Go).

**Steps:**
1. Open the app. You land on the Sign Up screen.
2. Enter your first name, last name, email address, and password.
3. Tap **Sign Up**. A verification code is sent to your email.
4. On the "Verify your email" screen, enter the code and tap **Verify**.

Alternatively, tap **Sign in with Google** to skip email/password registration.

**Expected result:** Your session is activated and you are redirected to the onboarding flow.

---

### How to complete onboarding

**Purpose:** Provide Sophros with the data it needs to generate personalized plans.

**Preconditions:**
- A signed-in Sophros account that has not completed onboarding.

**Steps:**
1. On the welcome screen, review the three benefit cards and tap **Get Started**.
2. **Step 1 (20%):** Enter your age and select your biological sex (Male or Female).
3. **Step 2 (40%):** Enter your weight and height. Use the kg/lbs toggle to switch between metric and imperial units. Imperial height uses separate feet and inches fields.
4. **Step 3 (50%, female only, skipped for males):** Select your pregnancy or breastfeeding status.
5. **Step 4 (80%):** Select one of five activity levels (Sedentary through Very Active).
6. **Step 5 (100%):** Optionally set a target weight. Set your wake-up time and sleep time (defaults: 07:00 and 23:00). Tap **Complete Profile**.

**Expected result:** You are redirected to the Home tab. Your profile is saved and used for all future plan generation.

Dietary preferences, allergies, and cuisine selections are not part of onboarding. Set them afterward via Profile > Allergies & Preferences.

---

### How to generate a weekly meal plan

**Purpose:** Get a full week of personalized breakfast, lunch, and dinner recipes.

**Preconditions:**
- Onboarding completed.

**Steps:**
1. Tap the **Schedule** tab.
2. Navigate to the week you want to plan. If no plan exists for that week, an empty state appears with a **Plan This Week** button.
3. Tap **Plan This Week**. The week-planning screen opens and generates meals for all seven days.
4. Review the generated plan. Use the day selector to browse each day's meals.
5. To swap a meal, tap it and select an alternative from the modal.
6. To regenerate the entire plan, tap the refresh icon at the top.
7. When satisfied, tap **Confirm & Save**.

**Expected result:** The saved plan appears in the Schedule tab, viewable day by day.

---

### How to view and edit your schedule

**Purpose:** See your daily meals and workouts and make changes as needed.

**Preconditions:**
- At least one saved weekly meal plan.

**Steps:**
1. Tap the **Schedule** tab.
2. Use the left/right arrows to navigate between weeks. Use the day cards (Mon-Sun) to select a day.
3. The timeline shows each item with its time, type badge, and duration. A "NOW" badge marks the current time slot. Completed items show a checkmark.
4. To view meal details, tap a meal card to open the meal detail modal showing nutrition and recipe info.
5. To edit an item, tap a meal card then tap **Modify**, or tap a non-meal item directly. The edit modal opens with time, title, and detail fields.
6. To remove an item, tap the item card and confirm removal in the alert dialog.
7. To add an item, scroll to the Add Item section and tap **Meal** or **Workout**.
8. A **Save Changes** button appears at the bottom when you have unsaved edits. Tap it to persist.

**Expected result:** Your updated schedule is saved and reflected across the app.

---

### How to check your health score

**Purpose:** See a composite score (0-100) summarizing your nutrition, exercise, and sleep adherence.

**Preconditions:**
- Onboarding completed and at least one saved meal plan for the current week.

**Steps:**
1. From the Home tab, tap the Health Score card.
2. The score screen shows a circular progress indicator with your overall score and a status label (Excellent, Good, Fair, or Needs Work).
3. Below that, three component breakdowns each show a score, weight, and progress bar:
   - **Nutrition** (40%) -- based on calorie and macro adherence.
   - **Exercise** (30%) -- workout frequency and intensity.
   - **Sleep** (30%) -- duration and quality of sleep.

**Expected result:** A detailed breakdown of your daily health score with per-component progress bars.

---

### How to update your profile and dietary preferences

**Purpose:** Change your body metrics, goals, allergies, or cuisine preferences after onboarding.

**Preconditions:**
- Onboarding completed.

**Steps:**

To edit your profile:
1. Tap the **Profile** tab, then tap **Edit Profile**.
2. Update any of: age, unit preference (Metric/Imperial), weight, height, activity level, target weight, target body fat %, target date, wake-up/sleep times, or busy times.
3. Tap **Save Changes**.

To edit dietary preferences:
1. Tap the **Profile** tab, then tap **Allergies & Preferences**.
2. Toggle allergy chips on/off (e.g. Dairy, Egg, Gluten, Peanut, Shellfish, Soy, Tree Nut).
3. Toggle diet switches (Gluten-Free, Ketogenic, Vegetarian, Vegan, Pescatarian).
4. Select cuisines to include or exclude using the chip selectors.
5. Tap **Save Changes**.

**Expected result:** Future meal plans reflect your updated preferences. Existing saved plans are not changed.

---

## Developers

### How to set up the development environment

**Purpose:** Get the backend and frontend running locally.

**Preconditions:**
- Python 3.11+
- Node.js 24+
- pnpm 10+
- A PostgreSQL database (local or remote, e.g. [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) account (free tier works)
- A [Spoonacular](https://spoonacular.com/food-api) API key

**Steps:**

#### Backend
1. Install `uv`:
   ```bash
   pip install uv
   ```
2. Install dependencies:
   ```bash
   cd backend
   uv sync
   ```
3. Copy the example env file and fill in the required variables (see [How to configure environment variables](#how-to-configure-environment-variables)):
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   uv run alembic upgrade head
   ```
5. Start the dev server:
   ```bash
   uv run fastapi dev app/main.py
   ```
   The API is now at `http://localhost:8000`. Swagger docs are at `/docs`.

#### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   pnpm install
   ```
2. Copy the example env file and set your Clerk publishable key:
   ```bash
   cp .env.example .env
   ```
3. Start the Expo dev server:
   ```bash
   pnpm start
   ```
   Scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS) for an emulator.

**Expected result:** The backend responds at `http://localhost:8000/health` and the frontend loads on your device or emulator.

---

### How to configure environment variables

**Purpose:** Set the required secrets and configuration for backend and frontend.

**Preconditions:**
- `.env.example` files exist in both `backend/` and `frontend/`.

**Steps:**

#### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string with `asyncpg` driver |
| `CLERK_PEM_PUBLIC_KEY` | Yes | Clerk PEM public key, required for JWT authentication |
| `SPOONACULAR_API_KEY` | Yes | From spoonacular.com, required for meal plan generation |
| `PROJECT_NAME` | No | App name (default: `Sophros`) |
| `CLERK_PUBLISHABLE_KEY` | No | Clerk publishable key (used by frontend, not backend) |
| `CLERK_SECRET_KEY` | No | Clerk secret key (not used in current backend code) |
| `CLERK_WEBHOOK_SECRET` | No | For Clerk webhook integration (not implemented) |
| `OPENAI_API_KEY` | No | Defined in config but not used in current code |

#### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key from your Clerk dashboard |
| `EXPO_PUBLIC_API_URL` | No | Backend URL (default: `http://localhost:8000`) |

**Expected result:** The app starts without missing-variable errors.

---

### How to run database migrations

**Purpose:** Apply schema changes to your PostgreSQL database.

**Preconditions:**
- `DATABASE_URL` set in `backend/.env`.
- The target database exists and is reachable.

**Steps:**
1. Apply all pending migrations:
   ```bash
   cd backend
   uv run alembic upgrade head
   ```
2. To create a new migration after modifying SQLAlchemy models:
   ```bash
   uv run alembic revision --autogenerate -m "description of change"
   ```
3. Review the generated file in `backend/alembic/versions/` before applying.

**Expected result:** `alembic upgrade head` completes with no errors. The database schema matches the current models.

---

### How to regenerate the API client

**Purpose:** Update the auto-generated TypeScript client after backend API changes.

**Preconditions:**
- Backend and frontend dependencies installed (`uv sync` and `pnpm install`).

**Steps:**
1. From the project root, run the generate script:
   ```bash
   uv run bash scripts/generate-client.sh
   ```
   This script extracts the OpenAPI schema directly from the FastAPI app (no running server needed), writes it to `frontend/openapi.json`, generates the TypeScript client, then lints and formats the output.
2. The generated files are written to `frontend/api/`.

This also runs automatically in CI on pull requests that change backend code. The workflow commits updated client code back to the PR.

**Expected result:** The `frontend/api/` directory contains updated type definitions and SDK functions matching the current backend API.

---

### How to run the test suite

**Purpose:** Verify backend logic before committing.

**Preconditions:**
- Backend dependencies installed (`uv sync`).
- A test PostgreSQL database reachable (set `DATABASE_URL` for tests, or use the CI default: `postgresql+asyncpg://postgres:postgres@localhost:5432/test_db`).

**Steps:**
1. Run all tests:
   ```bash
   cd backend
   uv run pytest
   ```
2. Run a single test file:
   ```bash
   uv run pytest tests/test_nutrient_calculator.py
   ```
3. Run with verbose output:
   ```bash
   uv run pytest -v
   ```

**Expected result:** All tests pass. CI runs the same suite on every push and pull request.

---

### How to run linters and type checks

**Purpose:** Catch style and type issues before CI does.

**Preconditions:**
- Dependencies installed in both `backend/` and `frontend/`.

**Steps:**

Backend:
```bash
cd backend
uv run ruff check app          # lint
uv run ruff format --check app # format check
uv run mypy app                # type check
```

Frontend:
```bash
cd frontend
pnpm lint           # ESLint
pnpm format:check   # Prettier
pnpm typecheck      # TypeScript
```

Or run all frontend checks at once:
```bash
pnpm check
```

**Expected result:** No errors or warnings. These same checks run in GitHub Actions CI.

---

### How to build the app locally

**Purpose:** Create a native debug build on your machine without cloud services.

**Preconditions:**
- Frontend dependencies installed (`pnpm install`).
- Android: Android SDK and an emulator or connected device.
- iOS: macOS with Xcode installed.

**Steps:**

Neither Android nor iOS native code is checked into the repository (both are gitignored). Generate it with `expo prebuild` before building.

Android:
```bash
cd frontend
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
```
The APK is written to `android/app/build/outputs/apk/debug/`.

iOS:
```bash
cd frontend
npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace sophros.xcworkspace -scheme sophros -configuration Debug -sdk iphonesimulator
```
Or open `sophros.xcworkspace` in Xcode and build from there.

**Expected result:** A debug APK (Android) or simulator app (iOS) ready to install.
