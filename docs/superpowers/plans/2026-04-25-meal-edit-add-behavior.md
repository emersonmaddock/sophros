# Meal Edit & Add-Meal Behavior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Spoonacular meals time-only on edit, make Add-Meal capture a real persisted custom meal (`is_custom=true`, `user_id=current_user.id`, `recipe_id=null`), and structurally prevent orphan `meal_id=null` items via the API validator. Defer post-creation editing of custom meals.

**Architecture:** One Alembic migration adds `is_custom` and nullable `user_id` on `meals` and relaxes `recipe_id` to nullable. `POST /api/v1/schedules` is overloaded with an optional `custom_meal` payload, plus a model validator that requires exactly one of `meal_id` or `custom_meal` for meal items. `DELETE /api/v1/schedules/{id}` cascades to the linked `Meal` row when `is_custom=true`. Frontend collapses everything into the existing `EditItemModal` with a clean per-mode field matrix (no disabled fields), and renames `MealDetailModal`'s "Modify" → "Reschedule".

**Tech Stack:**
- Backend: FastAPI, SQLAlchemy (async), Pydantic v2, Alembic, pytest + pytest-asyncio + httpx, uv
- Frontend: React Native + Expo Router, TypeScript, `@gorhom/bottom-sheet`, TanStack Query, `@hey-api/openapi-ts`, Jest + `@testing-library/react-native`, pnpm

**Source spec:** `docs/superpowers/specs/2026-04-25-meal-edit-add-behavior-design.md`

**File map:**
- Create: `backend/alembic/versions/<new_rev>_add_custom_meal_fields.py`
- Modify: `backend/app/models/meal.py` (add `is_custom`, `user_id`, relax `recipe_id`)
- Modify: `backend/app/schemas/meal.py` (add `is_custom`, relax `recipe_id`)
- Modify: `backend/app/schemas/schedule.py` (add `CustomMealInput`, extend `ScheduleItemCreate`, add validator)
- Modify: `backend/app/api/endpoints/schedules.py` (handler logic for create + delete)
- Modify: `backend/tests/test_schedules.py` (new tests; reuse `_create_meal` helper)
- Run: `scripts/generate-client.sh` (regenerates `frontend/api/types.gen.ts` and `frontend/api/sdk.gen.ts`)
- Modify: `frontend/components/MealDetailModal.tsx` (rename "Modify" → "Reschedule")
- Modify: `frontend/components/EditItemModal.tsx` (remove disabled-field state; per-mode field rendering)
- Modify: `frontend/app/(tabs)/schedule.tsx` (routing in `handleAddItem` and `handleEditSave`; drop macro pipe-through)
- Create: `frontend/__tests__/components/EditItemModal.test.tsx`
- Create: `frontend/__tests__/components/MealDetailModal.test.tsx`

---

## Conventions

**Backend commands** are run from repo root using uv: `uv run --project backend pytest backend/tests/test_schedules.py -v`. Existing tests use `httpx.AsyncClient` with `client`, `db`, `mock_user` fixtures from `backend/tests/conftest.py`.

**Frontend commands** use pnpm from `frontend/`: `cd frontend && pnpm test EditItemModal`. The user's `CLAUDE.local.md` mandates `pnpm check` (which runs lint + format:check + typecheck) before pushing frontend code.

**Commit style** matches recent history (`fix(frontend):`, `feat(frontend):`, `feat(backend):`, etc.). Never add Co-Authored-By lines per `feedback_no_attribution`.

**Current alembic head:** `db1bc88ad384` — the new migration's `down_revision` must be `db1bc88ad384`.

---

### Task 1: Alembic migration + Meal SQLAlchemy model + MealRead schema

Adds the data-layer support for custom meals. No tests for the migration itself; verification is `alembic upgrade head` succeeding and the model accepting the new fields. Schema test comes via the API tests in later tasks (which exercise `MealRead`).

**Files:**
- Create: `backend/alembic/versions/<auto>_add_custom_meal_fields.py`
- Modify: `backend/app/models/meal.py` (lines 7-23 — the `Meal` class)
- Modify: `backend/app/schemas/meal.py` (lines 4-18 — the `MealRead` class)

- [ ] **Step 1: Generate the migration scaffold**

Run from repo root:
```
uv run --project backend alembic -c backend/alembic.ini revision -m "add_custom_meal_fields"
```

This creates a file like `backend/alembic/versions/<hash>_add_custom_meal_fields.py`. Open it.

- [ ] **Step 2: Fill in the migration**

Replace the file contents with the following (keep the `revision` value the scaffold generated; set `down_revision = 'db1bc88ad384'`):

```python
"""add_custom_meal_fields

Adds is_custom (NOT NULL DEFAULT FALSE) and nullable user_id on meals,
relaxes recipe_id to nullable, and adds a CHECK constraint enforcing that
custom meals always have an owner.

Revision ID: <KEEP_GENERATED>
Revises: db1bc88ad384
Create Date: <KEEP_GENERATED>
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '<KEEP_GENERATED>'
down_revision: Union[str, Sequence[str], None] = 'db1bc88ad384'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'meals',
        sa.Column('is_custom', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'meals',
        sa.Column('user_id', sa.String(), nullable=True),
    )
    op.create_foreign_key(
        'fk_meals_user_id_user',
        'meals', 'user',
        ['user_id'], ['id'],
    )
    op.alter_column('meals', 'recipe_id', existing_type=sa.String(), nullable=True)
    op.create_check_constraint(
        'ck_meals_custom_requires_user',
        'meals',
        'is_custom = false OR user_id IS NOT NULL',
    )


def downgrade() -> None:
    op.drop_constraint('ck_meals_custom_requires_user', 'meals', type_='check')
    op.alter_column('meals', 'recipe_id', existing_type=sa.String(), nullable=False)
    op.drop_constraint('fk_meals_user_id_user', 'meals', type_='foreignkey')
    op.drop_column('meals', 'user_id')
    op.drop_column('meals', 'is_custom')
```

