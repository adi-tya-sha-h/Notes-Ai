# Authentication Implementation Plan

## What will be built

Full-stack JWT authentication with:
- Beautiful **Login** and **Signup** modal dialogs (glassmorphism style)
- Backend `/api/auth/register` and `/api/auth/login` Express routes
- **bcryptjs** for password hashing, **jsonwebtoken** for session tokens
- Users persisted to `server/users.json` (no database needed)
- Navbar updates to show the logged-in user's name + Logout button
- Token stored in `localStorage` — session survives page refresh

---

## Proposed Changes

### Backend — `server/`

#### [MODIFY] index.js
- Add `POST /api/auth/register` — validates fields, hashes password, saves user, returns JWT
- Add `POST /api/auth/login` — verifies credentials, returns JWT
- Read/write users from `server/users.json`

#### [MODIFY] package.json
- Add `bcryptjs` and `jsonwebtoken` dependencies

#### [NEW] users.json
- Auto-created on first registration (empty `[]` initially)

---

### Frontend — root

#### [MODIFY] index.html
- Add a **Login modal** with email + password fields
- Add a **Signup modal** with name + email + password fields
- Both modals include loading state, error display, and close-on-backdrop-click

#### [MODIFY] style.css
- Modal overlay, glassmorphism card, animated slide-in, form input styles, error/success states

#### [MODIFY] script.js
- `openModal()` / `closeModal()` helpers
- `handleLogin()` — POST to `/api/auth/login`, store token, update navbar
- `handleSignup()` — POST to `/api/auth/register`, store token, update navbar
- `logout()` — clears token, resets navbar
- `checkAuthOnLoad()` — reads localStorage token and restores logged-in state on refresh

---

## Verification Plan

1. Start server with `npm run dev`
2. Click **Signup** → fill form → user created, navbar updates
3. Refresh page → still logged in (token in localStorage)
4. Click **Logout** → navbar resets to Login/Signup buttons
5. Click **Login** → correct creds work, wrong creds show error
