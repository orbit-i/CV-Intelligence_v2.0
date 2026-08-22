-- ============================================================
--  ORBIT-I  |  CV Intelligence  |  Phase 1 Database Schema
--  Database : PostgreSQL
--  Author   : ORBIT-I Development Team
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS  (keeps column values consistent and readable)
-- ============================================================

CREATE TYPE user_role AS ENUM ('org_admin', 'recruiter');

CREATE TYPE job_status AS ENUM ('draft', 'active', 'closed');

CREATE TYPE hiring_stage AS ENUM (
    'applied',
    'screening',
    'assessment',
    'shortlisted',
    'in_interview',
    'hired',
    'rejected'
);

CREATE TYPE interview_status AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TYPE recruiter_status AS ENUM ('active', 'away', 'inactive');

CREATE TYPE otp_purpose AS ENUM ('email_verification', 'password_reset');

-- ============================================================
-- TABLE 1 : organizations
-- Stores each company / org that signs up on the platform.
-- ============================================================

CREATE TABLE organizations (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255)  NOT NULL,
    slug          VARCHAR(100)  UNIQUE NOT NULL,   -- URL-friendly org identifier
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 2 : users
-- All platform users (Org Admins + Recruiters).
-- ============================================================

CREATE TABLE users (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name       VARCHAR(255)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,           -- bcrypt hash, never plain text
    role            user_role     NOT NULL DEFAULT 'recruiter',
    is_email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 3 : jobs
-- Job postings created by Org Admin.
-- ============================================================

CREATE TABLE jobs (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID          NOT NULL REFERENCES users(id),        -- Org Admin who posted
    title           VARCHAR(255)  NOT NULL,
    department      VARCHAR(150),
    location        VARCHAR(150),
    description     TEXT,
    status          job_status    NOT NULL DEFAULT 'draft',
    applicant_count INT           NOT NULL DEFAULT 0,                   -- denormalized counter
    posted_at       TIMESTAMP,                                          -- set when status → active
    closed_at       TIMESTAMP,                                          -- set when status → closed
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 4 : candidates
-- People who have applied for jobs in an organization.
-- ============================================================

CREATE TABLE candidates (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id          UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    full_name       VARCHAR(255)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    phone           VARCHAR(30),
    location        VARCHAR(150),
    current_stage   hiring_stage  NOT NULL DEFAULT 'applied',
    notes           TEXT,                                               -- recruiter notes
    applied_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),

    -- One candidate email per job (prevents duplicate applications)
    CONSTRAINT uq_candidate_job UNIQUE (email, job_id)
);

-- ============================================================
-- TABLE 5 : recruiters
-- Links a user (role = recruiter) to specific jobs.
-- Stores recruiter-profile info and job assignments.
-- ============================================================

CREATE TABLE recruiters (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department      VARCHAR(150),
    job_title       VARCHAR(150),   -- e.g. "Senior Technical Recruiter"
    location        VARCHAR(150),
    status          recruiter_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Junction table: which recruiter is assigned to which job
CREATE TABLE recruiter_jobs (
    recruiter_id    UUID  NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
    job_id          UUID  NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (recruiter_id, job_id)
);

-- ============================================================
-- TABLE 6 : interviews
-- Scheduled / completed / cancelled interviews for candidates.
-- ============================================================

CREATE TABLE interviews (
    id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id    UUID             NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id          UUID             NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    recruiter_id    UUID             REFERENCES recruiters(id) ON DELETE SET NULL,  -- interviewer
    interview_stage VARCHAR(100)     NOT NULL,   -- e.g. "Phone Screen", "Technical", "Final"
    scheduled_at    TIMESTAMP        NOT NULL,
    duration_mins   INT              DEFAULT 60,
    location_or_link VARCHAR(255),               -- physical room or video call link
    status          interview_status NOT NULL DEFAULT 'scheduled',
    notes           TEXT,
    created_at      TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 7 : otp_tokens
-- Short-lived codes for email verification & password reset.
-- ============================================================

CREATE TABLE otp_tokens (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       CHAR(6)      NOT NULL,          -- 6-digit OTP code
    purpose     otp_purpose  NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,          -- typically NOW() + 15 minutes
    used_at     TIMESTAMP,                      -- NULL = not yet used
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 8 : password_reset_tokens
-- Secure tokens sent via email for the Forgot Password flow.
-- ============================================================

CREATE TABLE password_reset_tokens (
    id          UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT      NOT NULL UNIQUE,   -- hashed reset token (never store raw)
    expires_at  TIMESTAMP NOT NULL,          -- typically NOW() + 1 hour
    used_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES  (for common filter / search queries)
-- ============================================================

-- Users
CREATE INDEX idx_users_org        ON users(organization_id);
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_role       ON users(role);

-- Jobs
CREATE INDEX idx_jobs_org         ON jobs(organization_id);
CREATE INDEX idx_jobs_status      ON jobs(status);
CREATE INDEX idx_jobs_department  ON jobs(department);

-- Candidates
CREATE INDEX idx_candidates_org   ON candidates(organization_id);
CREATE INDEX idx_candidates_job   ON candidates(job_id);
CREATE INDEX idx_candidates_stage ON candidates(current_stage);

-- Recruiters
CREATE INDEX idx_recruiters_org    ON recruiters(organization_id);
CREATE INDEX idx_recruiters_status ON recruiters(status);

-- Interviews
CREATE INDEX idx_interviews_org       ON interviews(organization_id);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_job       ON interviews(job_id);
CREATE INDEX idx_interviews_status    ON interviews(status);
CREATE INDEX idx_interviews_date      ON interviews(scheduled_at);

-- OTP tokens
CREATE INDEX idx_otp_user    ON otp_tokens(user_id);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);

-- ============================================================
-- UPDATED_AT auto-update trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to every table that has updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'organizations', 'users', 'jobs',
        'candidates', 'recruiters', 'interviews'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