- [ ] **Step 3: Update the `Meal` model**

Replace `backend/app/models/meal.py` lines 1-23 with:

```python
from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    recipe_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein: Mapped[int] = mapped_column(Integer, nullable=False)
    carbohydrates: Mapped[int] = mapped_column(Integer, nullable=False)
    fat: Mapped[int] = mapped_column(Integer, nullable=False)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingredients: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_custom: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("user.id"), nullable=True, index=True
    )
```

(Leave the `ScheduleItemAlternative` class below untouched.)

- [ ] **Step 4: Update `MealRead`**

Replace `backend/app/schemas/meal.py` with:

```python
from pydantic import BaseModel, ConfigDict


class MealRead(BaseModel):
    id: int
    recipe_id: str | None = None
    title: str
    image_url: str | None = None
    source_url: str | None = None
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    prep_time_minutes: int | None = None
    ingredients: list[str] = []
    tags: list[str] = []
    is_custom: bool = False

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 5: Verify the migration applies**

```
uv run --project backend alembic -c backend/alembic.ini upgrade head
```

Expected: `INFO [alembic.runtime.migration] Running upgrade db1bc88ad384 -> <new_rev>, add_custom_meal_fields`

If the user's local DB isn't running, this will fail with a connection error — that's fine to defer to manual verification, but the file must syntactically parse. Test that with:

```
uv run --project backend python -c "import ast; ast.parse(open('backend/alembic/versions/<new_file>.py').read())"
```

- [ ] **Step 6: Verify the existing test suite still passes**

```
uv run --project backend pytest backend/tests/test_schedules.py -v
```

Expected: all existing tests pass (the model changes are additive; no behavior change yet).

If existing tests start failing because they construct `Meal` without supplying `is_custom` — they don't need to (defaults to `False`), so this should not happen. If it does, investigate; do not paper over.

- [ ] **Step 7: Commit**

```
git add backend/alembic/versions/ backend/app/models/meal.py backend/app/schemas/meal.py
git commit -m "feat(backend): add is_custom, nullable user_id to meal model"
```

---

### Task 2: ScheduleItemCreate validator + CustomMealInput schema

Adds the request-side validation (TDD: validator tests first). No handler changes yet — those happen in Task 3.

**Files:**
- Modify: `backend/app/schemas/schedule.py` (lines 1-21)
- Modify: `backend/tests/test_schedules.py` (append validator tests at end)

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_schedules.py`:

```python
@pytest.mark.asyncio
async def test_create_meal_item_rejects_neither_meal_id_nor_custom_meal(client: AsyncClient):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "exactly one of meal_id or custom_meal" in response.text


@pytest.mark.asyncio
async def test_create_meal_item_rejects_both_meal_id_and_custom_meal(client: AsyncClient, db):
    meal = await _create_meal(db)
    await db.commit()
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "meal_id": meal.id,
        "custom_meal": {
            "title": "Avocado Toast",
            "calories": 350,
            "protein": 12,
            "carbohydrates": 40,
            "fat": 15,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "exactly one of meal_id or custom_meal" in response.text


@pytest.mark.asyncio
async def test_create_workout_rejects_meal_id(client: AsyncClient, db):
    meal = await _create_meal(db)
    await db.commit()
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "exercise",
        "duration_minutes": 45,
        "meal_id": meal.id,
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "only valid for meal items" in response.text


@pytest.mark.asyncio
async def test_create_workout_rejects_custom_meal(client: AsyncClient):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "exercise",
        "duration_minutes": 45,
        "custom_meal": {
            "title": "ignored",
            "calories": 0,
            "protein": 0,
            "carbohydrates": 0,
            "fat": 0,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "only valid for meal items" in response.text
```

- [ ] **Step 2: Run the tests to verify they fail**

```
uv run --project backend pytest backend/tests/test_schedules.py::test_create_meal_item_rejects_neither_meal_id_nor_custom_meal backend/tests/test_schedules.py::test_create_meal_item_rejects_both_meal_id_and_custom_meal backend/tests/test_schedules.py::test_create_workout_rejects_meal_id backend/tests/test_schedules.py::test_create_workout_rejects_custom_meal -v
```

Expected: all four FAIL. The first one likely fails with `200` (current handler accepts the payload and creates an orphan); the third with `200` because today nothing prevents `meal_id` on an exercise item.

- [ ] **Step 3: Implement the validator + CustomMealInput**

Replace `backend/app/schemas/schedule.py` lines 1-21 with:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityType, ExerciseCategory
from app.schemas.meal import MealRead


class ScheduleItemBase(BaseModel):
    date: datetime
    activity_type: ActivityType
    duration_minutes: int
    is_completed: bool = False
    exercise_category: ExerciseCategory | None = None
    exercise_calorie_burn: int = 0
    exercise_muscle_gain: float = 0.0


class CustomMealInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    calories: int = Field(ge=0)
    protein: int = Field(ge=0)
    carbohydrates: int = Field(ge=0)
    fat: int = Field(ge=0)


class ScheduleItemCreate(ScheduleItemBase):
    meal_id: int | None = None
    custom_meal: CustomMealInput | None = None

    @model_validator(mode="after")
    def _validate_meal_payload(self) -> "ScheduleItemCreate":
        is_meal = self.activity_type == ActivityType.MEAL
        provided = sum(x is not None for x in (self.meal_id, self.custom_meal))
        if is_meal and provided != 1:
            raise ValueError(
                "meal items require exactly one of meal_id or custom_meal"
            )
        if not is_meal and provided != 0:
            raise ValueError(
                "meal_id and custom_meal are only valid for meal items"
            )
        return self
