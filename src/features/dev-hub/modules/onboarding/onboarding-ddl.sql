-- ============================================================================
-- Onboarding PF/PJ y KYC: DDL de diseno. NO es una migracion ni se ejecuta desde aca.
-- Antes de convertirlo en migracion hay que contrastarlo con la base real (paso 0).
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Funciones base
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.is_valid_cuit(p text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    v_weights constant int[] := ARRAY[5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    v_sum int := 0;
    v_check int;
BEGIN
    IF p IS NULL OR p !~ '^[0-9]{11}$' THEN
        RETURN false;
    END IF;
    FOR i IN 1..10 LOOP
        v_sum := v_sum + substr(p, i, 1)::int * v_weights[i];
    END LOOP;
    v_check := 11 - (v_sum % 11);
    IF v_check = 11 THEN
        v_check := 0;
    ELSIF v_check = 10 THEN
        RETURN false;
    END IF;
    RETURN v_check = substr(p, 11, 1)::int;
END;
$$;

CREATE FUNCTION public._require_permission(p_code text)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.has_any_permission(ARRAY[p_code]) THEN
        RAISE EXCEPTION 'Sin permiso para ejecutar esta operacion' USING errcode = '42501';
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Identidad
-- ----------------------------------------------------------------------------
CREATE TABLE public.people (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_id            text,
    document_country  char(2),
    document_type     text,
    document_number   text,
    first_name        text NOT NULL,
    last_name         text NOT NULL,
    birth_date        date,
    gender            text,
    nationality       char(2),
    residence_country char(2),
    occupation        text,
    funds_origin      text,
    is_pep            boolean,
    pep_declared_at   timestamptz,
    kyc_status        text NOT NULL DEFAULT 'not_started',
    compliance_status text NOT NULL DEFAULT 'not_screened',
    anonymized_at     timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT people_tax_id_check CHECK (tax_id IS NULL OR public.is_valid_cuit(tax_id)),
    CONSTRAINT people_document_all_or_none CHECK (num_nonnulls(document_country, document_type, document_number) IN (0, 3)),
    CONSTRAINT people_identifier_required CHECK (
        anonymized_at IS NOT NULL OR tax_id IS NOT NULL OR document_number IS NOT NULL),
    CONSTRAINT people_pep_declared_check CHECK (is_pep IS NULL OR pep_declared_at IS NOT NULL),
    CONSTRAINT people_kyc_status_check CHECK (
        kyc_status IN ('not_started', 'legacy_unverified', 'pending', 'passed', 'failed', 'expired')),
    CONSTRAINT people_compliance_status_check CHECK (
        compliance_status IN ('not_screened', 'pending', 'clear', 'potential_match', 'confirmed_match'))
);
CREATE UNIQUE INDEX ux_people_tax_id ON public.people (tax_id) WHERE tax_id IS NOT NULL;
CREATE UNIQUE INDEX ux_people_document ON public.people (document_country, document_type, document_number)
    WHERE document_number IS NOT NULL;
CREATE TRIGGER people_no_delete BEFORE DELETE ON public.people
    FOR EACH ROW EXECUTE FUNCTION public.tg_solo_insercion();

-- ----------------------------------------------------------------------------
-- 3. Cuenta
-- ----------------------------------------------------------------------------
ALTER TABLE public.clientes
    ADD COLUMN auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    ADD COLUMN auth_linked_at timestamptz,
    ADD COLUMN auth_link_method text,
    ADD COLUMN auth_linked_by uuid,
    ADD COLUMN person_id uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    ADD COLUMN account_classification text,
    ADD CONSTRAINT clientes_id_tipo_key UNIQUE (id, tipo_persona),
    ADD CONSTRAINT clientes_id_legajo_key UNIQUE (id, legajo),
    ADD CONSTRAINT clientes_person_only_fisica CHECK (person_id IS NULL OR tipo_persona = 'fisica'),
    ADD CONSTRAINT clientes_classification_check CHECK (
        account_classification IS NULL OR account_classification IN ('commercial', 'personal')),
    ADD CONSTRAINT clientes_auth_method_check CHECK (
        auth_link_method IS NULL OR auth_link_method IN ('signup', 'verified_email', 'manual_review')),
    ADD CONSTRAINT clientes_auth_trace_check CHECK (
        auth_user_id IS NULL OR (auth_link_method IS NOT NULL AND auth_linked_at IS NOT NULL)),
    ADD CONSTRAINT clientes_auth_manual_check CHECK (
        auth_link_method IS DISTINCT FROM 'manual_review' OR auth_linked_by IS NOT NULL);
CREATE UNIQUE INDEX ux_clientes_auth_user ON public.clientes (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX ux_clientes_person ON public.clientes (person_id) WHERE person_id IS NOT NULL;

CREATE FUNCTION public._session_customer_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT id FROM public.clientes WHERE auth_user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 4. Declaraciones
-- ----------------------------------------------------------------------------
CREATE TABLE public.person_submissions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_customer_id uuid NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
    submitted_by_user        uuid,
    source                   text NOT NULL,
    declared                 jsonb NOT NULL,
    declared_tax_id          text GENERATED ALWAYS AS (declared ->> 'tax_id') STORED,
    person_id                uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    status                   text NOT NULL DEFAULT 'pending_match',
    match_decision           text,
    decided_by               uuid REFERENCES public.backoffice_users (id),
    decided_at               timestamptz,
    decision_reason          text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT person_submissions_id_customer_key UNIQUE (id, submitted_by_customer_id),
    CONSTRAINT person_submissions_id_person_key UNIQUE (id, person_id),
    CONSTRAINT person_submissions_declared_check CHECK (jsonb_typeof(declared) = 'object'),
    CONSTRAINT person_submissions_source_check CHECK (
        source IN ('pf_onboarding', 'company_onboarding', 'account_update', 'legacy_migration', 'backoffice')),
    CONSTRAINT person_submissions_user_check CHECK (source = 'legacy_migration' OR submitted_by_user IS NOT NULL),
    CONSTRAINT person_submissions_status_check CHECK (
        status IN ('pending_match', 'linked', 'applied', 'rejected', 'superseded')),
    CONSTRAINT person_submissions_decision_check CHECK (
        match_decision IS NULL OR match_decision IN ('new_person', 'existing_person')),
    -- linked: se vinculo a la persona sin cambiar su identidad. applied: ademas se aplicaron los datos.
    CONSTRAINT person_submissions_state_check CHECK (CASE status
        WHEN 'pending_match' THEN person_id IS NULL AND match_decision IS NULL AND decided_at IS NULL
        WHEN 'linked' THEN person_id IS NOT NULL AND match_decision = 'existing_person'
            AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND decision_reason IS NOT NULL
        WHEN 'applied' THEN person_id IS NOT NULL AND match_decision IS NOT NULL AND decided_at IS NOT NULL
            AND (match_decision = 'new_person' OR decided_by IS NOT NULL)
        WHEN 'rejected' THEN person_id IS NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL
            AND decision_reason IS NOT NULL
        ELSE true END),
    CONSTRAINT person_submissions_self_decision_check CHECK (decided_by IS NULL OR decided_by <> submitted_by_user)
);
CREATE INDEX idx_person_submissions_tax_id ON public.person_submissions (declared_tax_id);
CREATE INDEX idx_person_submissions_person ON public.person_submissions (person_id);
CREATE INDEX idx_person_submissions_queue ON public.person_submissions (created_at) WHERE status = 'pending_match';
-- Una cuenta no tiene dos declaraciones abiertas sobre el mismo CUIT/CUIL.
CREATE UNIQUE INDEX ux_person_submissions_open ON public.person_submissions (submitted_by_customer_id, declared_tax_id)
    WHERE status = 'pending_match' AND declared_tax_id IS NOT NULL;

CREATE FUNCTION public.tg_person_submissions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las declaraciones no se borran' USING errcode = '42501';
    END IF;
    IF NEW.declared IS DISTINCT FROM OLD.declared
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.submitted_by_customer_id IS DISTINCT FROM OLD.submitted_by_customer_id
       OR NEW.submitted_by_user IS DISTINCT FROM OLD.submitted_by_user THEN
        RAISE EXCEPTION 'Lo declarado no se modifica' USING errcode = '42501';
    END IF;
    IF OLD.person_id IS NOT NULL AND NEW.person_id IS DISTINCT FROM OLD.person_id THEN
        RAISE EXCEPTION 'Una declaracion vinculada no cambia de persona' USING errcode = '42501';
    END IF;
    IF NOT (
        (OLD.status = 'pending_match' AND NEW.status IN ('pending_match', 'linked', 'applied', 'rejected', 'superseded'))
        OR (OLD.status = 'linked' AND NEW.status IN ('linked', 'applied', 'superseded'))
    ) THEN
        RAISE EXCEPTION 'Transicion de declaracion no permitida: % a %', OLD.status, NEW.status USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER person_submissions_guard BEFORE UPDATE OR DELETE ON public.person_submissions
    FOR EACH ROW EXECUTE FUNCTION public.tg_person_submissions_guard();

-- ----------------------------------------------------------------------------
-- 5. Empresa y relaciones
-- ----------------------------------------------------------------------------
CREATE TABLE public.company_profiles (
    customer_id         uuid PRIMARY KEY,
    person_kind         text NOT NULL DEFAULT 'juridica' CHECK (person_kind = 'juridica'),
    legal_name          text NOT NULL,
    trade_name          text,
    company_type        text,
    identification_type text,
    registration_date   date,
    activity_code       text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT company_profiles_customer_fk FOREIGN KEY (customer_id, person_kind)
        REFERENCES public.clientes (id, tipo_persona) ON DELETE RESTRICT
);

CREATE TABLE public.company_members (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.company_profiles (customer_id) ON DELETE RESTRICT,
    submission_id uuid NOT NULL,
    person_id     uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    role          text NOT NULL,
    status        text NOT NULL DEFAULT 'pending_identity',
    started_at    date,
    ended_at      date,
    approved_by   uuid REFERENCES public.backoffice_users (id),
    approved_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    -- La declaracion es de esta empresa.
    CONSTRAINT company_members_submission_company_fk FOREIGN KEY (submission_id, company_id)
        REFERENCES public.person_submissions (id, submitted_by_customer_id) ON DELETE RESTRICT,
    -- La persona es la de la declaracion. Con person_id nulo, MATCH SIMPLE no la exige hasta vincular.
    CONSTRAINT company_members_submission_person_fk FOREIGN KEY (submission_id, person_id)
        REFERENCES public.person_submissions (id, person_id) ON DELETE RESTRICT,
    CONSTRAINT company_members_role_check CHECK (
        role IN ('holder', 'co_holder', 'legal_representative', 'attorney', 'signatory')),
    CONSTRAINT company_members_status_check CHECK (
        status IN ('pending_identity', 'pending_review', 'active', 'rejected', 'ended')),
    CONSTRAINT company_members_person_state_check CHECK (
        (status = 'pending_identity' AND person_id IS NULL)
        OR (status IN ('pending_review', 'active', 'ended') AND person_id IS NOT NULL)
        OR status = 'rejected'),
    CONSTRAINT company_members_approved_check CHECK (
        status NOT IN ('active', 'ended') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND started_at IS NOT NULL)),
    CONSTRAINT company_members_ended_check CHECK ((status = 'ended') = (ended_at IS NOT NULL)),
    CONSTRAINT company_members_dates_check CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT company_members_submission_role_key UNIQUE (company_id, submission_id, role)
);
CREATE UNIQUE INDEX ux_company_members_open ON public.company_members (company_id, person_id, role)
    WHERE status IN ('pending_review', 'active');
CREATE INDEX idx_company_members_person ON public.company_members (person_id) WHERE status = 'active';
CREATE INDEX idx_company_members_company ON public.company_members (company_id, status);

CREATE TABLE public.company_beneficial_owners (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.company_profiles (customer_id) ON DELETE RESTRICT,
    submission_id  uuid NOT NULL,
    person_id      uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    control_type   text NOT NULL,
    ownership_pct  numeric(5, 2),
    control_detail text,
    status         text NOT NULL DEFAULT 'pending_identity',
    started_at     date,
    ended_at       date,
    approved_by    uuid REFERENCES public.backoffice_users (id),
    approved_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT beneficial_owners_submission_company_fk FOREIGN KEY (submission_id, company_id)
        REFERENCES public.person_submissions (id, submitted_by_customer_id) ON DELETE RESTRICT,
    CONSTRAINT beneficial_owners_submission_person_fk FOREIGN KEY (submission_id, person_id)
        REFERENCES public.person_submissions (id, person_id) ON DELETE RESTRICT,
    CONSTRAINT beneficial_owners_control_check CHECK (
        control_type IN ('direct_ownership', 'indirect_ownership', 'voting_control', 'management_control', 'other')),
    CONSTRAINT beneficial_owners_pct_range_check CHECK (ownership_pct IS NULL OR (ownership_pct > 0 AND ownership_pct <= 100)),
    CONSTRAINT beneficial_owners_pct_required_check CHECK (
        control_type NOT IN ('direct_ownership', 'indirect_ownership') OR ownership_pct IS NOT NULL),
    CONSTRAINT beneficial_owners_detail_check CHECK (control_type <> 'other' OR control_detail IS NOT NULL),
    CONSTRAINT beneficial_owners_status_check CHECK (
        status IN ('pending_identity', 'pending_review', 'active', 'rejected', 'ended')),
    CONSTRAINT beneficial_owners_person_state_check CHECK (
        (status = 'pending_identity' AND person_id IS NULL)
        OR (status IN ('pending_review', 'active', 'ended') AND person_id IS NOT NULL)
        OR status = 'rejected'),
    CONSTRAINT beneficial_owners_approved_check CHECK (
        status NOT IN ('active', 'ended') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND started_at IS NOT NULL)),
    CONSTRAINT beneficial_owners_ended_check CHECK ((status = 'ended') = (ended_at IS NOT NULL)),
    CONSTRAINT beneficial_owners_dates_check CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT beneficial_owners_submission_control_key UNIQUE (company_id, submission_id, control_type)
);
CREATE UNIQUE INDEX ux_beneficial_owners_open ON public.company_beneficial_owners (company_id, person_id, control_type)
    WHERE status IN ('pending_review', 'active');
