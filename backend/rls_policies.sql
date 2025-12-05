ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_leads_policy
ON public.leads
FOR SELECT
USING (
    -- tenant_id column is likely UUID or TEXT, so cast JSON to text
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::bigint

    AND (
        -- Admins: full tenant access
        (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'

        OR

        -- Counselors: can see leads they own
        owner_id = ((current_setting('request.jwt.claims', true)::json->>'user_id')::bigint)

        OR

        -- Counselors: can see leads of teams they belong to
        team_id IN (
            SELECT ut.team_id
            FROM user_teams ut
            WHERE ut.user_id = ((current_setting('request.jwt.claims', true)::json->>'user_id')::bigint)
        )
    )
);

CREATE POLICY insert_leads_policy
ON public.leads
FOR INSERT
WITH CHECK (
    -- Ensure tenant matches, cast claim to text
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::bigint

    AND (
        (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'counselor')
    )
);
