-- One-time operator maintenance, never automatic startup behavior.
-- Take and verify a full database backup before running with psql -v ON_ERROR_STOP=1.
-- Rebuilds only public.Student. Unsupported metadata fails closed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_catalog;
-- Same DMSTART key as Core StartupDatabaseCoordinator.
SELECT pg_advisory_xact_lock(19225318707515988);
DO $repair$
DECLARE
    source_oid oid := 'public."Student"'::regclass;
    source_owner text;
    columns_sql text;
    lock_sql text;
    constraints_json jsonb;
    references_json jsonb;
    indexes_json jsonb;
    table_comment text;
    record_json jsonb;
    before_count bigint;
    after_count bigint;
    slots_before integer;
BEGIN
    -- Reserve all affected tables before inspecting/copying data or metadata.
    SELECT string_agg(name, ', ' ORDER BY name) INTO lock_sql FROM (
        SELECT 'public."Student"' AS name
        UNION
        SELECT conrelid::regclass::text FROM pg_constraint
        WHERE confrelid = source_oid AND conrelid <> source_oid
    ) targets;
    EXECUTE 'LOCK TABLE ' || lock_sql || ' IN ACCESS EXCLUSIVE MODE';
    SELECT pg_get_userbyid(relowner), relnatts INTO source_owner, slots_before
    FROM pg_class WHERE oid = source_oid;
    IF slots_before < 1500 THEN
        RAISE EXCEPTION 'Student does not require column-slot maintenance';
    END IF;
    IF source_owner <> current_user OR EXISTS (
        SELECT FROM pg_class WHERE oid = source_oid AND
        (relkind <> 'r' OR relpersistence <> 'p' OR relrowsecurity OR relforcerowsecurity
         OR relreplident <> 'd' OR reloptions IS NOT NULL OR relacl IS NOT NULL
         OR relispartition OR reloftype <> 0)
    ) OR EXISTS (SELECT FROM pg_inherits WHERE inhrelid = source_oid OR inhparent = source_oid)
      OR EXISTS (SELECT FROM pg_trigger WHERE tgrelid = source_oid AND NOT tgisinternal)
      OR EXISTS (SELECT FROM pg_policy WHERE polrelid = source_oid)
      OR EXISTS (SELECT FROM pg_publication_rel WHERE prrelid = source_oid)
      OR EXISTS (SELECT FROM pg_publication WHERE puballtables)
      OR EXISTS (SELECT FROM pg_statistic_ext WHERE stxrelid = source_oid)
      OR EXISTS (SELECT FROM pg_seclabel WHERE classoid = 'pg_class'::regclass AND objoid = source_oid)
      OR EXISTS (SELECT FROM pg_description WHERE
          (classoid = 'pg_constraint'::regclass AND objoid IN
              (SELECT oid FROM pg_constraint WHERE conrelid = source_oid OR confrelid = source_oid))
          OR (classoid = 'pg_class'::regclass AND objoid IN
              (SELECT indexrelid FROM pg_index WHERE indrelid = source_oid)))
      OR EXISTS (SELECT FROM pg_attribute WHERE attrelid = source_oid AND attnum > 0
          AND NOT attisdropped AND (attidentity <> '' OR attgenerated <> ''
              OR attstattarget <> -1 OR attacl IS NOT NULL OR attoptions IS NOT NULL))
      OR EXISTS (SELECT FROM pg_index WHERE indrelid = source_oid
          AND (NOT indisvalid OR NOT indisready OR indisclustered OR indisreplident))
      OR EXISTS (SELECT FROM pg_constraint WHERE conrelid = source_oid
          AND contype NOT IN ('p','u','f','c'))
      OR EXISTS (SELECT FROM pg_depend WHERE refclassid = 'pg_class'::regclass
          AND refobjid = source_oid AND deptype = 'n'
          AND NOT (classid = 'pg_constraint'::regclass AND objid IN (
              SELECT oid FROM pg_constraint WHERE confrelid = source_oid AND contype = 'f')))
    THEN
        RAISE EXCEPTION 'Unsupported Student ownership/dependencies/metadata; manual review required';
    END IF;
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO columns_sql
    FROM pg_attribute WHERE attrelid = source_oid AND attnum > 0 AND NOT attisdropped;
    SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)))
    INTO constraints_json FROM pg_constraint WHERE conrelid = source_oid AND contype IN ('p','u','f');
    SELECT jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,
        'definition',pg_get_constraintdef(oid))) INTO references_json
    FROM pg_constraint WHERE confrelid = source_oid AND conrelid <> source_oid AND contype = 'f';
    SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(indexrelid))) INTO indexes_json
    FROM pg_index WHERE indrelid = source_oid AND NOT EXISTS (
        SELECT FROM pg_constraint WHERE conindid = indexrelid AND conrelid = source_oid);
    SELECT obj_description(source_oid, 'pg_class') INTO table_comment;
    SELECT count(*) INTO before_count FROM public."Student";
    CREATE TABLE public."__dm_student_compact" (LIKE public."Student" INCLUDING ALL EXCLUDING INDEXES);
    IF (SELECT relacl IS NOT NULL FROM pg_class WHERE oid='public."__dm_student_compact"'::regclass) THEN
        RAISE EXCEPTION 'Default privileges would change Student grants; manual review required';
    END IF;
    EXECUTE 'INSERT INTO public."__dm_student_compact" (' || columns_sql || ') SELECT '
        || columns_sql || ' FROM public."Student"';
    SELECT count(*) INTO after_count FROM public."__dm_student_compact";
    IF before_count <> after_count OR EXISTS (
        (SELECT to_jsonb(t) FROM public."Student" t EXCEPT ALL
         SELECT to_jsonb(t) FROM public."__dm_student_compact" t)
        UNION ALL
        (SELECT to_jsonb(t) FROM public."__dm_student_compact" t EXCEPT ALL
         SELECT to_jsonb(t) FROM public."Student" t)
    ) THEN
        RAISE EXCEPTION 'Student copy differs; repair rolled back';
    END IF;
    FOR record_json IN SELECT value FROM jsonb_array_elements(references_json) LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',record_json->>'table',record_json->>'name');
    END LOOP;
    -- RESTRICT deliberately rejects any dependency not captured above.
    DROP TABLE public."Student" RESTRICT;
    ALTER TABLE public."__dm_student_compact" RENAME TO "Student";
    FOR record_json IN SELECT value FROM jsonb_array_elements(constraints_json) LOOP
        EXECUTE format('ALTER TABLE public."Student" ADD CONSTRAINT %I %s',record_json->>'name',record_json->>'definition');
    END LOOP;
    FOR record_json IN SELECT value FROM jsonb_array_elements(indexes_json) LOOP
        EXECUTE record_json->>'definition';
    END LOOP;
    FOR record_json IN SELECT value FROM jsonb_array_elements(references_json) LOOP
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',record_json->>'table',record_json->>'name',record_json->>'definition');
    END LOOP;
    EXECUTE format('COMMENT ON TABLE public."Student" IS %L',table_comment);
    RAISE NOTICE 'Student rebuilt: % rows preserved, % physical slots before, % after',
        before_count, slots_before, (SELECT relnatts FROM pg_class WHERE oid='public."Student"'::regclass);
END $repair$;
ANALYZE public."Student";
COMMIT;