```

(Leave `ScheduleItemUpdate`, `SwapMealRequest`, and `ScheduleItemRead` unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

```
uv run --project backend pytest backend/tests/test_schedules.py::test_create_meal_item_rejects_neither_meal_id_nor_custom_meal backend/tests/test_schedules.py::test_create_meal_item_rejects_both_meal_id_and_custom_meal backend/tests/test_schedules.py::test_create_workout_rejects_meal_id backend/tests/test_schedules.py::test_create_workout_rejects_custom_meal -v
```

Expected: all four PASS.

- [ ] **Step 5: Verify no existing test broke**

The existing `test_create_schedule_item` uses `activity_type=exercise` with no `meal_id` or `custom_meal` — that still satisfies the validator (`provided == 0`).

Run:
```
uv run --project backend pytest backend/tests/test_schedules.py -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add backend/app/schemas/schedule.py backend/tests/test_schedules.py
git commit -m "feat(backend): validate schedule create requires correct meal payload shape"
```

---

### Task 3: create_schedule_item handler — atomic custom meal creation

**Files:**
- Modify: `backend/app/api/endpoints/schedules.py` (lines 72-85 — `create_schedule_item`)
- Modify: `backend/tests/test_schedules.py` (append happy-path tests)

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_schedules.py`:

```python
@pytest.mark.asyncio
async def test_create_schedule_item_with_custom_meal(client: AsyncClient, mock_user):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "custom_meal": {
            "title": "Avocado Toast",
            "calories": 350,
            "protein": 12,
            "carbohydrates": 40,
            "fat": 15,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["activity_type"] == "meal"
    assert data["duration_minutes"] == 30
    assert data["meal_id"] is not None
    assert data["meal"]["title"] == "Avocado Toast"
    assert data["meal"]["calories"] == 350
    assert data["meal"]["protein"] == 12
    assert data["meal"]["carbohydrates"] == 40
    assert data["meal"]["fat"] == 15
    assert data["meal"]["recipe_id"] is None
    assert data["meal"]["is_custom"] is True
    assert data["meal"]["prep_time_minutes"] == 30


@pytest.mark.asyncio
async def test_create_schedule_item_with_custom_meal_persists_owner(
    client: AsyncClient, db, mock_user
):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "custom_meal": {
            "title": "Avocado Toast",
            "calories": 350,
            "protein": 12,
            "carbohydrates": 40,
            "fat": 15,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 200
    meal_id = response.json()["meal_id"]
    fresh = await db.get(Meal, meal_id)
    assert fresh is not None
    assert fresh.user_id == mock_user.id
    assert fresh.is_custom is True
    assert fresh.recipe_id is None


@pytest.mark.asyncio
async def test_create_schedule_item_with_meal_id_does_not_create_new_meal(
    client: AsyncClient, db, mock_user
):
    meal = await _create_meal(db, recipe_id="spoon-1", title="Spoonacular Recipe")
    await db.commit()

    before_count = (await db.execute(sa.select(sa.func.count()).select_from(Meal))).scalar_one()

    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "meal_id": meal.id,
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 200
    assert response.json()["meal_id"] == meal.id
    assert response.json()["meal"]["title"] == "Spoonacular Recipe"

    after_count = (await db.execute(sa.select(sa.func.count()).select_from(Meal))).scalar_one()
    assert after_count == before_count, "no new Meal row should be created when meal_id is provided"
```

You will also need the `sqlalchemy as sa` import at the top of the test file. Check the existing imports — if it isn't there, add `import sqlalchemy as sa` near the top.

- [ ] **Step 2: Run tests to verify they fail**

```
uv run --project backend pytest backend/tests/test_schedules.py::test_create_schedule_item_with_custom_meal backend/tests/test_schedules.py::test_create_schedule_item_with_custom_meal_persists_owner backend/tests/test_schedules.py::test_create_schedule_item_with_meal_id_does_not_create_new_meal -v
```

Expected: FAIL — current handler does `ScheduleItem(**item_in.model_dump(), ...)` which would either pass an unknown `custom_meal` to `ScheduleItem` (TypeError) or fail by leaving `meal_id=None` on a meal item (now blocked by Task 2's validator on the `meal_id`-less path).

- [ ] **Step 3: Implement the handler**

Replace lines 72-85 of `backend/app/api/endpoints/schedules.py` with:

```python
@router.post("", response_model=ScheduleItemRead)
async def create_schedule_item(
    item_in: ScheduleItemCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
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
        await db.flush()
        meal_id = meal.id

    item = ScheduleItem(
        date=item_in.date,
        activity_type=item_in.activity_type,
        duration_minutes=item_in.duration_minutes,
        is_completed=item_in.is_completed,
        exercise_category=item_in.exercise_category,
        exercise_calorie_burn=item_in.exercise_calorie_burn,
        exercise_muscle_gain=item_in.exercise_muscle_gain,
        meal_id=meal_id,
        user_id=current_user.id,
    )
    db.add(item)
    await db.commit()

    stmt = select(ScheduleItem).where(ScheduleItem.id == item.id).options(*_meal_load())
    result = await db.execute(stmt)
    return result.scalar_one()
```

You will also need to add `from app.models.meal import Meal, ScheduleItemAlternative` if `Meal` isn't already imported. Check the import block (lines 9-18) — currently it imports only `ScheduleItemAlternative`. Update to:

```python
from app.models.meal import Meal, ScheduleItemAlternative
```

- [ ] **Step 4: Run tests to verify they pass**

```
uv run --project backend pytest backend/tests/test_schedules.py -v
```

Expected: all tests pass, including the three new ones from Step 1 and the four from Task 2.

- [ ] **Step 5: Commit**

```
git add backend/app/api/endpoints/schedules.py backend/tests/test_schedules.py
git commit -m "feat(backend): create custom meal atomically with schedule item"
```

---

### Task 4: delete_schedule_item — cascade for custom meals

**Files:**
- Modify: `backend/app/api/endpoints/schedules.py` (lines 175-192 — `delete_schedule_item`)
- Modify: `backend/tests/test_schedules.py` (append cascade tests)

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_schedules.py`:

```python
@pytest.mark.asyncio
async def test_delete_schedule_item_cascades_custom_meal(
    client: AsyncClient, db, mock_user
):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "custom_meal": {
            "title": "Avocado Toast",
            "calories": 350,
            "protein": 12,
            "carbohydrates": 40,
            "fat": 15,
        },
    }
    create_resp = await client.post(BASE, json=payload)
    assert create_resp.status_code == 200
    item_id = create_resp.json()["id"]
    meal_id = create_resp.json()["meal_id"]

    delete_resp = await client.delete(f"{BASE}/{item_id}")
    assert delete_resp.status_code == 204

    # The custom Meal row should be gone too
    fresh = await db.get(Meal, meal_id)
    assert fresh is None, "custom Meal should be deleted when its ScheduleItem is removed"


