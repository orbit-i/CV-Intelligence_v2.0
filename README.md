# CV Intelligence v2.0

AI-Powered Recruitment Intelligence Platform — by ORBIT-I

## About

CV Intelligence is a full-stack, multi-tenant SaaS platform that automates the entire hiring lifecycle — from resume parsing to candidate placement. It reduces manual screening effort, standardizes evaluation with AI-driven scoring, and gives organizations real-time recruitment analytics for data-driven hiring decisions.

## Core Modules

1. Resume Parsing Engine — OCR + NLP based resume data extraction
2. Candidate Intelligence Engine — enriched candidate profiles, skill mapping
3. Job Management System — job creation, publishing, lifecycle management
4. Candidate Matching Engine — AI-based weighted scoring and ranking
5. Applicant Tracking System (ATS) — pipeline management, kanban workflow
6. Interview Intelligence — AI question generation, digital scorecards
7. Skill Gap Analysis — candidate vs. job requirement gap detection
8. Recruitment Analytics & Reporting — dashboards and KPI reports
9. Communication Automation — automated candidate/team notifications
10. Talent Database — searchable long-term candidate pool
11. Fraud Detection — resume fraud and inconsistency flagging
12. Multi-Language Support — multi-language resume parsing and UI
13. SaaS Billing & Multi-Tenant Management — subscriptions, plans, tenant isolation

## User Roles

Super Admin, Organization Admin, HR Manager, Recruiter, Interviewer, Candidate, Recruitment Agency, University Career Center

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Backend | Node.js (Express.js) |
| Database | PostgreSQL (hosted on Supabase) |
| ORM | Prisma |
| AI/LLM | Llama, Qwen, DeepSeek (planned — later phases) |
| Vector Search | Qdrant (planned — later phases) |
| Cache/Queues | Redis (planned — later phases) |
| File Storage | S3-compatible storage (planned — later phases) |
| Authentication | JWT, OAuth2 (Google, Microsoft) |

## Project Structure

- `frontend/` — User interface, dashboards, portals
- `backend/` — Server logic and API endpoints
- `database/` — Database schema, models, migrations

## Development Roadmap

The full product is being built in 3 phases:

- **Phase 1 — Core Recruitment MVP:** Authentication, Job Management, Candidates, Recruiters, Interviews (basic tracking, no AI yet)
- **Phase 2 — Hiring Intelligence & Analytics:** HR workflows, requisition approvals, reporting, AI matching/scoring
- **Phase 3 — Enterprise & Platform:** Multi-tenant support, billing, super admin tools, system monitoring

## Branch Strategy

- `main` — stable, production-ready code
- `develop` — active daily development branch

See `API_CONTRACT.md` for backend endpoint reference.

## Status

Active Development — Phase 1 in progress

## Organization

ORBIT-I — Building Ideas. Creating Impact.