CREATE INDEX idx_beneficial_owners_person ON public.company_beneficial_owners (person_id) WHERE status = 'active';
CREATE INDEX idx_beneficial_owners_company ON public.company_beneficial_owners (company_id, status);

CREATE FUNCTION public.tg_relationship_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las relaciones no se borran: se terminan' USING errcode = '42501';
    END IF;
    IF OLD.person_id IS NOT NULL AND NEW.person_id IS DISTINCT FROM OLD.person_id THEN
        RAISE EXCEPTION 'Una relacion vinculada no cambia de persona' USING errcode = '42501';
    END IF;
    IF NOT (
        (OLD.status = 'pending_identity' AND NEW.status IN ('pending_identity', 'pending_review', 'rejected'))
        OR (OLD.status = 'pending_review' AND NEW.status IN ('pending_review', 'active', 'rejected'))
        OR (OLD.status = 'active' AND NEW.status IN ('active', 'ended'))
    ) THEN
        RAISE EXCEPTION 'Transicion de relacion no permitida: % a %', OLD.status, NEW.status USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER company_members_guard BEFORE UPDATE OR DELETE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.tg_relationship_guard();
CREATE TRIGGER beneficial_owners_guard BEFORE UPDATE OR DELETE ON public.company_beneficial_owners
    FOR EACH ROW EXECUTE FUNCTION public.tg_relationship_guard();

-- Tope de participacion directa. El bloqueo de la empresa evita carreras entre altas simultaneas.
CREATE FUNCTION public.tg_beneficial_owners_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_total numeric;
BEGIN
    IF NEW.control_type <> 'direct_ownership' OR NEW.status IN ('rejected', 'ended') THEN
        RETURN NEW;
    END IF;
    PERFORM 1 FROM public.company_profiles WHERE customer_id = NEW.company_id FOR UPDATE;
    SELECT coalesce(sum(ownership_pct), 0) INTO v_total
      FROM public.company_beneficial_owners
     WHERE company_id = NEW.company_id AND control_type = 'direct_ownership'
       AND status IN ('pending_identity', 'pending_review', 'active')
       AND id <> NEW.id;
    IF v_total + NEW.ownership_pct > 100 THEN
        RAISE EXCEPTION 'La participacion directa de la empresa supera el 100%%' USING errcode = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER beneficial_owners_cap BEFORE INSERT OR UPDATE ON public.company_beneficial_owners
    FOR EACH ROW EXECUTE FUNCTION public.tg_beneficial_owners_cap();

