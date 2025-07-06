# project-surify

This project is a Dynamic Data Table Manager built with Next.js 14 (App Router), TypeScript, Redux Toolkit, Material UI v5+, React Hook Form, PapaParse, FileSaver.js, and Redux Persist.

## Features

- Dynamic table with sorting, searching, and pagination
- Manage columns (add, show/hide, reorder, persist)
- Import/export CSV (with validation)
- Inline row editing and validation
- Row actions: edit, delete (with confirmation)
- Theme toggle (light/dark)
- Responsive design

## Getting Started

1. Install dependencies:

   npm install


2. Run the development server:

   npm run dev

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Redux Toolkit & Redux Persist
- Material UI v5+
- React Hook Form
- PapaParse
- FileSaver.js

---

## Extra Features Implemented

Beyond the initial requirements, the following  features were added to enhance the application:

- **Advanced Filtering System:** A dedicated UI to build complex, multi-column filter queries (e.g., `name contains 'John'` AND `age > 30`).
- **Analytics Dashboard:** A visual dashboard providing charts and key metrics derived from the table data.
- **Bulk Actions:** The ability to select multiple rows and perform batch operations like "Delete Selected" or "Update Selected".
- **Saved Views:** Users can save their entire table setup (visible columns, filters, sorting, search query) as a named view and load it back later, persisting complex configurations.
- **Advanced Export Options:** An enhanced export modal that gives users more control over what data to export (e.g., all rows vs. selected rows).

- **Activity Logging:** A system within Redux that logs all major user actions (create, update, delete, import, export) for potential auditing or debugging.