@pytest.mark.asyncio
async def test_delete_schedule_item_preserves_spoonacular_meal(
    client: AsyncClient, db, mock_user
):
    meal = await _create_meal(db, recipe_id="spoon-keep", title="Shared Recipe")
    await db.commit()
    meal_id = meal.id

    create_resp = await client.post(
        BASE,
        json={
            "date": "2025-06-15T08:00:00",
            "activity_type": "meal",
            "duration_minutes": 30,
            "meal_id": meal_id,
        },
    )
    assert create_resp.status_code == 200
    item_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"{BASE}/{item_id}")
    assert delete_resp.status_code == 204

    fresh = await db.get(Meal, meal_id)
    assert fresh is not None, "non-custom Meal must remain (it is shared library data)"
    assert fresh.is_custom is False
```

- [ ] **Step 2: Run tests to verify they fail**

```
uv run --project backend pytest backend/tests/test_schedules.py::test_delete_schedule_item_cascades_custom_meal backend/tests/test_schedules.py::test_delete_schedule_item_preserves_spoonacular_meal -v
```

Expected:
- `cascades_custom_meal` FAILS — current `delete_schedule_item` does not touch the `Meal` row, so the custom row would remain.
- `preserves_spoonacular_meal` likely PASSES already; that's fine — it's a regression guard for the next change.

- [ ] **Step 3: Implement the cascade**

Replace lines 175-192 of `backend/app/api/endpoints/schedules.py` with:

```python
@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(
    item_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    stmt = select(ScheduleItem).where(ScheduleItem.id == item_id).options(*_meal_load())
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    custom_meal_to_delete: Meal | None = None
    if item.meal is not None and item.meal.is_custom:
        custom_meal_to_delete = item.meal

    # Cascade: remove any downstream leftovers that point at this item
    await db.execute(
        delete(ScheduleItem).where(ScheduleItem.source_schedule_item_id == item_id)
    )
    await db.delete(item)
    if custom_meal_to_delete is not None:
        await db.delete(custom_meal_to_delete)
    await db.commit()
```

The change from the original:
- Loads the item with `_meal_load()` so `item.meal` is populated (avoids async lazy-load issues).
- Captures the custom meal reference before the item delete.
- After deleting the item, deletes the meal too (SQLAlchemy unit of work flushes in FK-correct order at commit).

- [ ] **Step 4: Run tests to verify they pass**

```
uv run --project backend pytest backend/tests/test_schedules.py -v
```

Expected: all tests pass, including the two new cascade tests and existing `test_delete_primary_cascades_to_leftovers`.

- [ ] **Step 5: Commit**

```
git add backend/app/api/endpoints/schedules.py backend/tests/test_schedules.py
git commit -m "feat(backend): cascade-delete custom meal when schedule item removed"
```

---

### Task 5: Backend lints & checks

**Files:** none modified — verification only.

- [ ] **Step 1: Run backend lints/checks**

`backend/pyproject.toml` configures `ruff` and `mypy`. Run, from repo root:

```
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
uv run --project backend mypy backend
```

Fix any new warnings introduced by Tasks 1–4. To auto-fix formatting:

```
uv run --project backend ruff format backend
```

Do not silence findings with `# noqa` — fix the code. The `alembic/` directory is excluded from ruff via `extend-exclude` in `pyproject.toml`, so the new migration won't be linted.

- [ ] **Step 2: Run the full backend test suite**

```
uv run --project backend pytest backend/tests/ -v
```

Expected: green. If unrelated tests are skipped due to "stale enums" (a known pattern in `conftest.py`), that's pre-existing — not something to fix here.

- [ ] **Step 3: No commit needed unless lint fixes were made**

If lint fixes were applied, commit them:

```
git add backend
git commit -m "chore(backend): lint cleanup"
```

---

### Task 6: Regenerate the frontend API client

**Files:**
- Modify (auto-generated): `frontend/api/types.gen.ts`, `frontend/api/sdk.gen.ts`

- [ ] **Step 1: Run the generator**

`scripts/generate-client.sh` imports `app.main` directly (no running backend required) to dump the OpenAPI spec, then runs `pnpm generate-client`, `pnpm lint`, and `pnpm format` inside `frontend/`. From repo root:

```
./scripts/generate-client.sh
```

If the script fails on `pnpm lint` because of pre-existing warnings unrelated to this task, fix only the warnings you introduced (typically nothing — the regenerated files are auto-formatted).

- [ ] **Step 2: Verify the generated types include `custom_meal`**

```
grep -n "custom_meal" frontend/api/types.gen.ts
```

Expected: a hit in the `ScheduleItemCreate` type definition. Also verify `MealRead` now has `is_custom`:

```
grep -n "is_custom" frontend/api/types.gen.ts
```

Expected: a hit on a `is_custom: boolean` line in `MealRead`.

- [ ] **Step 3: Commit**

```
git add frontend/api/types.gen.ts frontend/api/sdk.gen.ts
git commit -m "chore(frontend): regenerate api client for custom meal support"
```

---

### Task 7: MealDetailModal — rename "Modify" → "Reschedule"

**Files:**
- Modify: `frontend/components/MealDetailModal.tsx` (line 150)
- Create: `frontend/__tests__/components/MealDetailModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/components/MealDetailModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MealDetailModal } from '@/components/MealDetailModal';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) => <>{children}</>
    ),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const baseMeal = {
  time: '8:00 AM',
  title: 'Avocado Toast',
  type: 'meal',
  meal: {
    id: 1,
    recipe_id: null,
    title: 'Avocado Toast',
    calories: 350,
    protein: 12,
    carbohydrates: 40,
    fat: 15,
    prep_time_minutes: 10,
    ingredients: [],
    tags: [],
    is_custom: true,
  },
};

describe('MealDetailModal', () => {
  it('shows a Reschedule button (renamed from Modify)', () => {
    render(
      <MealDetailModal
        visible
        onClose={jest.fn()}
        meal={baseMeal as any}
        onModify={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText('Reschedule')).toBeTruthy();
    expect(screen.queryByText('Modify')).toBeNull();
  });

  it('fires onModify when Reschedule is pressed', () => {
    const onModify = jest.fn();
    const onClose = jest.fn();
    render(
      <MealDetailModal
        visible
        onClose={onClose}
        meal={baseMeal as any}
        onModify={onModify}
        onRemove={jest.fn()}
      />
    );
    fireEvent.press(screen.getByText('Reschedule'));
    expect(onModify).toHaveBeenCalledTimes(1);
  });

  it('fires onRemove when Remove is pressed', () => {
    const onRemove = jest.fn();
    render(
      <MealDetailModal
        visible
        onClose={jest.fn()}
        meal={baseMeal as any}
        onModify={jest.fn()}
        onRemove={onRemove}
      />
    );
    fireEvent.press(screen.getByText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
cd frontend && pnpm test __tests__/components/MealDetailModal.test.tsx
```

Expected: FAIL on the "shows a Reschedule button" assertion — the button still says "Modify".

- [ ] **Step 3: Rename the label**

In `frontend/components/MealDetailModal.tsx`, change line 150:

```tsx
              <Text style={[styles.actionButtonText, { color: Colors.light.text }]}>Modify</Text>
```

to:

```tsx
              <Text style={[styles.actionButtonText, { color: Colors.light.text }]}>Reschedule</Text>
```

(The prop name `onModify` stays as-is — renaming the prop is unnecessary churn and would touch every caller. The button label is what users see.)

- [ ] **Step 4: Run the test to verify it passes**

```
cd frontend && pnpm test __tests__/components/MealDetailModal.test.tsx
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```
git add frontend/components/MealDetailModal.tsx frontend/__tests__/components/MealDetailModal.test.tsx
git commit -m "feat(frontend): rename meal detail Modify button to Reschedule"
```

---

### Task 8: EditItemModal — per-mode field matrix; remove disabled-fields state

This is the largest frontend change. The component currently shows disabled nutrition fields and a fake-looking title input on edit-meal mode, and shows a disabled duration on add-meal mode. After this task: in `add` mode for `meal`, all fields are editable; in `edit` mode for `meal`, only the time picker renders. Workout/sleep modes are unchanged.

**Files:**
- Modify: `frontend/components/EditItemModal.tsx`
- Create: `frontend/__tests__/components/EditItemModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/__tests__/components/EditItemModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EditItemModal } from '@/components/EditItemModal';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) => <>{children}</>
    ),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// TimePickerInput renders a labeled control; we assert via its label.