-- ----------------------------------------------------------------------------
-- 6. Solicitudes
-- ----------------------------------------------------------------------------
CREATE TABLE public.onboarding_applications (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id       uuid NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
    process           text NOT NULL,
    status            text NOT NULL DEFAULT 'draft',
    documents_status  text NOT NULL DEFAULT 'missing',
    kyc_status        text NOT NULL DEFAULT 'pending',
    compliance_status text NOT NULL DEFAULT 'pending',
    submitted_at      timestamptz,
    review_due_at     timestamptz,
    decided_by        uuid REFERENCES public.backoffice_users (id),
    decided_at        timestamptz,
    internal_reason   text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT onboarding_process_check CHECK (
        process IN ('initial_onboarding', 'periodic_review', 'member_change', 'legacy_remediation')),
    CONSTRAINT onboarding_status_check CHECK (
        status IN ('draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT onboarding_documents_check CHECK (documents_status IN ('missing', 'received', 'approved', 'rejected', 'expired')),
    CONSTRAINT onboarding_kyc_check CHECK (kyc_status IN ('pending', 'passed', 'failed')),
    CONSTRAINT onboarding_compliance_check CHECK (compliance_status IN ('pending', 'clear', 'potential_match', 'confirmed_match')),
    CONSTRAINT onboarding_decided_check CHECK (
        status NOT IN ('approved', 'rejected') OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
    CONSTRAINT onboarding_reject_reason_check CHECK (status <> 'rejected' OR internal_reason IS NOT NULL)
);
CREATE UNIQUE INDEX ux_onboarding_open ON public.onboarding_applications (customer_id)
    WHERE status NOT IN ('approved', 'rejected', 'cancelled');
CREATE INDEX idx_onboarding_queue ON public.onboarding_applications (status, review_due_at);

-- Una solicitud cerrada no se reabre: una revision nueva es otra solicitud.
CREATE FUNCTION public.tg_onboarding_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las solicitudes no se borran' USING errcode = '42501';
    END IF;
    IF OLD.status IN ('approved', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'La solicitud esta cerrada: no se modifica' USING errcode = '42501';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
        (OLD.status = 'draft' AND NEW.status IN ('submitted', 'cancelled'))
        OR (OLD.status = 'submitted' AND NEW.status = 'in_review')
        OR (OLD.status = 'in_review' AND NEW.status IN ('approved', 'rejected', 'changes_requested'))
        OR (OLD.status = 'changes_requested' AND NEW.status IN ('submitted', 'cancelled'))
    ) THEN
        RAISE EXCEPTION 'Transicion de solicitud no permitida: % a %', OLD.status, NEW.status USING errcode = '42501';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
CREATE TRIGGER onboarding_guard BEFORE UPDATE OR DELETE ON public.onboarding_applications
    FOR EACH ROW EXECUTE FUNCTION public.tg_onboarding_guard();

-- ----------------------------------------------------------------------------
-- 7. Documentos
-- ----------------------------------------------------------------------------
ALTER TABLE public.documentos DROP CONSTRAINT documentos_tipo_check;
ALTER TABLE public.documentos
    ADD COLUMN customer_id uuid,
    ADD COLUMN submission_id uuid,
    ADD COLUMN status text NOT NULL DEFAULT 'received',
    ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    ADD COLUMN supersedes_id uuid REFERENCES public.documentos (id) ON DELETE RESTRICT,
    ADD COLUMN mime_type text,
    ADD COLUMN size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes > 0),
    ADD COLUMN content_hash text,
    ADD COLUMN uploaded_by uuid,
    ADD COLUMN expires_at timestamptz,
    ADD CONSTRAINT documentos_tipo_check CHECK (
        tipo IN ('id_frente', 'id_dorso', 'servicio', 'selfie', 'poder', 'estatuto', 'acta_autoridades', 'constancia_afip')),
    ADD CONSTRAINT documentos_status_check CHECK (status IN ('received', 'approved', 'rejected', 'expired', 'superseded')),
    -- El legajo y el id son de la misma cuenta.
    ADD CONSTRAINT documentos_customer_legajo_fk FOREIGN KEY (customer_id, cliente_legajo)
        REFERENCES public.clientes (id, legajo),
    -- La declaracion es de la cuenta que subio el documento.
    ADD CONSTRAINT documentos_submission_customer_fk FOREIGN KEY (submission_id, customer_id)
        REFERENCES public.person_submissions (id, submitted_by_customer_id) ON DELETE RESTRICT,
    ADD CONSTRAINT documentos_customer_required CHECK (customer_id IS NOT NULL) NOT VALID;
CREATE UNIQUE INDEX ux_documentos_supersedes ON public.documentos (supersedes_id) WHERE supersedes_id IS NOT NULL;
-- Un solo documento vigente por cuenta, tipo y declaracion.
CREATE UNIQUE INDEX ux_documentos_current ON public.documentos (
    customer_id, tipo, coalesce(submission_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE status <> 'superseded' AND customer_id IS NOT NULL;
CREATE INDEX idx_documentos_submission ON public.documentos (submission_id);
CREATE INDEX idx_documentos_expiry ON public.documentos (expires_at) WHERE status = 'approved';

CREATE FUNCTION public.tg_documentos_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_prev public.documentos;
BEGIN
    IF NEW.customer_id IS NULL THEN
        SELECT id INTO NEW.customer_id FROM public.clientes WHERE legajo = NEW.cliente_legajo;
    END IF;
    NEW.status := 'received';
    IF NEW.supersedes_id IS NOT NULL THEN
        SELECT * INTO v_prev FROM public.documentos WHERE id = NEW.supersedes_id FOR UPDATE;
        IF v_prev.customer_id IS DISTINCT FROM NEW.customer_id
           OR v_prev.tipo IS DISTINCT FROM NEW.tipo
           OR v_prev.submission_id IS DISTINCT FROM NEW.submission_id THEN
            RAISE EXCEPTION 'Una version nueva debe ser del mismo documento' USING errcode = '23514';
        END IF;
        NEW.version := v_prev.version + 1;
        UPDATE public.documentos SET status = 'superseded' WHERE id = NEW.supersedes_id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER documentos_before_insert BEFORE INSERT ON public.documentos
    FOR EACH ROW EXECUTE FUNCTION public.tg_documentos_before_insert();

-- El estado solo cambia por una revision o una version nueva (trigger anidado) o al vencer.
CREATE FUNCTION public.tg_documentos_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND pg_trigger_depth() < 2
       AND NOT (OLD.status = 'approved' AND NEW.status = 'expired' AND OLD.expires_at <= now()) THEN
        RAISE EXCEPTION 'El estado del documento lo define su revision' USING errcode = '42501';
    END IF;
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND OLD.customer_id IS NOT NULL
       OR NEW.cliente_legajo IS DISTINCT FROM OLD.cliente_legajo
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.url IS DISTINCT FROM OLD.url
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash AND OLD.content_hash IS NOT NULL
       OR NEW.submission_id IS DISTINCT FROM OLD.submission_id AND OLD.submission_id IS NOT NULL THEN
        RAISE EXCEPTION 'Un documento presentado no se altera: se carga una version nueva' USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER documentos_guard BEFORE UPDATE ON public.documentos
    FOR EACH ROW EXECUTE FUNCTION public.tg_documentos_guard();

CREATE TABLE public.document_reviews (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES public.documentos (id) ON DELETE RESTRICT,
    decision        text NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_resubmission')),
    internal_reason text,
    reviewed_by     uuid NOT NULL REFERENCES public.backoffice_users (id),
    reviewed_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT document_reviews_reason_check CHECK (decision = 'approved' OR internal_reason IS NOT NULL)
);
CREATE INDEX idx_document_reviews_document ON public.document_reviews (document_id, reviewed_at DESC);
CREATE TRIGGER document_reviews_append_only BEFORE UPDATE OR DELETE ON public.document_reviews
    FOR EACH ROW EXECUTE FUNCTION public.tg_solo_insercion();

CREATE FUNCTION public.tg_document_reviews_before()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_doc public.documentos;
BEGIN
    SELECT * INTO v_doc FROM public.documentos WHERE id = NEW.document_id FOR UPDATE;
    IF v_doc.status = 'superseded' THEN
        RAISE EXCEPTION 'No se revisa una version reemplazada' USING errcode = '23514';
    END IF;
    IF v_doc.uploaded_by IS NOT DISTINCT FROM NEW.reviewed_by THEN
        RAISE EXCEPTION 'Quien subio el documento no puede revisarlo' USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER document_reviews_before BEFORE INSERT ON public.document_reviews
    FOR EACH ROW EXECUTE FUNCTION public.tg_document_reviews_before();

CREATE FUNCTION public.tg_document_reviews_after()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.documentos
       SET status = CASE NEW.decision WHEN 'approved' THEN 'approved' ELSE 'rejected' END
     WHERE id = NEW.document_id;
    RETURN NULL;
END;
$$;
CREATE TRIGGER document_reviews_after AFTER INSERT ON public.document_reviews
    FOR EACH ROW EXECUTE FUNCTION public.tg_document_reviews_after();

CREATE TABLE public.document_requirements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    process       text NOT NULL,
    customer_kind text NOT NULL CHECK (customer_kind IN ('fisica', 'juridica')),
    subject_kind  text NOT NULL CHECK (subject_kind IN ('person', 'company')),
    member_role   text,
    document_type text NOT NULL,
    is_required   boolean NOT NULL,
    valid_from    date NOT NULL,
    valid_to      date,
    CONSTRAINT document_requirements_dates_check CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CONSTRAINT document_requirements_role_check CHECK (subject_kind = 'person' OR member_role IS NULL),
    CONSTRAINT document_requirements_no_overlap EXCLUDE USING gist (
        process WITH =, customer_kind WITH =, subject_kind WITH =,
        (coalesce(member_role, '*')) WITH =, document_type WITH =,
        daterange(valid_from, valid_to, '[]') WITH &&)
);

-- ----------------------------------------------------------------------------
-- 8. Verificaciones, controles y casos
-- ----------------------------------------------------------------------------
CREATE TABLE public.identity_verifications (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id            uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    customer_id          uuid REFERENCES public.clientes (id) ON DELETE RESTRICT,
    check_type           text NOT NULL CHECK (check_type IN ('identity_document', 'government_identity', 'liveness', 'tax_id')),
    method               text NOT NULL CHECK (method IN ('manual', 'provider')),
    provider             text,
    provider_reference   text,
    status               text NOT NULL CHECK (status IN ('pending', 'passed', 'failed', 'inconclusive', 'error')),
    result_summary       jsonb,
    evidence_document_id uuid REFERENCES public.documentos (id) ON DELETE RESTRICT,
    performed_by         uuid REFERENCES public.backoffice_users (id),
    performed_at         timestamptz NOT NULL DEFAULT now(),
    expires_at           timestamptz,
    CONSTRAINT identity_verifications_subject_check CHECK (num_nonnulls(person_id, customer_id) = 1),
    CONSTRAINT identity_verifications_manual_check CHECK (method <> 'manual' OR performed_by IS NOT NULL),
    CONSTRAINT identity_verifications_provider_check CHECK (
        method <> 'provider' OR (provider IS NOT NULL AND provider_reference IS NOT NULL))
);
CREATE UNIQUE INDEX ux_identity_verifications_provider ON public.identity_verifications (provider, provider_reference)
    WHERE provider IS NOT NULL;
CREATE INDEX idx_identity_verifications_person ON public.identity_verifications (person_id, check_type, performed_at DESC);
CREATE INDEX idx_identity_verifications_customer ON public.identity_verifications (customer_id, check_type, performed_at DESC);
CREATE TRIGGER identity_verifications_append_only BEFORE UPDATE OR DELETE ON public.identity_verifications
    FOR EACH ROW EXECUTE FUNCTION public.tg_solo_insercion();

CREATE TABLE public.compliance_screenings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    customer_id   uuid REFERENCES public.clientes (id) ON DELETE RESTRICT,
    list_name     text NOT NULL,
    list_version  text,
    status        text NOT NULL CHECK (status IN ('pending', 'clear', 'potential_match', 'false_positive', 'confirmed_match', 'error')),
    matched_entry jsonb,
    resolves_id   uuid REFERENCES public.compliance_screenings (id) ON DELETE RESTRICT,
    run_by        uuid REFERENCES public.backoffice_users (id),
    run_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT compliance_screenings_subject_check CHECK (num_nonnulls(person_id, customer_id) = 1)
);
CREATE INDEX idx_compliance_screenings_person ON public.compliance_screenings (person_id, run_at DESC);
CREATE INDEX idx_compliance_screenings_customer ON public.compliance_screenings (customer_id, run_at DESC);
CREATE TRIGGER compliance_screenings_append_only BEFORE UPDATE OR DELETE ON public.compliance_screenings
    FOR EACH ROW EXECUTE FUNCTION public.tg_solo_insercion();

-- Separa el resultado de un control (compliance_screenings) de la decision sobre la cuenta.
CREATE TABLE public.compliance_cases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     uuid NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
    person_id       uuid REFERENCES public.people (id) ON DELETE RESTRICT,
    trigger_kind    text NOT NULL CHECK (trigger_kind IN (
        'screening_potential_match', 'screening_confirmed_match', 'document_expired',
        'pep_changed', 'identity_changed', 'no_legal_representative')),
    source_id       uuid,
    priority        text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'critical')),
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    decision        text CHECK (decision IN (
        'no_action', 'request_information', 'new_review', 'restrict_operations', 'suspend_account', 'close_account')),
    decision_reason text,
    decided_by      uuid REFERENCES public.backoffice_users (id),
    decided_at      timestamptz,
    opened_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT compliance_cases_resolved_check CHECK ((status = 'resolved') = (
        decision IS NOT NULL AND decision_reason IS NOT NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE UNIQUE INDEX ux_compliance_cases_open ON public.compliance_cases (
    customer_id, trigger_kind, coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE status = 'open';
CREATE INDEX idx_compliance_cases_queue ON public.compliance_cases (priority, opened_at) WHERE status = 'open';

CREATE FUNCTION public.tg_compliance_cases_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.status = 'resolved' THEN
        RAISE EXCEPTION 'Un caso resuelto se conserva sin cambios' USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER compliance_cases_guard BEFORE UPDATE OR DELETE ON public.compliance_cases
    FOR EACH ROW EXECUTE FUNCTION public.tg_compliance_cases_guard();

-- Abre un caso por cada cuenta alcanzada: la cuenta PF y las empresas donde participa la persona.
CREATE FUNCTION public._compliance_open_cases(p_person uuid, p_kind text, p_source uuid, p_priority text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
    INSERT INTO public.compliance_cases (customer_id, person_id, trigger_kind, source_id, priority)
    SELECT DISTINCT a.customer_id, p_person, p_kind, p_source, p_priority
      FROM (
        SELECT id AS customer_id FROM public.clientes WHERE person_id = p_person
        UNION
        SELECT company_id FROM public.company_members
         WHERE person_id = p_person AND status IN ('pending_review', 'active')
        UNION
        SELECT company_id FROM public.company_beneficial_owners
         WHERE person_id = p_person AND status IN ('pending_review', 'active')
      ) a
    ON CONFLICT DO NOTHING;
$$;

-- Los estados calculados salen del historial. Que verificaciones se exigen lo confirma Compliance.
CREATE FUNCTION public._person_refresh_kyc(p_person uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
BEGIN
    WITH latest AS (
        SELECT DISTINCT ON (check_type) check_type, status, expires_at
          FROM public.identity_verifications
         WHERE person_id = p_person
         ORDER BY check_type, performed_at DESC, id
    )
    SELECT CASE
        WHEN count(*) = 0 THEN NULL
        WHEN bool_or(status = 'failed') THEN 'failed'
        WHEN bool_or(check_type = 'identity_document' AND status = 'passed' AND expires_at <= now()) THEN 'expired'
        WHEN bool_or(check_type = 'identity_document' AND status = 'passed') THEN 'passed'
        ELSE 'pending' END
      INTO v_status FROM latest;
    IF v_status IS NOT NULL THEN
        UPDATE public.people SET kyc_status = v_status, updated_at = now() WHERE id = p_person;
    END IF;
END;
$$;

CREATE FUNCTION public.tg_identity_verifications_after()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.person_id IS NOT NULL THEN
        PERFORM public._person_refresh_kyc(NEW.person_id);
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER identity_verifications_after AFTER INSERT ON public.identity_verifications
    FOR EACH ROW EXECUTE FUNCTION public.tg_identity_verifications_after();

-- Un resultado abre casos; nunca cambia el estado de una cuenta.
CREATE FUNCTION public.tg_compliance_screenings_after()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
BEGIN
    v_status := CASE NEW.status
        WHEN 'false_positive' THEN 'clear' WHEN 'error' THEN 'pending' ELSE NEW.status END;
    IF NEW.person_id IS NOT NULL THEN
        UPDATE public.people SET compliance_status = v_status, updated_at = now() WHERE id = NEW.person_id;
        IF NEW.status = 'potential_match' THEN
            PERFORM public._compliance_open_cases(NEW.person_id, 'screening_potential_match', NEW.id, 'normal');
        ELSIF NEW.status = 'confirmed_match' THEN
            PERFORM public._compliance_open_cases(NEW.person_id, 'screening_confirmed_match', NEW.id, 'critical');
        END IF;
    ELSIF NEW.status IN ('potential_match', 'confirmed_match') THEN
        INSERT INTO public.compliance_cases (customer_id, trigger_kind, source_id, priority)
        VALUES (NEW.customer_id, 'screening_' || NEW.status, NEW.id,
                CASE NEW.status WHEN 'confirmed_match' THEN 'critical' ELSE 'normal' END)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER compliance_screenings_after AFTER INSERT ON public.compliance_screenings
    FOR EACH ROW EXECUTE FUNCTION public.tg_compliance_screenings_after();

-- ----------------------------------------------------------------------------
-- 9. Proteccion de la cuenta
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.tg_clientes_protect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- current_user: una funcion SECURITY DEFINER y service_role no corren como authenticated.
    IF current_user IN ('authenticated', 'anon') AND NOT public.es_backoffice() AND (
        NEW.estado IS DISTINCT FROM OLD.estado
        OR NEW.estado_onboarding IS DISTINCT FROM OLD.estado_onboarding
        OR NEW.onboarding_completo IS DISTINCT FROM OLD.onboarding_completo
        OR NEW.email_verificado IS DISTINCT FROM OLD.email_verificado
        OR NEW.cbu IS DISTINCT FROM OLD.cbu
        OR NEW.cbu_cancelado IS DISTINCT FROM OLD.cbu_cancelado
        OR NEW.alias IS DISTINCT FROM OLD.alias
        OR NEW.limite_transferencia IS DISTINCT FROM OLD.limite_transferencia
        OR NEW.limite_ops_diarias IS DISTINCT FROM OLD.limite_ops_diarias
        OR NEW.limite_monto_diario IS DISTINCT FROM OLD.limite_monto_diario
        OR NEW.legajo IS DISTINCT FROM OLD.legajo
        OR NEW.cuit IS DISTINCT FROM OLD.cuit
        OR NEW.tipo_persona IS DISTINCT FROM OLD.tipo_persona
        OR NEW.correo IS DISTINCT FROM OLD.correo
        OR NEW.person_id IS DISTINCT FROM OLD.person_id
        OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
        OR NEW.auth_link_method IS DISTINCT FROM OLD.auth_link_method
        OR NEW.auth_linked_at IS DISTINCT FROM OLD.auth_linked_at
        OR NEW.auth_linked_by IS DISTINCT FROM OLD.auth_linked_by
        OR NEW.account_classification IS DISTINCT FROM OLD.account_classification
    ) THEN
        RAISE EXCEPTION 'Estos datos solo los puede cambiar el backoffice' USING errcode = '42501';
    END IF;
    IF NEW.tipo_persona = 'juridica' AND OLD.estado = 'registrado' AND NEW.estado = 'preactivado'
       AND NOT EXISTS (SELECT 1 FROM public.onboarding_applications a
                        WHERE a.customer_id = NEW.id AND a.status = 'approved') THEN
        RAISE EXCEPTION 'La empresa necesita una solicitud aprobada' USING errcode = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER clientes_protect BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.tg_clientes_protect();

-- Un cambio de identidad en una cuenta PF vinculada crea una declaracion; no toca people.
CREATE FUNCTION public.tg_clientes_identity_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.person_id IS NULL OR auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       OR NEW.genero IS DISTINCT FROM OLD.genero
       OR NEW.fecha_nacimiento IS DISTINCT FROM OLD.fecha_nacimiento
       OR NEW.ocupacion IS DISTINCT FROM OLD.ocupacion
       OR NEW.origen_fondos IS DISTINCT FROM OLD.origen_fondos
       OR NEW.es_pep IS DISTINCT FROM OLD.es_pep THEN
        UPDATE public.person_submissions SET status = 'superseded'
         WHERE submitted_by_customer_id = NEW.id AND status = 'pending_match';
        INSERT INTO public.person_submissions (submitted_by_customer_id, submitted_by_user, source, declared)
        VALUES (NEW.id, auth.uid(), 'account_update', jsonb_build_object(
            'tax_id', NEW.cuit, 'full_name', NEW.nombre, 'gender', NEW.genero, 'birth_date', NEW.fecha_nacimiento,
            'occupation', NEW.ocupacion, 'funds_origin', NEW.origen_fondos, 'is_pep', NEW.es_pep));
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER clientes_identity_change AFTER UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.tg_clientes_identity_change();

-- ----------------------------------------------------------------------------
-- 10. Vinculo con autenticacion: nunca solo por coincidencia de correo
-- ----------------------------------------------------------------------------
CREATE VIEW public.v_auth_link_candidates AS
SELECT c.id AS customer_id,
       min(u.id::text)::uuid AS auth_user_id,
       CASE
           WHEN count(DISTINCT c2.id) > 1 THEN 'multiple_customers'
           WHEN count(DISTINCT u.id) = 0 THEN 'no_user'
           WHEN count(DISTINCT u.id) > 1 THEN 'multiple_users'
           WHEN bool_or(u.email_confirmed_at IS NULL) THEN 'email_not_confirmed'
           WHEN bool_or(b.id IS NOT NULL) THEN 'backoffice_user'
           WHEN bool_or(linked.id IS NOT NULL) THEN 'user_already_linked'
           ELSE 'eligible'
       END AS result
  FROM public.clientes c
  JOIN public.clientes c2 ON lower(c2.correo) = lower(c.correo)
  LEFT JOIN auth.users u ON lower(u.email) = lower(c.correo) AND u.deleted_at IS NULL
  LEFT JOIN public.backoffice_users b ON b.id = u.id
  LEFT JOIN public.clientes linked ON linked.auth_user_id = u.id
 WHERE c.auth_user_id IS NULL
 GROUP BY c.id;
ALTER VIEW public.v_auth_link_candidates SET (security_invoker = true);

-- Solo vincula los casos sin dudas. El resto queda en la vista para revision manual.
CREATE FUNCTION public.auth_link_backfill()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.clientes c
       SET auth_user_id = v.auth_user_id, auth_linked_at = now(), auth_link_method = 'verified_email'
      FROM public.v_auth_link_candidates v
     WHERE v.customer_id = c.id AND v.result = 'eligible';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

CREATE FUNCTION public.auth_link_review(p_customer uuid, p_user uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    IF coalesce(trim(p_reason), '') = '' THEN
        RAISE EXCEPTION 'Indica el motivo de la vinculacion';
    END IF;
    UPDATE public.clientes
       SET auth_user_id = p_user, auth_linked_at = now(), auth_link_method = 'manual_review', auth_linked_by = auth.uid()
     WHERE id = p_customer AND auth_user_id IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta no existe o ya tiene usuario';
    END IF;
    PERFORM public.security_event_record_safe(p_action => 'kyc.auth_linked', p_actor_type => 'staff', p_actor_id => auth.uid(),
        p_target_type => 'customer', p_target_id => p_customer::text, p_metadata => jsonb_build_object('detail', p_reason));
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Funciones del cliente: nunca revelan si una persona ya existe
-- ----------------------------------------------------------------------------
CREATE FUNCTION public._person_from_declared(p jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.people (
        tax_id, document_country, document_type, document_number, first_name, last_name, birth_date, gender,
        nationality, residence_country, occupation, funds_origin, is_pep, pep_declared_at)
    VALUES (
        p ->> 'tax_id', p ->> 'document_country', p ->> 'document_type', p ->> 'document_number',
        p ->> 'first_name', p ->> 'last_name', (p ->> 'birth_date')::date, p ->> 'gender',
        p ->> 'nationality', p ->> 'residence_country', p ->> 'occupation', p ->> 'funds_origin',
        (p ->> 'is_pep')::boolean, CASE WHEN p ? 'is_pep' THEN now() END)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE FUNCTION public._submission_create(p_customer uuid, p_source text, p jsonb)
RETURNS public.person_submissions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_row public.person_submissions;
    v_candidate boolean;
BEGIN
    IF p ->> 'tax_id' IS NOT NULL AND NOT public.is_valid_cuit(p ->> 'tax_id') THEN
        RAISE EXCEPTION 'CUIT/CUIL invalido' USING errcode = '23514';
    END IF;
    IF coalesce(p ->> 'first_name', '') = '' OR coalesce(p ->> 'last_name', '') = ''
       OR (p ->> 'tax_id' IS NULL AND p ->> 'document_number' IS NULL) THEN
        RAISE EXCEPTION 'Faltan datos de la persona' USING errcode = '23514';
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.people x
         WHERE x.tax_id = p ->> 'tax_id'
            OR (x.document_country = p ->> 'document_country' AND x.document_type = p ->> 'document_type'
                AND x.document_number = p ->> 'document_number')
    ) INTO v_candidate;
    INSERT INTO public.person_submissions (submitted_by_customer_id, submitted_by_user, source, declared)
    VALUES (p_customer, auth.uid(), p_source, p)
    RETURNING * INTO v_row;
    -- Sin candidato se crea la persona, sin verificar. Con candidato decide un analista.
    IF NOT v_candidate THEN
        UPDATE public.person_submissions
           SET person_id = public._person_from_declared(p), status = 'applied',
               match_decision = 'new_person', decided_at = now()
         WHERE id = v_row.id
        RETURNING * INTO v_row;
    END IF;
    RETURN v_row;
END;
$$;

CREATE FUNCTION public._session_company_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    SELECT p.customer_id INTO v_id FROM public.company_profiles p WHERE p.customer_id = public._session_customer_id();
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Sin permiso para ejecutar esta operacion' USING errcode = '42501';
    END IF;
    RETURN v_id;
END;
$$;

-- Responde siempre lo mismo, exista o no la persona.
CREATE FUNCTION public.company_member_declare(p_declared jsonb, p_role text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_company uuid := public._session_company_id();
    v_sub public.person_submissions;
    v_id uuid;
BEGIN
    v_sub := public._submission_create(v_company, 'company_onboarding', p_declared);
    INSERT INTO public.company_members (company_id, submission_id, person_id, role, status)
    VALUES (v_company, v_sub.id, v_sub.person_id, p_role,
            CASE WHEN v_sub.person_id IS NULL THEN 'pending_identity' ELSE 'pending_review' END)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE FUNCTION public.beneficial_owner_declare(p_declared jsonb, p_control_type text, p_pct numeric, p_detail text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_company uuid := public._session_company_id();
    v_sub public.person_submissions;
    v_id uuid;
BEGIN
    v_sub := public._submission_create(v_company, 'company_onboarding', p_declared);
    INSERT INTO public.company_beneficial_owners (
        company_id, submission_id, person_id, control_type, ownership_pct, control_detail, status)
    VALUES (v_company, v_sub.id, v_sub.person_id, p_control_type, p_pct, p_detail,
            CASE WHEN v_sub.person_id IS NULL THEN 'pending_identity' ELSE 'pending_review' END)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- pending_identity y pending_review se muestran igual: distinguirlos revelaria que la persona ya existe.
CREATE FUNCTION public.my_company_members()
RETURNS TABLE (id uuid, role text, review_state text, declared jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT m.id, m.role,
           CASE WHEN m.status IN ('pending_identity', 'pending_review') THEN 'in_review' ELSE m.status END,
           s.declared
      FROM public.company_members m
      JOIN public.person_submissions s ON s.id = m.submission_id
     WHERE m.company_id = public._session_customer_id();
$$;

CREATE FUNCTION public.my_onboarding_application()
RETURNS TABLE (id uuid, process text, status text, documents_status text, submitted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT a.id, a.process, a.status, a.documents_status, a.submitted_at
      FROM public.onboarding_applications a
     WHERE a.customer_id = public._session_customer_id()
     ORDER BY a.created_at DESC LIMIT 1;
$$;

CREATE FUNCTION public.document_register(
    p_tipo text, p_submission uuid, p_path text, p_label text, p_mime text, p_size bigint, p_hash text, p_expires timestamptz)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer public.clientes;
    v_prev uuid;
    v_id uuid;
BEGIN
    SELECT * INTO v_customer FROM public.clientes WHERE id = public._session_customer_id();
    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION 'Sin permiso para ejecutar esta operacion' USING errcode = '42501';
    END IF;
    IF p_path NOT LIKE v_customer.legajo || '/%' THEN
        RAISE EXCEPTION 'Ruta de documento invalida' USING errcode = '42501';
    END IF;
    SELECT id INTO v_prev FROM public.documentos
     WHERE customer_id = v_customer.id AND tipo = p_tipo AND status <> 'superseded'
       AND submission_id IS NOT DISTINCT FROM p_submission;
    INSERT INTO public.documentos (
        cliente_legajo, customer_id, submission_id, tipo, url, label, mime_type, size_bytes, content_hash,
        uploaded_by, expires_at, supersedes_id)
    VALUES (
        v_customer.legajo, v_customer.id, p_submission, p_tipo, p_path, coalesce(p_label, ''), p_mime, p_size, p_hash,
        auth.uid(), p_expires, v_prev)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- Unica puerta de doc-url antes de firmar un enlace: dueno del documento o permiso de backoffice.
CREATE FUNCTION public.document_can_read(p_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.has_any_permission(ARRAY['customers.documents.read'])
        OR EXISTS (SELECT 1 FROM public.documentos d
                    WHERE d.url = p_path AND d.customer_id = public._session_customer_id());
$$;

CREATE FUNCTION public.application_submit()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer uuid := public._session_customer_id();
    v_id uuid;
BEGIN
    IF v_customer IS NULL THEN
        RAISE EXCEPTION 'Sin permiso para ejecutar esta operacion' USING errcode = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE customer_id = v_customer)
       AND NOT EXISTS (SELECT 1 FROM public.company_members m
                        WHERE m.company_id = v_customer AND m.role = 'legal_representative'
                          AND m.status IN ('pending_identity', 'pending_review', 'active')) THEN
        RAISE EXCEPTION 'Falta declarar un representante legal' USING errcode = '23514';
    END IF;
    UPDATE public.onboarding_applications
       SET status = 'submitted', submitted_at = now(), review_due_at = now() + interval '24 hours'
     WHERE customer_id = v_customer AND status IN ('draft', 'changes_requested')
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
        INSERT INTO public.onboarding_applications (customer_id, process, status, submitted_at, review_due_at)
        VALUES (v_customer, 'initial_onboarding', 'submitted', now(), now() + interval '24 hours')
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. Funciones del backoffice
-- ----------------------------------------------------------------------------
-- p_action: new_person | link_existing | apply_to_existing | reject
CREATE FUNCTION public.person_submission_resolve(p_submission uuid, p_action text, p_person uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_sub public.person_submissions;
    v_person uuid;
    v_was_pep boolean;
    v_is_pep boolean;
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    SELECT * INTO v_sub FROM public.person_submissions WHERE id = p_submission FOR UPDATE;
    IF v_sub.id IS NULL THEN
        RAISE EXCEPTION 'Declaracion inexistente';
    END IF;
    IF p_action = 'reject' THEN
        UPDATE public.person_submissions
           SET status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_reason = p_reason
         WHERE id = p_submission;
        UPDATE public.company_members SET status = 'rejected' WHERE submission_id = p_submission AND status <> 'rejected';
        UPDATE public.company_beneficial_owners SET status = 'rejected' WHERE submission_id = p_submission AND status <> 'rejected';
        RETURN;
    END IF;
    v_person := CASE WHEN p_action = 'new_person' THEN public._person_from_declared(v_sub.declared) ELSE p_person END;
    IF p_action = 'apply_to_existing' THEN
        SELECT is_pep INTO v_was_pep FROM public.people WHERE id = v_person FOR UPDATE;
        v_is_pep := (v_sub.declared ->> 'is_pep')::boolean;
        UPDATE public.people SET
            first_name = coalesce(v_sub.declared ->> 'first_name', first_name),
            last_name = coalesce(v_sub.declared ->> 'last_name', last_name),
            birth_date = coalesce((v_sub.declared ->> 'birth_date')::date, birth_date),
            gender = coalesce(v_sub.declared ->> 'gender', gender),
            nationality = coalesce(v_sub.declared ->> 'nationality', nationality),
            residence_country = coalesce(v_sub.declared ->> 'residence_country', residence_country),
            occupation = coalesce(v_sub.declared ->> 'occupation', occupation),
            funds_origin = coalesce(v_sub.declared ->> 'funds_origin', funds_origin),
            is_pep = coalesce(v_is_pep, is_pep),
            pep_declared_at = CASE WHEN v_is_pep IS NOT NULL THEN now() ELSE pep_declared_at END,
            updated_at = now()
         WHERE id = v_person;
        IF v_is_pep IS DISTINCT FROM v_was_pep AND v_is_pep IS NOT NULL THEN
            PERFORM public._compliance_open_cases(v_person, 'pep_changed', p_submission, 'normal');
        END IF;
    END IF;
    UPDATE public.person_submissions
       SET person_id = v_person,
           status = CASE WHEN p_action = 'link_existing' THEN 'linked' ELSE 'applied' END,
           match_decision = CASE WHEN p_action = 'new_person' THEN 'new_person' ELSE 'existing_person' END,
           decided_by = auth.uid(), decided_at = now(), decision_reason = p_reason
     WHERE id = p_submission;
    UPDATE public.company_members SET person_id = v_person, status = 'pending_review'
     WHERE submission_id = p_submission AND status = 'pending_identity';
    UPDATE public.company_beneficial_owners SET person_id = v_person, status = 'pending_review'
     WHERE submission_id = p_submission AND status = 'pending_identity';
    IF v_sub.source IN ('pf_onboarding', 'legacy_migration') THEN
        UPDATE public.clientes SET person_id = v_person
         WHERE id = v_sub.submitted_by_customer_id AND tipo_persona = 'fisica';
    END IF;
    PERFORM public.security_event_record_safe(p_action => 'kyc.submission_resolved', p_actor_type => 'staff', p_actor_id => auth.uid(),
        p_target_type => 'person_submission', p_target_id => p_submission::text, p_metadata => jsonb_build_object('detail', p_action));
END;
$$;

CREATE FUNCTION public.company_member_approve(p_member uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    UPDATE public.company_members
       SET status = 'active', approved_by = auth.uid(), approved_at = now(), started_at = current_date
     WHERE id = p_member AND status = 'pending_review';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La relacion no esta pendiente de revision';
    END IF;
END;
$$;

CREATE FUNCTION public.beneficial_owner_approve(p_owner uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    UPDATE public.company_beneficial_owners
       SET status = 'active', approved_by = auth.uid(), approved_at = now(), started_at = current_date
     WHERE id = p_owner AND status = 'pending_review';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La relacion no esta pendiente de revision';
    END IF;
END;
$$;

-- Si la empresa queda sin representante legal se abre un caso; la cuenta no cambia sola.
CREATE FUNCTION public.company_member_end(p_member uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_row public.company_members;
BEGIN
    SELECT * INTO v_row FROM public.company_members WHERE id = p_member FOR UPDATE;
    IF v_row.id IS NULL OR NOT (
        public.has_any_permission(ARRAY['customers.kyc.review']) OR v_row.company_id = public._session_customer_id()
    ) THEN
        RAISE EXCEPTION 'Sin permiso para ejecutar esta operacion' USING errcode = '42501';
    END IF;
    UPDATE public.company_members SET status = 'ended', ended_at = current_date WHERE id = p_member;
    IF v_row.role = 'legal_representative' AND NOT EXISTS (
        SELECT 1 FROM public.company_members m
         WHERE m.company_id = v_row.company_id AND m.role = 'legal_representative' AND m.status = 'active'
    ) THEN
        INSERT INTO public.compliance_cases (customer_id, person_id, trigger_kind, source_id, priority)
        VALUES (v_row.company_id, v_row.person_id, 'no_legal_representative', p_member, 'critical')
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

CREATE FUNCTION public.document_review(p_document uuid, p_decision text, p_reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    INSERT INTO public.document_reviews (document_id, decision, internal_reason, reviewed_by)
    VALUES (p_document, p_decision, p_reason, auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE FUNCTION public.identity_verification_record(
    p_person uuid, p_customer uuid, p_check text, p_status text, p_evidence uuid, p_expires timestamptz)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    INSERT INTO public.identity_verifications (
        person_id, customer_id, check_type, method, status, evidence_document_id, performed_by, expires_at)
    VALUES (p_person, p_customer, p_check, 'manual', p_status, p_evidence, auth.uid(), p_expires)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE FUNCTION public.compliance_screening_record(
    p_person uuid, p_customer uuid, p_list text, p_version text, p_status text, p_match jsonb, p_resolves uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    PERFORM public._require_permission('customers.compliance.review');
    INSERT INTO public.compliance_screenings (person_id, customer_id, list_name, list_version, status, matched_entry, resolves_id, run_by)
    VALUES (p_person, p_customer, p_list, p_version, p_status, p_match, p_resolves, auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- La decision sobre la cuenta es siempre explicita, con responsable y motivo.
CREATE FUNCTION public.compliance_case_resolve(p_case uuid, p_decision text, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_case public.compliance_cases;
BEGIN
    PERFORM public._require_permission('customers.compliance.review');
    SELECT * INTO v_case FROM public.compliance_cases WHERE id = p_case FOR UPDATE;
    IF v_case.id IS NULL OR v_case.status <> 'open' THEN
        RAISE EXCEPTION 'El caso no esta abierto';
    END IF;
    UPDATE public.compliance_cases
       SET status = 'resolved', decision = p_decision, decision_reason = p_reason, decided_by = auth.uid(), decided_at = now()
     WHERE id = p_case;
    IF p_decision = 'restrict_operations' THEN
        INSERT INTO public.account_blocks (client_id, scope, origin, reason, blocked_by)
        VALUES (v_case.customer_id, 'client', 'manual', p_reason, auth.uid());
    ELSIF p_decision = 'suspend_account' THEN
        UPDATE public.clientes SET estado = 'suspendido' WHERE id = v_case.customer_id;
    ELSIF p_decision = 'close_account' THEN
        UPDATE public.clientes SET estado = 'deshabilitado' WHERE id = v_case.customer_id;
    ELSIF p_decision = 'new_review' THEN
        INSERT INTO public.onboarding_applications (customer_id, process)
        VALUES (v_case.customer_id, 'periodic_review')
        ON CONFLICT DO NOTHING;
    END IF;
    PERFORM public.security_event_record_safe(p_action => 'kyc.case_resolved', p_actor_type => 'staff', p_actor_id => auth.uid(),
        p_target_type => 'compliance_case', p_target_id => p_case::text, p_metadata => jsonb_build_object('detail', p_decision));
END;
$$;

-- Lo que falta para aprobar una solicitud. Vacio = se puede aprobar.
CREATE FUNCTION public._application_blockers(p_application uuid)
RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_app public.onboarding_applications;
    v_kind text;
    v_person uuid;
    v_out text[] := '{}';
BEGIN
    SELECT * INTO v_app FROM public.onboarding_applications WHERE id = p_application;
    SELECT tipo_persona, person_id INTO v_kind, v_person FROM public.clientes WHERE id = v_app.customer_id;
    IF v_kind = 'fisica' AND v_person IS NULL THEN
        v_out := array_append(v_out, 'person_not_linked');
    END IF;
    IF v_kind = 'juridica' THEN
        IF NOT EXISTS (SELECT 1 FROM public.company_profiles p WHERE p.customer_id = v_app.customer_id
                        AND p.company_type IS NOT NULL AND p.registration_date IS NOT NULL) THEN
            v_out := array_append(v_out, 'company_profile_incomplete');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = v_app.customer_id
                        AND m.role = 'legal_representative' AND m.status = 'active') THEN
            v_out := array_append(v_out, 'no_active_legal_representative');
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.document_requirements r
         WHERE r.process = v_app.process AND r.customer_kind = v_kind AND r.is_required
           AND r.subject_kind = 'company' AND current_date <@ daterange(r.valid_from, r.valid_to, '[]')
           AND NOT EXISTS (SELECT 1 FROM public.documentos d WHERE d.customer_id = v_app.customer_id
                            AND d.tipo = r.document_type AND d.submission_id IS NULL AND d.status = 'approved')
    ) THEN
        v_out := array_append(v_out, 'company_documents_missing');
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.document_requirements r
          JOIN public.company_members m ON m.company_id = v_app.customer_id AND m.status = 'active'
               AND (r.member_role IS NULL OR r.member_role = m.role)
         WHERE r.process = v_app.process AND r.customer_kind = v_kind AND r.is_required
           AND r.subject_kind = 'person' AND current_date <@ daterange(r.valid_from, r.valid_to, '[]')
           AND NOT EXISTS (SELECT 1 FROM public.documentos d WHERE d.submission_id = m.submission_id
                            AND d.tipo = r.document_type AND d.status = 'approved')
    ) THEN
        v_out := array_append(v_out, 'person_documents_missing');
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.people x
         WHERE x.id = v_person
            OR x.id IN (SELECT person_id FROM public.company_members WHERE company_id = v_app.customer_id AND status = 'active')
            OR x.id IN (SELECT person_id FROM public.company_beneficial_owners WHERE company_id = v_app.customer_id AND status = 'active')
        HAVING bool_or(x.kyc_status <> 'passed')
    ) THEN
        v_out := array_append(v_out, 'kyc_not_passed');
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.people x
         WHERE x.id = v_person
            OR x.id IN (SELECT person_id FROM public.company_members WHERE company_id = v_app.customer_id AND status = 'active')
            OR x.id IN (SELECT person_id FROM public.company_beneficial_owners WHERE company_id = v_app.customer_id AND status = 'active')
        HAVING bool_or(x.compliance_status <> 'clear')
    ) THEN
        v_out := array_append(v_out, 'compliance_not_clear');
    END IF;
    IF EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = v_app.customer_id
                AND m.status IN ('pending_identity', 'pending_review'))
       OR EXISTS (SELECT 1 FROM public.company_beneficial_owners b WHERE b.company_id = v_app.customer_id
                   AND b.status IN ('pending_identity', 'pending_review')) THEN
        v_out := array_append(v_out, 'relationships_pending');
    END IF;
    RETURN v_out;
END;
$$;

CREATE FUNCTION public.application_start_review(p_application uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    UPDATE public.onboarding_applications SET status = 'in_review' WHERE id = p_application;
END;
$$;

CREATE FUNCTION public.application_decide(p_application uuid, p_decision text, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_blockers text[];
BEGIN
    PERFORM public._require_permission('customers.kyc.review');
    IF p_decision NOT IN ('approved', 'rejected', 'changes_requested') THEN
        RAISE EXCEPTION 'Decision invalida';
    END IF;
    IF p_decision = 'approved' THEN
        v_blockers := public._application_blockers(p_application);
        IF cardinality(v_blockers) > 0 THEN
            RAISE EXCEPTION 'La solicitud no se puede aprobar: %', array_to_string(v_blockers, ', ') USING errcode = '23514';
        END IF;
    END IF;
    UPDATE public.onboarding_applications
       SET status = p_decision, internal_reason = p_reason,
           documents_status = CASE WHEN p_decision = 'approved' THEN 'approved' ELSE documents_status END,
           kyc_status = CASE WHEN p_decision = 'approved' THEN 'passed' ELSE kyc_status END,
           compliance_status = CASE WHEN p_decision = 'approved' THEN 'clear' ELSE compliance_status END,
           decided_by = CASE WHEN p_decision = 'changes_requested' THEN NULL ELSE auth.uid() END,
           decided_at = CASE WHEN p_decision = 'changes_requested' THEN NULL ELSE now() END
     WHERE id = p_application AND status = 'in_review';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La solicitud no esta en revision';
    END IF;
    PERFORM public.security_event_record_safe(p_action => 'kyc.application_decided', p_actor_type => 'staff', p_actor_id => auth.uid(),
        p_target_type => 'onboarding_application', p_target_id => p_application::text, p_metadata => jsonb_build_object('detail', p_decision));
END;
$$;

-- Tarea programada: vence documentos y abre un caso. La cuenta no cambia sola.
CREATE FUNCTION public.documents_expire()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer;
BEGIN
    WITH expired AS (
        UPDATE public.documentos SET status = 'expired'
         WHERE status = 'approved' AND expires_at <= now()
        RETURNING id, customer_id
    ), cases AS (
        INSERT INTO public.compliance_cases (customer_id, trigger_kind, source_id)
        SELECT DISTINCT ON (customer_id) customer_id, 'document_expired', id FROM expired
        ON CONFLICT DO NOTHING
    )
    SELECT count(*) INTO v_count FROM expired;
    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. Reportes
-- ----------------------------------------------------------------------------
CREATE TABLE public.report_code_mappings (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type    text NOT NULL,
    format_version text NOT NULL,
    field          text NOT NULL,
    internal_value text NOT NULL,
    official_code  text NOT NULL,
    valid_from     date NOT NULL,
    valid_to       date,
    CONSTRAINT report_code_mappings_dates_check CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CONSTRAINT report_code_mappings_no_overlap EXCLUDE USING gist (
        report_type WITH =, format_version WITH =, field WITH =, internal_value WITH =,
        daterange(valid_from, valid_to, '[]') WITH &&)
);

CREATE TABLE public.regulatory_report_runs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type       text NOT NULL CHECK (report_type IN ('F8125', 'F8126')),
    period            date NOT NULL,
    format_version    text NOT NULL,
    version           integer NOT NULL CHECK (version > 0),
    status            text NOT NULL CHECK (status IN ('generated', 'validation_failed', 'filed', 'superseded')),
    input_snapshot    jsonb NOT NULL,
    validation_result jsonb NOT NULL,
    file_path         text,
    content_hash      text,
    generated_by      uuid,
    generated_at      timestamptz NOT NULL DEFAULT now(),
    filed_at          timestamptz,
    filed_by          uuid,
    CONSTRAINT regulatory_report_runs_version_key UNIQUE (report_type, period, version),
    CONSTRAINT regulatory_report_runs_filed_check CHECK ((status = 'filed') = (filed_at IS NOT NULL))
);

-- Solo cambia el estado de presentacion; lo generado queda fijo.
CREATE FUNCTION public.tg_report_runs_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR NEW.input_snapshot IS DISTINCT FROM OLD.input_snapshot
       OR NEW.validation_result IS DISTINCT FROM OLD.validation_result
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.file_path IS DISTINCT FROM OLD.file_path THEN
        RAISE EXCEPTION 'Un reporte generado no se altera: se genera otra version' USING errcode = '42501';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER report_runs_guard BEFORE UPDATE OR DELETE ON public.regulatory_report_runs
    FOR EACH ROW EXECUTE FUNCTION public.tg_report_runs_guard();

-- Integrantes vigentes a una fecha, nunca los activos de hoy.
CREATE FUNCTION public.report_company_members_at(p_date date)
RETURNS TABLE (
    company_tax_id text, company_legajo text, role text, tax_id text, document_type text,
    document_number text, last_name text, first_name text, nationality char(2))
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT c.cuit, c.legajo, m.role, x.tax_id, x.document_type, x.document_number, x.last_name, x.first_name, x.nationality
      FROM public.company_members m
      JOIN public.clientes c ON c.id = m.company_id
      JOIN public.people x ON x.id = m.person_id
     WHERE m.status IN ('active', 'ended')
       AND m.started_at <= p_date
       AND (m.ended_at IS NULL OR m.ended_at >= p_date);
$$;

CREATE FUNCTION public.regulatory_report_run_record(
    p_type text, p_period date, p_format text, p_snapshot jsonb, p_validation jsonb, p_path text, p_hash text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_version integer;
    v_id uuid;
BEGIN
    PERFORM public._require_permission('reports.afip.generate');
    PERFORM pg_advisory_xact_lock(hashtext(p_type || p_period::text));
    SELECT coalesce(max(version), 0) + 1 INTO v_version
      FROM public.regulatory_report_runs WHERE report_type = p_type AND period = p_period;
    UPDATE public.regulatory_report_runs SET status = 'superseded'
     WHERE report_type = p_type AND period = p_period AND status = 'generated';
    INSERT INTO public.regulatory_report_runs (
        report_type, period, format_version, version, status, input_snapshot, validation_result, file_path, content_hash, generated_by)
    VALUES (
        p_type, p_period, p_format, v_version,
        CASE WHEN jsonb_array_length(coalesce(p_validation -> 'errors', '[]')) > 0 THEN 'validation_failed' ELSE 'generated' END,
        p_snapshot, p_validation, p_path, p_hash, auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. Permisos
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (code, module_code, name, description, is_sensitive, sort_order) VALUES
    ('customers.kyc.review', 'customers', 'Revisar KYC', 'Vincular personas y revisar documentos y solicitudes.', true, 200),
    ('customers.compliance.review', 'customers', 'Revisar compliance', 'Registrar controles y decidir casos.', true, 210),
    ('reports.afip.generate', 'reports', 'Generar reportes AFIP', 'Generar F.8125 y F.8126.', true, 220);

INSERT INTO public.security_event_types (action, category, label, description, default_severity, customer_visible, is_enabled) VALUES
    ('kyc.auth_linked', 'access', 'Usuario vinculado a una cuenta', 'Vinculacion manual de un usuario con una cuenta.', 'medium', false, true),
    ('kyc.submission_resolved', 'access', 'Declaracion resuelta', 'Vinculacion o rechazo de una declaracion de persona.', 'medium', false, true),
    ('kyc.case_resolved', 'access', 'Caso de compliance resuelto', 'Decision sobre una cuenta por un caso de compliance.', 'high', false, true),
    ('kyc.application_decided', 'access', 'Solicitud decidida', 'Aprobacion o rechazo de una solicitud de onboarding.', 'medium', false, true);

-- Tablas nuevas: el cliente no tiene acceso directo. Solo lee y escribe por funciones.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'people', 'person_submissions', 'company_profiles', 'company_members', 'company_beneficial_owners',
        'onboarding_applications', 'document_reviews', 'document_requirements', 'identity_verifications',
        'compliance_screenings', 'compliance_cases', 'report_code_mappings', 'regulatory_report_runs'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', t);
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated, service_role', t);
    END LOOP;
END;
$$;

-- El dueno de la tabla no pasa por RLS: las funciones SECURITY DEFINER escriben; el resto solo lee.
CREATE POLICY people_backoffice_read ON public.people FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read', 'reports.read']));
CREATE POLICY person_submissions_backoffice_read ON public.person_submissions FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read']));
CREATE POLICY company_profiles_backoffice_read ON public.company_profiles FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read', 'reports.read']));
CREATE POLICY company_members_backoffice_read ON public.company_members FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read', 'reports.read']));
CREATE POLICY beneficial_owners_backoffice_read ON public.company_beneficial_owners FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read', 'reports.read']));
CREATE POLICY onboarding_backoffice_read ON public.onboarding_applications FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.read']));
CREATE POLICY document_reviews_backoffice_read ON public.document_reviews FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.documents.read']));
CREATE POLICY document_requirements_read ON public.document_requirements FOR SELECT TO authenticated, service_role
    USING (true);
CREATE POLICY identity_verifications_backoffice_read ON public.identity_verifications FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.kyc.review', 'customers.compliance.review']));
CREATE POLICY compliance_screenings_backoffice_read ON public.compliance_screenings FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.kyc.review', 'customers.compliance.review']));
CREATE POLICY compliance_cases_backoffice_read ON public.compliance_cases FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['customers.compliance.review']));
CREATE POLICY report_code_mappings_read ON public.report_code_mappings FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['reports.read']));
CREATE POLICY report_runs_read ON public.regulatory_report_runs FOR SELECT TO authenticated, service_role
    USING (public.has_any_permission(ARRAY['reports.read']));

-- Tablas existentes: el cliente lee lo suyo y deja de escribir.
DROP POLICY documentos_own_or_admin ON public.documentos;
CREATE POLICY documentos_read ON public.documentos FOR SELECT TO authenticated
    USING (public.is_admin() OR public.has_any_permission(ARRAY['customers.documents.read'])
           OR cliente_legajo = public.legajo_de_sesion());
CREATE POLICY documentos_admin_insert ON public.documentos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY documentos_admin_update ON public.documentos FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY validaciones_own_or_admin ON public.validaciones;
CREATE POLICY validaciones_read ON public.validaciones FOR SELECT TO authenticated
    USING (public.is_admin() OR cliente_legajo = public.legajo_de_sesion());
CREATE POLICY validaciones_admin_write ON public.validaciones FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Storage: nadie lee archivos KYC de otros. El cliente entra por doc-url, que firma tras document_can_read.
DROP POLICY kyc_select_authenticated ON storage.objects;
DROP POLICY "Admins leen kyc" ON storage.objects;
CREATE POLICY kyc_backoffice_read ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'kyc' AND public.has_any_permission(ARRAY['customers.documents.read']));

-- Funciones: nada se ejecuta por defecto.
DO $$
DECLARE
    f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = ANY (ARRAY[
            '_session_customer_id', '_session_company_id', '_require_permission', '_compliance_open_cases',
            '_person_refresh_kyc', '_person_from_declared', '_submission_create', '_application_blockers',
            'auth_link_backfill', 'auth_link_review', 'company_member_declare', 'beneficial_owner_declare',
            'my_company_members', 'my_onboarding_application', 'document_register', 'document_can_read',
            'application_submit', 'person_submission_resolve', 'company_member_approve', 'beneficial_owner_approve',
            'company_member_end', 'document_review', 'identity_verification_record', 'compliance_screening_record',
            'compliance_case_resolve', 'application_start_review', 'application_decide', 'documents_expire',
            'report_company_members_at', 'regulatory_report_run_record', 'is_valid_cuit'])
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION
    public.company_member_declare(jsonb, text),
    public.beneficial_owner_declare(jsonb, text, numeric, text),
    public.my_company_members(),
    public.my_onboarding_application(),
    public.document_register(text, uuid, text, text, text, bigint, text, timestamptz),
    public.document_can_read(text),
    public.application_submit(),
    public.company_member_end(uuid),
    public.auth_link_review(uuid, uuid, text),
    public.person_submission_resolve(uuid, text, uuid, text),
    public.company_member_approve(uuid),
    public.beneficial_owner_approve(uuid),
    public.document_review(uuid, text, text),
    public.identity_verification_record(uuid, uuid, text, text, uuid, timestamptz),
    public.compliance_screening_record(uuid, uuid, text, text, text, jsonb, uuid),
    public.compliance_case_resolve(uuid, text, text),
    public.application_start_review(uuid),
    public.application_decide(uuid, text, text),
    public.report_company_members_at(date),
    public.regulatory_report_run_record(text, date, text, jsonb, jsonb, text, text)
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_link_backfill(), public.documents_expire() TO service_role;
GRANT SELECT ON public.v_auth_link_candidates TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- 15. Se aplica recien en el paso 6 de la migracion, cuando crear-cliente y el
--     backoffice ya cargan submission_id. Los datos viejos siguen sin validar.
-- ----------------------------------------------------------------------------
ALTER TABLE public.documentos ADD CONSTRAINT documentos_subject_check CHECK (
    (tipo IN ('id_frente', 'id_dorso', 'servicio', 'selfie', 'poder') AND submission_id IS NOT NULL)
    OR (tipo IN ('estatuto', 'acta_autoridades', 'constancia_afip') AND submission_id IS NULL)
) NOT VALID;
