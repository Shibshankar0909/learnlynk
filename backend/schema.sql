-- 1. Leads

CREATE TABLE public.leads (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT NOT NULL,
    owner_id      BIGINT,
    stage         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lead queries
CREATE INDEX idx_leads_tenant_id ON public.leads (tenant_id);
CREATE INDEX idx_leads_owner_id ON public.leads (owner_id);
CREATE INDEX idx_leads_stage ON public.leads (stage);
CREATE INDEX idx_leads_created_at ON public.leads (created_at);

-- 2. Applications

CREATE TABLE public.applications (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT NOT NULL,
    lead_id       BIGINT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_applications_lead
        FOREIGN KEY (lead_id)
        REFERENCES public.leads (id)
        ON DELETE CASCADE
);

-- Index for common application queries
CREATE INDEX idx_applications_lead_id ON public.applications (lead_id);
CREATE INDEX idx_applications_tenant_id ON public.applications (tenant_id);

-- 3. Tasks

CREATE TABLE public.tasks (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT NOT NULL,
    related_id    BIGINT NOT NULL, -- references applications.id
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    due_at        TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tasks_application
        FOREIGN KEY (related_id)
        REFERENCES public.applications (id)
        ON DELETE CASCADE,

    -- CHECK constraints
    CONSTRAINT chk_tasks_due_after_created
        CHECK (due_at IS NULL OR due_at >= created_at),

    CONSTRAINT chk_task_type
        CHECK (type IN ('call', 'email', 'review'))
);

-- Index for tasks due today
-- Assumed queries like: WHERE due_at::date = CURRENT_DATE
CREATE INDEX idx_tasks_due_date ON public.tasks (due_at);
CREATE INDEX idx_tasks_tenant_id ON public.tasks (tenant_id);
CREATE INDEX idx_tasks_related_id ON public.tasks (related_id);

-- Trigger to auto-update updated_at fields

-- Shared by all tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_update_leads
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_update_applications
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_update_tasks
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
