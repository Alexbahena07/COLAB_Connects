# COLAB Connects

A full-stack talent-matching platform that connects job seekers with recruiters through intelligent candidate discovery and recruiter dashboards.

🔗 **[Live Site](https://www.colabconnects.app/)**

---

## Overview

COLAB Connects streamlines the hiring process by giving recruiters a centralized dashboard to discover and evaluate candidates, while giving job seekers visibility into relevant opportunities. The platform includes a built-in notification system that delivers automated daily and weekly digests to keep users engaged without manual intervention.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database ORM | Prisma |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| CI/CD | GitHub Actions + Vercel |

---

## Features

- **Recruiter dashboards** — browse and filter candidate profiles with discovery tools built for hiring workflows
- **Candidate matching** — job seekers surface to relevant recruiters based on profile data
- **Automated notification digests** — Vercel cron jobs trigger daily (7am) and weekly (Monday 7am) email digests via a custom `/api/notifications/digest` endpoint
- **CI/CD pipeline** — every push to `main` triggers an automated build and deployment through Vercel
- **Type-safe data layer** — Prisma ORM with full TypeScript integration ensures schema consistency from database to UI

---

## Architecture Highlights

The notification system uses Vercel's cron job scheduler to hit an internal API route on a defined schedule, decoupling digest delivery from user actions entirely. This means the platform stays active and re-engages users automatically without any backend server management.

The project is structured around Next.js App Router conventions, with API routes, server components, and client components organized under the `jobmatch/` directory for clear separation of concerns.

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Alexbahena07/COLAB_Connects.git
cd COLAB_Connects/jobmatch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and any other required variables

# Run Prisma migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Deployment

The app is deployed on Vercel with automatic deployments on every push to `main`. The `vercel.json` config defines cron schedules for the notification digest system.

---

## Author

**Alex Bahena** — Full-Stack Software Developer

- Portfolio: [alexbahena07.github.io/Portfolio](https://alexbahena07.github.io/Portfolio/)
- LinkedIn: [linkedin.com/in/alexbahena](https://linkedin.com/in/alexbahena)
- GitHub: [github.com/Alexbahena07](https://github.com/Alexbahena07)
