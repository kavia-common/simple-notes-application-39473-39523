# Notes Frontend (React) — Ocean Professional

A simple, modern notes app with a sidebar list and main editor panel. Uses an in-memory store by default and can connect to a backend API when `REACT_APP_API_BASE` is configured.

## Features

- Sidebar for note list with search/filter
- Main panel with title/content editor
- Create, edit, delete notes
- Basic validation + optimistic updates
- Responsive with smooth transitions
- Ocean Professional theme (primary `#2563EB`, secondary `#F59E0B`, error `#EF4444`, background `#f9fafb`, surface `#ffffff`, text `#111827`)

## Getting Started

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm start
```

Run tests:

```bash
npm test
```

Build production:

```bash
npm run build
```

## Environment Configuration

Copy `.env.example` to `.env` and set variables as needed.

- `REACT_APP_API_BASE` (optional): Base URL of the backend (e.g. `https://api.example.com`).  
  If omitted, the app uses an in-memory store and still provides full UI interactions.

Other optional envs are included in `.env.example` for completeness but are not required by the runtime.

## Backend Integration

If `REACT_APP_API_BASE` is set, the app will attempt to call the following endpoints:

- `GET /notes` → list notes
- `POST /notes` → create note
- `PUT /notes/:id` → update note
- `DELETE /notes/:id` → delete note

Notes are expected to have at least `{ id, title, content, updatedAt }`. If the backend returns a different `id` on create, the frontend reconciles it automatically.

If the backend is unreachable or returns errors, the app continues working with the local in-memory store and shows a brief toast notification.

## Styling

Theme variables and base styles live in `src/App.css`. Inline styles in `App.js` handle component-level styling with transitions and responsive behavior.

## Accessibility

- Keyboard navigation for note selection
- aria-labels on interactive elements
- Status toast uses `role="status"` and `aria-live="polite"`

## Notes

- No heavy UI frameworks — pure React + CSS.
- Minimal dependencies for fast builds.

