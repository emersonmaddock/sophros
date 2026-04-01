# Reference Sophros

## System Structure
**Sophros** is a monorepo application consisting of:
- `/frontend` : A React Native and Expo mobile app
- `/backend`  : A Python FastAPI REST API

The connection between these two components relies on *Clerk* an authentication provider.

## Key APIs / Interfaces
*For further documentation, see `/docs`*

### `/users` endpoints
The `/users` endpoints manage CRUD operations on user profiles, and more philosophically, generic user state.

These endpoints are protected by authenticating the Clerk JWT token of the client. The endpoints are used primarily during account creating and updates to the settings.

Create : POST `/users`
Read   : GET  `/users/me`
Update : PUT  `/users/me`
Delete : Managed by Clerk

Further, under GET `/users/me/targets` you can fetch a user's nutrition targets for the day.

### `/meal-plans` endpoints
The `/meal-plans` endpoints manage the generation, saving, and fetching of a week's meals.

These endpoints determine the user by the Clerk JWT token to assign the user to the meal plan, and then store the user information with the meal plan. The frontend orchestrates these calls, with calls flowing into each other so that the user can interact and save state in our backend.

*Standard Flow*
1. Generate a plan using either `/meal-plans/generate` or `/meal-plans/generate-week`
2. Allow the user to choose what meals they want in the frontend, saving the plan using `/meal-plans/save`
3. The frontend can fetch which weeks are planned using `/meal-plans/planned-weeks`
4. The frontend can fetch the details of a saved week using `/meal-plans/week`

## Configuration

### `/frontend`
Configuration is managed through a `.env.local` file, which should be modeled after the `.env.example` file

There are two important environment variables that need to be set:
- `EXPO_PUBLIC_API_URL` : The base URL of the server
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` : Clerk Key to allow publishing (adding) an authenticated user

### `/backend`
Configuration is also managed through a `.env.local` file, which should be modeled after the `.env.example` file

There are three important environment variables that need to be set:
- `DATABASE_URL` : The URL of the database, in asyncpg mode
- `CLERK_PEM_PUBLIC_KEY` : The PEM Public Key for Clerk (to validate Clerk's signatures)
- `SPOONACULAR_API_KEY` : The Spoonacular API key (for meal planning)

## DB Schemas
The full schemas can be best seen in `/backend/app/models` where they are detailed in pydantic format.

Since we are working with relational databases, we want to maximize using native types and avoid inserting JSON objects into our database (which are large and more difficult to query complex relationships with). So, we have a number of different tables to isolate application data.

### Tables

1. *user* table : Manages basic, lightweight user health information, like height and weight
2. *meal-plan* table : Manages the planned meals, with the foreign *user* keys as a one-to-many relationship
3. *dietary* tables : These are a few tables that map busy times, allergies, and preferred foods for our meal plan algorithm. Also has foreign *user* keys as a one-to-many relationship.

## Meal Planning Specification

Basic USDA nutrient calculations follow this guideline: https://goldenplains.extension.colostate.edu/wp-content/uploads/sites/56/2020/12/Basal-Metabolic-Rate-Eating-Plan.pdf

Then, a meal allocator determines when meals should be eaten based on the user's schedule, and segments the nutrients for the day into these slots.

Finally, the meal planner takes these slots and uses the spoonacular api to insert a couple of meal options into the plan for user review.

## Frontend UI Specification

The User Interface (UI) is targeted at mobile deployment, particularly on iOS. Therefore, the layout of the application favors mobile devices. The application features a standard fixed menu bar seen in many mobile deployments and favors easy clicks rather than complex shortcuts or actions. The UI is designed to be intuitive, with more information specificity coming from clicking on an item. Resizing means that the application can work on a variety of platforms effectively as long as they support mobile primitives, with advanced web support for traditional computing platforms requiring more complex designs.