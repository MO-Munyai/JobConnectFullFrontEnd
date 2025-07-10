# JobConnectFullFrontEnd

A feature-rich front-end application for the JobConnect platform, enabling users to search, apply for jobs, and manage applications in a seamless single-page app experience.

---

## 🔍 Overview

This front-end is built with **React** and **Vite**, offering the following core functionality:

- **User Authentication** – Sign-up, login, and protected routes.
- **Job Search** – Filter jobs by title, location, or category.
- **Job Details** – View full job descriptions with deadlines and requirements.
- **Apply for Jobs** – Submit applications (resume, cover letter).
- **User Dashboard** – Manage submitted applications and track status.
- **Responsive UI** – Works smoothly across mobile, tablet, and desktop.

---

## 🛠 Tech Stack

- **UI**: React, Vite, TailwindCSS and/or Bootstrap
- **State Management**: React Context or Redux (if included)
- **Routing**: React Router
- **HTTP Client**: Axios or Fetch API
- **Build/Bundler**: Vite
- **Styling**: Tailwind CSS (and/or Bootstrap)

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 16
- npm or Yarn
- A running **JobConnect** backend API (ensure `.env` has the correct endpoint)

### Setup

```bash
git clone https://github.com/MO-Munyai/JobConnectFullv1.git
cd JobConnectFullv1
npm install  # or yarn
cp .env.example .env  # Fill in BACKEND_URL etc.
npm run dev
