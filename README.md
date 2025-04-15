# Rubik's Cube Simulation

A full-stack web application that simulates a 3D Rubik's Cube (3x3x3 to 7x7x7) with interactive scrambling and solving animations. Built with a modern TypeScript/React frontend and an Express/Node.js backend.

---

## Features

- **3D Rubik's Cube Simulation:** Rotate, scramble, and solve cubes of various sizes (3x3x3 up to 7x7x7) in real time.
- **Beautiful UI:** Responsive, modern interface with smooth controls and move history display.
- **Backend API:** Express server with a modular structure, ready for user authentication and persistent storage.
- **TypeScript Everywhere:** Type safety across client, server, and shared code.
- **Extensible Storage:** In-memory storage for users, easily swappable for a database.
- **Best Practices:** Functional React, error handling, and clear code organization.

---

## Project Structure

```
.
├── client/         # React frontend (Vite, TailwindCSS, Three.js)
│   └── src/
│       ├── components/
│       │   └── RubiksCube.tsx
│       └── App.tsx
├── server/         # Express backend (TypeScript)
│   ├── index.ts
│   ├── routes.ts
│   └── storage.ts
├── shared/         # Shared types and schema (Drizzle ORM, Zod)
│   └── schema.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── ...
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   - Create a `.env` file in the root directory for any secrets or configuration (e.g., database URLs, API keys).
   - **Note:** `.env` is not included in version control for security.

   Example `.env`:
   ```
   # Add your environment variables here
   # DATABASE_URL=...
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   - The app will be available at [http://localhost:5000](http://localhost:5000).

---

## Scripts

- `npm run dev` — Start the backend (and Vite frontend in development mode)
- `npm run build` — Build the frontend and backend for production
- `npm start` — Start the production server
- `npm run check` — Type-check the project
- `npm run db:push` — Push Drizzle ORM migrations (if using a database)

---

## Usage

- **Interact with the Cube:** Use your mouse to rotate the view. Use the controls to scramble or solve the cube.
- **Change Cube Size:** Use the dropdown to select between 3x3x3 and 7x7x7 cubes.
- **Move History:** See the move notation for scrambles and solves in the sidebar.

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, Three.js
- **Backend:** Node.js, Express, TypeScript
- **Shared:** Drizzle ORM, Zod (for schema validation)
- **Other:** Radix UI, Zustand, and more (see `package.json`)

---

## Environment Variables

- All secrets and configuration should be placed in a `.env` file.
- The project uses [python-dotenv](https://pypi.org/project/python-dotenv/) (if Python is used) or [dotenv](https://www.npmjs.com/package/dotenv) for Node.js.
- **Never commit your `.env` file.** It is excluded via `.gitignore`.

---

## Error Handling

- All backend routes and storage operations include error handling.
- The frontend disables controls during animations and handles invalid actions gracefully.

---

## Extending the Project

- **Add API routes:** Implement new endpoints in `server/routes.ts`.
- **Persist users:** Replace the in-memory storage in `server/storage.ts` with a database-backed implementation.
- **Authentication:** Integrate Passport.js or another strategy for user login.

---

## License

MIT

---

## Acknowledgements

- [Three.js](https://threejs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Radix UI](https://www.radix-ui.com/) 