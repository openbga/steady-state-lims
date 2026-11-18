-- Every placed row of an import attempt and what happened to it (REQ-ANA-003):
-- a new patient measurement, one kept outside the ordered scope (F17), a
-- repeat of the stored value, a correction, a QC observation or a quarantined
-- row. Text is kept exactly as received; nothing is converted or interpreted.
-- Rows not read as results (F10) and rows set aside (F9, F17) are counted on
-- the attempt and set-aside rows are listed in `res_set_aside_rows`, so they
-- are not repeated here. Attempts imported before this migration have no rows
-- recorded; their counts remain on `res_import_attempts`.

CREATE TABLE res_import_rows (
    import_attempt_id TEXT    NOT NULL REFERENCES res_import_attempts (id),
    row_no            INTEGER NOT NULL CHECK (row_no >= 1),
    record_path       TEXT    NOT NULL,
    sample_label      TEXT,
    source_test_code  TEXT,
    analyte_id        TEXT    REFERENCES cat_analytes (id),
    value_text        TEXT,
    units_text        TEXT,
    position_id       TEXT    REFERENCES ana_run_positions (id),
    outcome           TEXT    NOT NULL CHECK (outcome IN
                         ('new', 'retained', 'duplicate', 'reprocessed', 'qc', 'quarantined')),
    PRIMARY KEY (import_attempt_id, row_no)
) STRICT;

CREATE TRIGGER res_import_rows_no_update BEFORE UPDATE ON res_import_rows
BEGIN SELECT RAISE(ABORT, 'import rows are append-only'); END;
CREATE TRIGGER res_import_rows_no_delete BEFORE DELETE ON res_import_rows
BEGIN SELECT RAISE(ABORT, 'import rows are append-only'); END;
