# ORBIT-I Phase 1 — Database ERD Reference

## Tables Overview

| Table | Purpose |
|---|---|
| `organizations` | Each company/org that signs up |
| `users` | All platform users (Org Admin + Recruiter) |
| `jobs` | Job postings by Org Admin |
| `candidates` | People who applied for jobs |
| `recruiters` | Recruiter profile linked to a user |
| `recruiter_jobs` | Junction — which recruiter handles which job |
| `interviews` | Scheduled/completed/cancelled interviews |
| `otp_tokens` | 6-digit OTP for email verification |
| `password_reset_tokens` | Secure token for Forgot Password flow |

---

## Table Details

### 1. organizations
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated |
| name | VARCHAR(255) | Company/org full name |
| slug | VARCHAR(100) UNIQUE | URL-friendly name e.g. "acme-corp" |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Auto-updated via trigger |

---

### 2. users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID FK → organizations | |
| full_name | VARCHAR(255) | |
| email | VARCHAR(255) UNIQUE | Login identifier |
| password_hash | TEXT | bcrypt hash — never plain text |
| role | ENUM | `org_admin` or `recruiter` |
| is_email_verified | BOOLEAN | Becomes true after OTP |
| is_active | BOOLEAN | Soft disable user |
| last_login_at | TIMESTAMP | |
| created_at / updated_at | TIMESTAMP | |

---

### 3. jobs
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID FK → organizations | |
| created_by | UUID FK → users | Org Admin who posted |
| title | VARCHAR(255) | Job title |
| department | VARCHAR(150) | |
| location | VARCHAR(150) | |
| description | TEXT | Full job description |
| status | ENUM | `draft`, `active`, `closed` |
| applicant_count | INT | Denormalized counter |
| posted_at | TIMESTAMP | Set when status → active |
| closed_at | TIMESTAMP | Set when status → closed |

---

### 4. candidates
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID FK → organizations | |
| job_id | UUID FK → jobs | Which job they applied for |
| full_name | VARCHAR(255) | |
| email | VARCHAR(255) | |
| phone | VARCHAR(30) | |
| location | VARCHAR(150) | |
| current_stage | ENUM | `applied` → `screening` → `assessment` → `shortlisted` → `in_interview` → `hired` / `rejected` |
| notes | TEXT | Recruiter notes |
| applied_at | TIMESTAMP | |

> Constraint: one candidate email cannot apply to the same job twice.

---

### 5. recruiters
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users UNIQUE | 1-to-1 with user record |
| organization_id | UUID FK → organizations | |
| department | VARCHAR(150) | |
| job_title | VARCHAR(150) | e.g. "Senior Technical Recruiter" |
| location | VARCHAR(150) | |
| status | ENUM | `active`, `away`, `inactive` |

### 5a. recruiter_jobs (junction)
| Column | Type | Notes |
|---|---|---|
| recruiter_id | UUID FK → recruiters | Composite PK |
| job_id | UUID FK → jobs | Composite PK |
| assigned_at | TIMESTAMP | |

---

### 6. interviews
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID FK → organizations | |
| candidate_id | UUID FK → candidates | |
| job_id | UUID FK → jobs | |
| recruiter_id | UUID FK → recruiters | Interviewer (nullable) |
| interview_stage | VARCHAR(100) | "Phone Screen", "Technical", "Final" |
| scheduled_at | TIMESTAMP | Date + time of interview |
| duration_mins | INT | Default 60 |
| location_or_link | VARCHAR(255) | Room or video link |
| status | ENUM | `scheduled`, `completed`, `cancelled` |
| notes | TEXT | Post-interview notes |

---

### 7. otp_tokens
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| token | CHAR(6) | 6-digit code |
| purpose | ENUM | `email_verification` or `password_reset` |
| expires_at | TIMESTAMP | NOW() + 15 minutes |
| used_at | TIMESTAMP | NULL = not yet used |

---

### 8. password_reset_tokens
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| token_hash | TEXT UNIQUE | Hashed reset token |
| expires_at | TIMESTAMP | NOW() + 1 hour |
| used_at | TIMESTAMP | NULL = not yet used |

---

## Relationships (Quick View)

```
organizations
    ├── users (1 org → many users)
    ├── jobs  (1 org → many jobs)
    ├── candidates (1 org → many candidates)
    ├── recruiters (1 org → many recruiters)
    └── interviews (1 org → many interviews)

users
    └── recruiters (1 user → 1 recruiter profile)

jobs
    ├── candidates (1 job → many candidates)
    ├── recruiter_jobs (many-to-many with recruiters)
    └── interviews (1 job → many interviews)

candidates
    └── interviews (1 candidate → many interviews)

recruiters
    ├── recruiter_jobs (many-to-many with jobs)
    └── interviews (1 recruiter → many interviews as interviewer)
```

---

## ENUM Values

| ENUM | Values |
|---|---|
| user_role | `org_admin`, `recruiter` |
| job_status | `draft`, `active`, `closed` |
| hiring_stage | `applied`, `screening`, `assessment`, `shortlisted`, `in_interview`, `hired`, `rejected` |
| interview_status | `scheduled`, `completed`, `cancelled` |
| recruiter_status | `active`, `away`, `inactive` |
| otp_purpose | `email_verification`, `password_reset` |