jest.mock('@/components/TimePickerInput', () => ({
  TimePickerInput: ({ label, value }: { label: string; value: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessibilityLabel={label}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/DurationPickerInput', () => ({
  DurationPickerInput: ({ label, value }: { label: string; value: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessibilityLabel={label}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </View>
    );
  },
}));

describe('EditItemModal — meal add mode', () => {
  it('renders title, time, duration, and four nutrition inputs, all editable', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={jest.fn()}
        mode="add"
        itemType="meal"
      />
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Duration')).toBeTruthy();
    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('Protein (g)')).toBeTruthy();
    expect(screen.getByText('Carbs (g)')).toBeTruthy();
    expect(screen.getByText('Fat (g)')).toBeTruthy();
    // The "Set by the recipe — cannot be edited here." note must be gone.
    expect(screen.queryByText(/Set by the recipe/i)).toBeNull();
  });

  it('saves with title, duration, and parsed nutrition fields', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={onSave}
        mode="add"
        itemType="meal"
      />
    );
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Greek Yogurt Bowl'), 'Avocado Toast');
    fireEvent.changeText(screen.getByPlaceholderText('Calories'), '350');
    fireEvent.changeText(screen.getByPlaceholderText('Protein'), '12');
    fireEvent.changeText(screen.getByPlaceholderText('Carbs'), '40');
    fireEvent.changeText(screen.getByPlaceholderText('Fat'), '15');
    fireEvent.press(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.title).toBe('Avocado Toast');
    expect(arg.calories).toBe(350);
    expect(arg.protein).toBe(12);
    expect(arg.carbs).toBe(40);
    expect(arg.fat).toBe(15);
    expect(arg.type).toBe('meal');
  });

  it('blocks save when title is empty', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={onSave}
        mode="add"
        itemType="meal"
      />
    );
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required')).toBeTruthy();
  });
});

describe('EditItemModal — meal edit mode', () => {
  const existingMeal = {
    id: '42',
    time: '9:00 AM',
    title: 'Existing Meal',
    duration: '30 min',
    type: 'meal' as const,
    calories: 400,
    protein: 25,
    carbs: 50,
    fat: 10,
  };

  it('renders only the time picker; no title, no duration, no nutrition fields', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={existingMeal}
        onSave={jest.fn()}
        mode="edit"
        itemType="meal"
      />
    );
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.queryByText('Title')).toBeNull();
    expect(screen.queryByText('Duration')).toBeNull();
    expect(screen.queryByText('Calories')).toBeNull();
    expect(screen.queryByText('Protein (g)')).toBeNull();
    expect(screen.queryByText('Carbs (g)')).toBeNull();
    expect(screen.queryByText('Fat (g)')).toBeNull();
  });

  it('saves only the time field', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={existingMeal}
        onSave={onSave}
        mode="edit"
        itemType="meal"
      />
    );
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.time).toBe('9:00 AM');
    expect(arg.type).toBe('meal');
    expect(arg.id).toBe('42');
  });
});

