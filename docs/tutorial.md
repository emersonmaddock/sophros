# Tutorial Sophros

## Overview
Welcome to **Sophros**, your personalized health and lifestyle assistant.

Sophros integrates directly into your daily life, creating custom meal plans and exercise routines tailored specifically to your body, goals, and busy schedule. Whether you want to lose weight, build muscle, or simply eat better without constant planning, Sophros is here to guide you.

In this tutorial, you will:
1. Set up the Sophros application on your computer.
2. Complete your personal health profile.
3. Generate your very first weekly meal plan.

---

## Prerequisites
*   A computer with **Internet access**.
*   **Node.js** installed (Version 18 or higher recommended).
*   **Python** installed (Version 3.11 or higher).
*   A **Clerk** account for secure sign-in (you can sign up for free at [clerk.com](https://clerk.com)).
*   A **Spoonacular API Key** (available for free at [spoonacular.com/food-api](https://spoonacular.com/food-api)).

---

## Setup / Installation

Setting up Sophros involves two parts: the **Backend** and the **Frontend**.

### 1. Simple Backend Setup
1.  Open your terminal (Command Prompt on Windows or Terminal on Mac).
2.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
3.  Install the project tools:
    ```bash
    pip install uv
    uv sync
    ```
4.  Set up your database and environment:
    *   Rename `.env.example` to `.env`.
    *   Open `.env` and enter your database details.
    *   **Run migrations** to set up the database tables:
        ```bash
        uv run alembic upgrade head
        ```
5.  Start the backend:
    ```bash
    uv run fastapi dev app/main.py
    ```

### 2. Simple Frontend Setup
1.  Open a **new** terminal window.
2.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```
3.  Install the application dependencies:
    ```bash
    pnpm install
    ```
4.  Set up your sign-in key:
    *   Rename `.env.example` to `.env`.
    *   Open `.env` and paste your **Clerk Publishable Key**.
5.  Launch the app:
    ```bash
    pnpm start
    ```
    *   You can now view the app by scanning the QR code with your phone (using the Expo Go app) or pressing 'a' for Android or 'i' for iOS if you have an emulator installed.

---

## First Workflow (Step-by-Step Guide)

### Step 1: Sign Up
*   Open the app on your device.
*   Tap on **Sign Up** and follow the prompts to create your account using your email.

### Step 2: Onboarding (Telling Sophros About You)
Once signed in, Sophros will ask you a few questions to get to know you:
1.  **Your Body**: Enter your age, height, and weight. 
2.  **Your Goals**: Tell us if you want to lose weight, maintain, or gain muscle. Set a target weight and body fat percentage, as well as a date you'd like to reach them by.
3.  **Your Schedule**: Let us know when you usually wake up and go to sleep. This helps us find the best times for your meals.
4.  **Dietary Preferences**: Select any diets you follow.
5.  **Allergies & Cuisines**: Tick any allergies you have and select the types of food you love (or don't love).

### Step 3: Generate Your First Plan
*   From the home screen, tap the **Plan My Week** button.
*   Wait a few moments while Sophros finds recipes that fit your calories, macros, and preferences.
*   **Magical Result**: You now have a full week of breakfast, lunch, and dinner planned out for you!

### Step 4: View Your Schedule
*   Tap the **Schedule** tab at the bottom.
*   You can see exactly what you're eating and when. You can even tap on a meal to see the full recipe and instructions.

---

## Expected Results
If everything went well, you should see a beautiful weekly calendar filled with delicious recipes. Each day will show:
*   Your **Target Calories** for the day.
*   A **Balanced Menu** (Breakfast, Lunch, and Dinner).
*   **Cooking Sessions**: Sophros smartly plans "Cook Double" sessions so you have leftovers on your busy days, saving you time in the kitchen!

---

## Troubleshooting

### "I can't sign in."
*   Check that your `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is correctly pasted into your `frontend/.env` file.
*   Make sure your backend is running.

### "No recipes are showing up."
*   Ensure your **Spoonacular API Key** is active.
*   Check if your dietary preferences are too restrictive (e.g., "Vegan" + "No Vegetables"). Try loosening your preferences to see more results.

### "The app is stuck on a loading screen."
*   Make sure both the **Backend** terminal and **Frontend** terminal are still running.
*   If one has closed, simply run the start command again.

### "I get a database error."
*   Check that your `DATABASE_URL` in the `backend/.env` is correct and that your database is turned on.
