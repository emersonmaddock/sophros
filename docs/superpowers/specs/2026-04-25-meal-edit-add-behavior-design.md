# Meal Edit & Add-Meal Behavior — Design

**Date:** 2026-04-25
**Branch:** `feat/214-edit-schedule-on-refactor-db`
**Status:** Approved (pending implementation plan)

## 1. Goal

Today, `EditItemModal` is a single multi-mode sheet that pretends to let users edit Spoonacular meals (silently drops the edit) and pretends to let them add new meals (creates an orphaned `ScheduleItem` with `meal_id=null`). This PR splits the meal editing surface along real capability lines:

- **Premade (Spoonacular) meals** are read-only except for the scheduled time.
- **Adding a new meal** captures a real custom meal: title, time, duration, calories, protein, carbs, fat. The server atomically creates a `Meal` row (`is_custom=true`, `user_id=current_user.id`, `recipe_id=null`) and a `ScheduleItem` linked to it.
- **Editing an already-saved custom meal is deferred.** Custom meals, once created, behave like premade meals at the detail-modal level — Reschedule + Remove only.

**Side effect that resolves a related bug.** Today, tapping a custom (orphaned) meal opens `EditItemModal` directly with no Remove button. After this PR, every meal item has a real `meal_id`, so every meal taps through `MealDetailModal` (which already has Remove). The "can't remove from edit screen" issue is fixed structurally, not by adding a Remove button to `EditItemModal`.

## 2. Non-goals

- Editing custom meals after creation (full-edit flow) — future work.
- A recipe picker for ad-hoc scheduling of existing Spoonacular recipes.
- Custom meals carrying image URL, source URL, ingredients, or tags.
- Custom meals appearing as swap alternatives in week-planning.
- Orphan cleanup for legacy `meal_id=null` schedule items (no real users have touched this flow).
- User-deletion cascade for custom meals (no user-deletion endpoint exists).

## 3. Frontend changes

**No new components.** `EditItemModal` keeps its role and gains a clear per-mode field list. The "visible but disabled" third state goes away.

### Field matrix

| Mode | Item type | Visible fields |
|------|-----------|----------------|
| Add | meal | title, time, duration, calories, protein, carbs, fat |
| Add | workout | (unchanged from today) |
| Edit | meal (premade or custom) | **time only** |
| Edit | workout | (unchanged from today) |
| Edit | sleep | (unchanged from today) |

### Routing in `frontend/app/(tabs)/schedule.tsx`

- `handleAddItem('meal')`: opens `EditItemModal` in `mode=add`, `itemType=meal`, with all meal fields editable. Save calls `POST /api/v1/schedules` with the `custom_meal` payload (Section 5). Server creates `Meal` + `ScheduleItem` atomically.
- `handleAddItem('workout')`: unchanged.
- Tapping a meal item: unchanged routing — through `MealDetailModal` first, preserving the read-only ingredients/source/macros view.
- `handleMealModify` (from `MealDetailModal` → "Reschedule"): opens `EditItemModal` in `mode=edit`, `itemType=meal`. The modal shows only the time picker. Save calls `PUT /api/v1/schedules/{id}` with `{ date }`.
- Tapping a workout/sleep item: unchanged.

### `MealDetailModal`

- Rename "Modify" → "Reschedule". Same label for premade and custom meals (no source-branching at the UI layer).
- "Remove" button unchanged.

### `EditItemModal` internals

- Delete: the read-only meal macro strip, the `mealCalories`/`mealProtein`/`mealCarbs`/`mealFat` props piped from `schedule.tsx`, the "Set by the recipe — cannot be edited here" note.
- In `mode=edit, itemType=meal`: render only the time picker. No title input, no duration, no nutrition.
- In `mode=add, itemType=meal`: render the full meal field set, all editable. Required-field validation in-sheet (non-empty title, numeric nutrition ≥ 0, duration > 0).
- The `handleEditSave` meal branches in `schedule.tsx` are reduced accordingly: edit path sends only `{ date }`; add path sends `{ date, activity_type: 'meal', duration_minutes, custom_meal: {...} }`.

## 4. Data model

One Alembic migration; three column additions on `meal`, one nullability relaxation, one CHECK constraint.

### `meal` table

| Column | Change | Notes |
|--------|--------|-------|
| `recipe_id` | `NOT NULL` → `NULLABLE` | Custom rows have `recipe_id=NULL`. |
| `is_custom` | New: `BOOLEAN NOT NULL DEFAULT FALSE` | Backfills existing rows as non-custom. |
| `user_id` | New: nullable FK to `users.id` | Null for Spoonacular, populated for custom. No `ON DELETE` cascade (user deletion out of scope). |
| CHECK constraint | New: `(is_custom = FALSE OR user_id IS NOT NULL)` | A custom meal without an owner is nonsensical. |

### `schedule_item` table

No changes. `meal_id` remains a nullable FK because workouts/sleep items legitimately have `meal_id=NULL`. The structural guarantee against orphan meal items lives in the API validator (Section 5), not the DB.