describe('EditItemModal — workout edit mode (regression)', () => {
  it('still renders Title and Workout Type fields', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={{
          id: '7',
          time: '6:00 PM',
          title: 'HIIT',
          duration: '45 min',
          type: 'workout',
          workoutType: 'HIIT',
        }}
        onSave={jest.fn()}
        mode="edit"
        itemType="workout"
      />
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Workout Type')).toBeTruthy();
    expect(screen.getByText('Duration')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
cd frontend && pnpm test __tests__/components/EditItemModal.test.tsx
```

Expected: failures across the meal-add and meal-edit suites. Workout regression suite likely passes already.

- [ ] **Step 3: Refactor EditItemModal**

Replace the body of `frontend/components/EditItemModal.tsx` with the following. This is a full rewrite of the component (keeping the styles and the modal scaffolding the same; changing the field-rendering logic and validation):

```tsx
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { DurationPickerInput } from '@/components/DurationPickerInput';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Dumbbell, Moon, UtensilsCrossed } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type EditItemModalProps = {
  visible: boolean;
  onClose: () => void;
  item: WeeklyScheduleItem | null;
  onSave: (updatedItem: WeeklyScheduleItem) => void;
  mode: 'edit' | 'add';
  itemType?: ItemType;
};

const TYPE_CONFIG = {
  meal: {
    label: 'Meal',
    subtitle: 'Nutrition & schedule',
    color: Colors.light.secondary,
    Icon: UtensilsCrossed,
  },
  workout: {
    label: 'Workout',
    subtitle: 'Exercise details',
    color: Colors.light.primary,
    Icon: Dumbbell,
  },
  sleep: {
    label: 'Sleep',
    subtitle: 'Rest & recovery',
    color: Colors.light.charts.carbs,
    Icon: Moon,
  },
} as const;

export function EditItemModal({
  visible,
  onClose,
  item,
  onSave,
  mode,
  itemType = 'meal',
}: EditItemModalProps) {
  const [time, setTime] = useState(item?.time || '7:00 AM');
  const [title, setTitle] = useState(item?.title || '');
  const [duration, setDuration] = useState(item?.duration || '30 min');
  const [calories, setCalories] = useState(item?.calories?.toString() || '');
  const [protein, setProtein] = useState(item?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(item?.carbs?.toString() || '');
  const [fat, setFat] = useState(item?.fat?.toString() || '');
  const [workoutType, setWorkoutType] = useState(item?.workoutType || '');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [targetHours, setTargetHours] = useState(item?.targetHours?.toString() || '8');
  const [touched, setTouched] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const currentType = item?.type || itemType;
  const config = TYPE_CONFIG[currentType];

  // For meal+edit, the only editable thing is time. Title/nutrition are not rendered.
  const isMealEdit = currentType === 'meal' && mode === 'edit';
  const isMealAdd = currentType === 'meal' && mode === 'add';

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!isMealEdit && !title.trim()) e.title = 'Title is required';
    if (isMealAdd) {
      const checkInt = (key: string, raw: string, label: string) => {
        if (!raw.trim()) {
          e[key] = `${label} is required`;
          return;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 0) e[key] = `${label} must be a non-negative number`;
      };
      checkInt('calories', calories, 'Calories');
      checkInt('protein', protein, 'Protein');
      checkInt('carbs', carbs, 'Carbs');
      checkInt('fat', fat, 'Fat');

      const durMins = parseInt(duration, 10);
      if (!Number.isFinite(durMins) || durMins <= 0) {
        e.duration = 'Duration must be greater than 0';
      }
    }
    if (currentType === 'sleep' && targetHours) {
      const h = parseFloat(targetHours);
      if (isNaN(h) || h < 1 || h > 24) e.targetHours = 'Must be 1–24';
    }
    return e;
  }, [title, targetHours, currentType, isMealAdd, isMealEdit, calories, protein, carbs, fat, duration]);

  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    if (visible) {
      setTime(item?.time || '7:00 AM');
      setTitle(item?.title || '');
      setDuration(item?.duration || '30 min');
      setCalories(item?.calories?.toString() || '');
      setProtein(item?.protein?.toString() || '');
      setCarbs(item?.carbs?.toString() || '');
      setFat(item?.fat?.toString() || '');
      setWorkoutType(item?.workoutType || '');
      setCaloriesBurned(item?.type === 'workout' ? item?.calories?.toString() || '' : '');
      setTargetHours(item?.targetHours?.toString() || '8');
      setTouched(false);
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, item]);

  const handleSave = () => {
    setTouched(true);
    if (!isValid) return;

    const baseItem: WeeklyScheduleItem = {
      id: item?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time,
      title: isMealEdit ? item?.title || '' : title,
      duration,
      type: currentType,
    };

    if (isMealAdd) {
      baseItem.calories = parseInt(calories, 10);
      baseItem.protein = parseInt(protein, 10);
      baseItem.carbs = parseInt(carbs, 10);
      baseItem.fat = parseInt(fat, 10);
    } else if (currentType === 'workout') {
      baseItem.workoutType = workoutType || title;
      baseItem.calories = caloriesBurned ? parseInt(caloriesBurned, 10) : undefined;
    } else if (currentType === 'sleep') {
      baseItem.targetHours = targetHours ? parseFloat(targetHours) : 8;
    }

    onSave(baseItem);
    onClose();
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderError = (field: string) => {
    if (!touched || !errors[field]) return null;
    return <Text style={styles.errorText}>{errors[field]}</Text>;
  };

  const inputStyle = (field: string) => [
    styles.input,
    touched && errors[field] && styles.inputError,
  ];

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={[styles.headerStrip, { backgroundColor: config.color }]} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
            <config.Icon size={20} color={config.color} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {mode === 'edit' ? (currentType === 'meal' ? 'Reschedule' : 'Edit') : 'Add'} {config.label}
            </Text>
            <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
          </View>
        </View>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.form}>
        <View style={styles.field}>
          <TimePickerInput label="Time" value={time} onChange={setTime} format="12h" />
        </View>

        {!isMealEdit && (
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={inputStyle('title')}
              value={title}
              onChangeText={setTitle}
              placeholder={
                currentType === 'meal'
                  ? 'e.g., Greek Yogurt Bowl'
                  : currentType === 'workout'
                    ? 'e.g., HIIT Training'
                    : 'Sleep'
              }
              placeholderTextColor={Colors.light.textMuted}
            />
            {renderError('title')}
          </View>
        )}

        {isMealAdd && (
          <>
            <Text style={styles.sectionLabel}>Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Calories</Text>
                <TextInput
                  style={inputStyle('calories')}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="Calories"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('calories')}
              </View>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Protein (g)</Text>
                <TextInput
                  style={inputStyle('protein')}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="Protein"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('protein')}
              </View>
            </View>
            <View style={styles.macroRow}>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Carbs (g)</Text>
                <TextInput
                  style={inputStyle('carbs')}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="Carbs"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('carbs')}
              </View>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Fat (g)</Text>
                <TextInput
                  style={inputStyle('fat')}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="Fat"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('fat')}
              </View>
            </View>
          </>
        )}

        {currentType === 'workout' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Workout Type</Text>
              <TextInput
                style={styles.input}
                value={workoutType}
                onChangeText={setWorkoutType}
                placeholder="e.g., HIIT, Strength, Yoga"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>
            <View style={styles.macroRow}>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Calories Burned</Text>
                <TextInput
                  style={styles.input}
                  value={caloriesBurned}
                  onChangeText={setCaloriesBurned}
                  placeholder="300"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
              </View>
            </View>
          </>
        )}

        {currentType === 'sleep' && (
          <View style={styles.field}>
            <Text style={styles.label}>Target Hours</Text>
            <TextInput
              style={inputStyle('targetHours')}
              value={targetHours}
              onChangeText={setTargetHours}
              placeholder="e.g., 8"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.light.textMuted}
            />
            {renderError('targetHours')}
          </View>
        )}

        {!isMealEdit && (
          <View style={styles.field}>
            <DurationPickerInput label="Duration" value={duration} onChange={setDuration} />
            {renderError('duration')}
          </View>
        )}
      </BottomSheetScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, touched && !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  headerStrip: { height: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  headerSubtitle: { fontSize: 13, color: Colors.light.textMuted, marginTop: 1 },
  form: { padding: 20 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 12, marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroField: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
```

Notable differences from the original:
- The "Set by the recipe — cannot be edited here." text and the `readonly`/`readonlyText` styles are removed.
- The `isMealEdit` branch hides Title, Nutrition, and Duration entirely.
- The `isMealAdd` branch renders Nutrition as editable `TextInput`s with validation.
- Header title reads "Reschedule Meal" in `meal+edit` mode (matches `MealDetailModal`'s button label), "Edit <Type>" or "Add <Type>" otherwise.
- Validation now blocks save on empty/negative nutrition for meal-add and on empty title for non-meal-edit.

- [ ] **Step 4: Run the tests to verify they pass**

```
cd frontend && pnpm test __tests__/components/EditItemModal.test.tsx
```

Expected: all suites PASS (meal-add, meal-edit, workout regression).

- [ ] **Step 5: Commit**

```
git add frontend/components/EditItemModal.tsx frontend/__tests__/components/EditItemModal.test.tsx
git commit -m "feat(frontend): per-mode field matrix in EditItemModal; remove disabled fields"
```

---

### Task 9: schedule.tsx — wire add-meal to custom_meal payload; simplify edit save

**Files:**
- Modify: `frontend/app/(tabs)/schedule.tsx` (lines 168-291 — `handleMealModify` and `handleEditSave`)

- [ ] **Step 1: Update `handleMealModify` to drop the macro pipe-through**

`EditItemModal` no longer reads `calories`/`protein`/`carbs`/`fat` from the item in `meal+edit` mode (those fields aren't rendered). Simplify lines 168-189 to:

```tsx
  const handleMealModify = useCallback(
    (mealData: { time: string; title?: string; subtitle?: string; type: string }) => {
      if (!selectedItem) return;
      setEditModalItem({
        id: String(selectedItem.id),
        time: mealData.time,
        title: mealData.title || 'Meal',
        subtitle: mealData.subtitle,
        duration: getDurationDisplay(selectedItem.duration_minutes),
        type: 'meal',
      });
      setEditModalMode('edit');
      setEditModalItemType('meal');
      setEditModalVisible(true);
    },
    [selectedItem]
  );
```

- [ ] **Step 2: Update `handleEditSave` to send `custom_meal` on add and only `date` on edit**

Replace lines 209-291 with:

```tsx
  const handleEditSave = useCallback(
    (updatedItem: WeeklyScheduleItem) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const toNaiveIso = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

      const parseTime = (display: string) => {
        const [timePart, period] = display.split(' ');
        const [h, m] = timePart.split(':').map(Number);
        let hours = h;
        if (period === 'PM' && h !== 12) hours += 12;
        if (period === 'AM' && h === 12) hours = 0;
        return { hours, minutes: m || 0 };
      };

      if (editModalMode === 'add') {
        const dayDate = weekDates[selectedDayIndex];
        const { hours, minutes } = parseTime(updatedItem.time);
        const itemDate = new Date(dayDate);
        itemDate.setHours(hours, minutes, 0, 0);

        const durationMinutes = parseInt(updatedItem.duration) || 30;

        if (updatedItem.type === 'meal') {
          createMutation.mutate({
            body: {
              date: toNaiveIso(itemDate),
              activity_type: 'meal',
              duration_minutes: durationMinutes,
              custom_meal: {
                title: updatedItem.title,
                calories: updatedItem.calories ?? 0,
                protein: updatedItem.protein ?? 0,
                carbohydrates: updatedItem.carbs ?? 0,
                fat: updatedItem.fat ?? 0,
              },
            },
            weekStartDate: weekStartStr,
          });
        } else {
          const activityType =
            updatedItem.type === 'workout' ? ('exercise' as const) : (updatedItem.type as 'sleep');
          createMutation.mutate({
            body: {
              date: toNaiveIso(itemDate),
              activity_type: activityType,
              duration_minutes: durationMinutes,
            },
            weekStartDate: weekStartStr,
          });
        }
        return;
      }

      if (!editModalItem) return;
      const itemId = parseInt(editModalItem.id);
      if (isNaN(itemId)) return;

      const originalItem = scheduleItems.find((i) => i.id === itemId);
      if (!originalItem) {
        Alert.alert('Error', 'Schedule item no longer exists. Refresh and try again.');
        return;
      }

      const originalDate = new Date(originalItem.date);
      const { hours, minutes } = parseTime(updatedItem.time);
      const newDate = new Date(originalDate);
      newDate.setHours(hours, minutes, 0, 0);

      const isMeal = originalItem.activity_type === 'meal';
      const body = isMeal
        ? { date: toNaiveIso(newDate) }
        : {
            date: toNaiveIso(newDate),
            duration_minutes: parseInt(updatedItem.duration) || originalItem.duration_minutes,
          };

      updateMutation.mutate({
        itemId,
        body,
        weekStartDate: weekStartStr,
      });
    },
    [
      editModalMode,
      editModalItem,
      createMutation,
      updateMutation,
      selectedDayIndex,
      weekDates,
      weekStartStr,
      scheduleItems,
    ]
  );
```

Notable changes from the original:
- Add-meal path now sends `custom_meal` with title and four macros, satisfying the server's validator.
- Edit-meal path sends only `date` (no `duration_minutes`), matching the spec ("time only" for meals).
- Workout/sleep edit path still sends `date` + `duration_minutes` to preserve current behavior.
- A small helper `parseTime` removes the duplicated time-parsing block.

- [ ] **Step 3: Type-check + lint the frontend**

```
cd frontend && pnpm typecheck
```

Expected: passes. If `WeeklyScheduleItem.title` is typed as `string | undefined`, the `updatedItem.title` access in the `custom_meal` body needs a fallback (`updatedItem.title ?? ''`) — though validation in `EditItemModal` blocks empty titles before save, the type system doesn't know that. Add the fallback if typecheck complains.

- [ ] **Step 4: Run the existing schedule-related tests**

```
cd frontend && pnpm test schedule
```

Expected: existing tests still pass. (There may not be a `schedule.tsx` test file — the existing pattern is to test components individually. Skip if nothing matches.)

- [ ] **Step 5: Commit**

```
git add frontend/app/\(tabs\)/schedule.tsx
git commit -m "feat(frontend): wire add-meal to custom_meal payload; meal edit sends date only"
```

---

### Task 10: Frontend `pnpm check` & manual verification

**Files:** none — verification only.

- [ ] **Step 1: Run the project's umbrella check**

```
cd frontend && pnpm check
```

This runs lint + format:check + typecheck. If anything fails, fix it. To auto-format:

```
cd frontend && pnpm format
```

- [ ] **Step 2: Run the full Jest suite**

```
cd frontend && pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke-test on the iOS dev client**

The user runs `com.sophros.app` (dev client), never Expo Go. Start the dev server:

```
cd frontend && pnpm ios
```

Walk through:

1. Navigate to the Schedule tab. Tap **Add Item → Meal**. The sheet should be titled "Add Meal" and show: Time, Title, Nutrition (Calories, Protein, Carbs, Fat — all editable), Duration. No "Set by the recipe" note. No disabled gray boxes.
2. Fill in: title "Avocado Toast", calories 350, protein 12, carbs 40, fat 15. Save. The item should appear on the timeline with the title "Avocado Toast".
3. Tap the new "Avocado Toast" item. `MealDetailModal` should show the macros (350 cal, 12g/40g/15g) and a **Reschedule** button (not "Modify") and a **Remove** button.
4. Tap **Reschedule**. The sheet should be titled "Reschedule Meal" and show ONLY the time picker — no title input, no nutrition, no duration.
5. Change the time, save. The item should move to the new time on the timeline.
6. Tap the item again → **Remove** → confirm. The item disappears.
7. Repeat the Reschedule flow on a Spoonacular meal (use one already on the schedule from week-planning). Same UX: only time editable.
8. Tap a workout item — `EditItemModal` should open with Title, Workout Type, Calories Burned, Duration all editable (regression check).

- [ ] **Step 4: If smoke test reveals a UX bug, fix it before claiming completion**

Examples of likely issues:
- `WeeklyScheduleItem.calories` may be optional on the type; the new validator may not catch a UI edge case. Add a guard if needed.
- The `Duration` field in `EditItemModal` add-mode used to render as read-only — now it's a `DurationPickerInput`. Verify that picker actually lets the user change the duration (it should, given workouts already use it that way).

- [ ] **Step 5: No commit needed unless fixes were made**

If smoke-test fixes were made, commit them:

```
git commit -am "fix(frontend): smoke-test cleanup for add-meal and reschedule flows"
```

---

## Definition of Done

- All 10 tasks complete.
- `uv run --project backend pytest backend/tests/test_schedules.py -v` passes (including 9 new tests across Tasks 2–4).
- `cd frontend && pnpm check` passes.
- `cd frontend && pnpm test` passes (including new EditItemModal and MealDetailModal test files).
- Manual smoke test (Task 10 Step 3) passes end-to-end on the iOS dev client.
- The user can now: add a custom meal that persists with title/macros, see "Reschedule" instead of "Modify" on meal detail, change only the time on premade meals, remove a custom meal cleanly.
- Orphan `meal_id=null` schedule items are no longer creatable from the API (validator returns 422).
