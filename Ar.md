# Architecture

## App Flow
- Users start on a secure Login screen.
- Upon successful authentication (Email/Password), they are routed to the main Dispatch Board.
- Supabase Auth manages session persistence.

## Folder and File Structure
- `src/` (Vite + React)
- Supabase Backend

## Tech Stack
- Frontend: Vite, React, Vanilla CSS, lucide-react, date-fns, jspdf
- Backend: Supabase (PostgreSQL)