### `Meal` SQLAlchemy model (`backend/app/models/meal.py`)

- `recipe_id: Mapped[str | None]`
- `is_custom: Mapped[bool] = mapped_column(default=False, server_default='false')`
- `user_id: Mapped[str | None]` with FK to `users.id`
- Relationship: `user: Mapped['User | None']` (lazy, used by future edit-auth guard).

### `MealRead` Pydantic schema (`backend/app/schemas/meal.py`)

- Add `is_custom: bool` to the response.
- Do **not** expose `user_id` in responses (no current user-visible use; avoids accidental leakage of ownership via future shared surfaces).

### Frontend generated types

After the backend changes, run `scripts/generate-client.sh`. `MealRead` in `frontend/api/types.gen.ts` gains `is_custom`. No frontend code reads it yet (custom-meal-specific UI is deferred).

## 5. API changes

One endpoint changes (request schema + handler logic). No new endpoints.

### `POST /api/v1/schedules` — request schema

`ScheduleItemCreate` (`backend/app/schemas/schedule.py`) gains an optional `custom_meal` field, plus a model-level validator that makes orphan meal items structurally impossible:

```python
class CustomMealInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    calories: int = Field(ge=0)
    protein: int = Field(ge=0)
    carbohydrates: int = Field(ge=0)
    fat: int = Field(ge=0)

class ScheduleItemCreate(ScheduleItemBase):
    meal_id: int | None = None
    custom_meal: CustomMealInput | None = None

    @model_validator(mode='after')
    def _validate_meal_payload(self) -> 'ScheduleItemCreate':
        is_meal = self.activity_type == ActivityType.MEAL
        provided = sum(x is not None for x in (self.meal_id, self.custom_meal))
        if is_meal and provided != 1:
            raise ValueError(
                'meal items require exactly one of meal_id or custom_meal'
            )
        if not is_meal and provided != 0:
            raise ValueError(
                'meal_id and custom_meal are only valid for meal items'
            )
        return self
```

### `POST /api/v1/schedules` — handler logic

```python
async def create_schedule_item(item_in, current_user, db):
    meal_id = item_in.meal_id
    if item_in.custom_meal is not None:
        meal = Meal(
            recipe_id=None,
            title=item_in.custom_meal.title,
            calories=item_in.custom_meal.calories,
            protein=item_in.custom_meal.protein,
            carbohydrates=item_in.custom_meal.carbohydrates,
            fat=item_in.custom_meal.fat,
            prep_time_minutes=item_in.duration_minutes,
            ingredients=[],
            tags=[],
            is_custom=True,
            user_id=current_user.id,
        )
        db.add(meal)
        await db.flush()  # populate meal.id without committing
        meal_id = meal.id

    item = ScheduleItem(
        date=item_in.date,
        activity_type=item_in.activity_type,
        duration_minutes=item_in.duration_minutes,
        is_completed=item_in.is_completed,
        exercise_category=item_in.exercise_category,
        meal_id=meal_id,
        user_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item, attribute_names=['meal'])
    return item
```

Both rows are written in one transaction; failure leaves no orphans.

`prep_time_minutes` is mirrored from the scheduled `duration_minutes` on purpose: for Spoonacular meals it represents recipe prep time, for custom meals there's no separate prep concept — collapsing them keeps the existing `MealRead` consumers (macro/time displays) source-agnostic and avoids a "custom meal has null prep_time" branch in the UI.

### `DELETE /api/v1/schedules/{item_id}` — cascade for custom meals

```python
async def delete_schedule_item(item_id, current_user, db):
    item = await db.get(ScheduleItem, item_id)
    # ...existing ownership check...
    custom_meal_to_delete = None
    if item.meal_id is not None:
        await db.refresh(item, attribute_names=['meal'])
        if item.meal and item.meal.is_custom:
            custom_meal_to_delete = item.meal
    await db.delete(item)
    if custom_meal_to_delete is not None:
        await db.delete(custom_meal_to_delete)
    await db.commit()
```

Both `db.delete()` calls only mark objects for deletion; SQLAlchemy's unit of work will emit the SQL on `commit` in FK-correct order (`schedule_item` before `meal`) because of the `meal_id` foreign-key dependency. Capturing `item.meal` into `custom_meal_to_delete` *before* the item delete is required so the relationship resolves before the schedule item is detached. Single transaction; no orphans on failure.

### `PUT /api/v1/schedules/{item_id}` — unchanged

Reschedule writes only `date` (and any other fields the client chooses to send). Endpoint and schema unchanged.

### Generated client

After backend changes, run `scripts/generate-client.sh`. `ScheduleItemCreate` in `frontend/api/types.gen.ts` gains the optional `custom_meal` field. The frontend's `useCreateScheduleItemMutation` does not need a code change — it already passes `body` through.

### What this leaves out (intentionally)

No `POST /api/v1/meals/custom`, no `PUT /api/v1/meals/{id}`. Custom-meal editing arrives with its own endpoint when the deferred work lands.

## 6. Testing

### Backend (`backend/tests/`)

- `test_schedules.py::test_create_schedule_item_with_custom_meal` — POST with `custom_meal`, no `meal_id`. Assert response includes `meal` with `is_custom=true`, `recipe_id=null`, matching nutrition. Assert `Meal` + `ScheduleItem` rows exist.
- `test_schedules.py::test_create_schedule_item_with_meal_id` — existing happy path; assert no new `Meal` row created.
- `test_schedules.py::test_create_meal_item_rejects_both_meal_id_and_custom_meal` — 422.
- `test_schedules.py::test_create_meal_item_rejects_neither_meal_id_nor_custom_meal` — 422; closes the orphan-creation hole.
- `test_schedules.py::test_create_workout_rejects_custom_meal` — 422.
- `test_schedules.py::test_create_workout_rejects_meal_id` — 422.
- `test_schedules.py::test_delete_schedule_item_cascades_custom_meal` — assert `Meal` row also gone.
- `test_schedules.py::test_delete_schedule_item_preserves_spoonacular_meal` — assert `Meal` row still present.
- `test_schedules.py::test_create_custom_meal_atomic_on_failure` — simulate failure after `Meal` insert; assert no `Meal` row persists.

### Frontend

- `EditItemModal.test.tsx`:
  - Add-meal mode renders title + time + duration + 4 nutrition inputs, all editable. No "Set by the recipe" note. No disabled fields.
  - Edit-meal mode renders only the time picker. No title, no nutrition, no duration.
  - Add-meal validation: empty title, negative nutrition, duration ≤ 0 all blocked.
  - Add-meal save calls `createScheduleItem` with `custom_meal` populated and `meal_id` absent.
  - Edit-meal save calls `updateScheduleItem` with only `date`.
- `MealDetailModal.test.tsx`:
  - "Reschedule" button label (renamed from "Modify").
  - "Reschedule" tap fires the modify callback.
  - "Remove" tap fires the delete callback (regression check).
- `schedule.test.tsx` (or analogous):
  - `handleAddItem('meal')` opens `EditItemModal` in `mode=add, itemType=meal`.
  - `handleMealModify` opens `EditItemModal` in `mode=edit, itemType=meal`.
  - Workout/sleep tap behavior unchanged (regression check).

### Manual verification (per `CLAUDE.local.md`)

- Run `pnpm check` and fix everything before pushing frontend code.
- Run backend lints/checks before pushing backend code.
- Smoke-test on the iOS dev client (`com.sophros.app`):
  1. Add a custom meal — confirm it appears in the schedule with the right title and macros.
  2. Tap the new meal → `MealDetailModal` shows correct values → "Reschedule" → time-only sheet → save → time updates.
  3. Tap an existing Spoonacular meal → "Reschedule" → time-only sheet → save → time updates.
  4. From `MealDetailModal`, "Remove" the custom meal → confirm meal disappears and the `Meal` row is gone.
  5. From `MealDetailModal`, "Remove" a Spoonacular meal → confirm `Meal` row still present.
  6. Tap a workout → `EditItemModal` opens with full editability (regression check).

## 7. Migration & rollout

### Migration ordering (single Alembic revision)

1. Add `meal.is_custom` (`NOT NULL DEFAULT FALSE`) — backfills existing rows as non-custom.
2. Add `meal.user_id` (nullable FK to `users.id`).
3. Alter `meal.recipe_id` to `NULLABLE`.
4. Add CHECK constraint `(is_custom = FALSE OR user_id IS NOT NULL)`.

All four steps are additive or relaxations — no destructive changes, no backfill scripts, downgrade is the trivial inverse.

### Rollout

- Backend: migration runs on next `alembic upgrade head`.
- After backend changes are in, regenerate the frontend client via `scripts/generate-client.sh`.
- No feature flag — corrective UX change, not gradual rollout.

### Risks

- **Generated client drift.** If the frontend is built against the old generated types after the backend migration ships, `custom_meal` won't be sendable. Mitigated by always regenerating before pushing frontend code.
- **`recipe_id` nullability.** Today only the Spoonacular ingestion path reads `recipe_id`, and only writes — no reads-as-non-null assumption to break. Worth grepping during implementation.

## 8. Future work (explicitly out of scope here)

- Editing a custom meal after creation: `PUT /api/v1/meals/{id}` with `is_custom=true` + `user_id` ownership guard, plus an `EditItemModal` mode for `edit + meal + custom` that mirrors the Add-Meal field set.
- Manual scheduling of an existing Spoonacular recipe (recipe picker UI in Add-Meal).
- Custom meals carrying image URL, source URL, ingredients, tags.
- Custom meals appearing as swap alternatives in week-planning.
- Cascade behavior for custom meals when their owning user is deleted.
- Cleanup of any `meal_id=null` orphan `ScheduleItem` rows.
