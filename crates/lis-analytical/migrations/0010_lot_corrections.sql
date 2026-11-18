-- Lot corrections (REQ-ANA-007, #4558). A correction keeps the lot's ID and
-- material and records the corrected product, lot number, level, sample label
-- and expiry date as a new revision with a reason in an immutable history.
-- Lots could not change before this migration, so each existing lot's values
-- are its registration values, recorded by the user who registered it.
CREATE TABLE ana_lot_history (
    lot_id       TEXT    NOT NULL REFERENCES ana_lots (id),
    revision     INTEGER NOT NULL CHECK (revision >= 1),
    product_name TEXT    NOT NULL,
    lot_number   TEXT    NOT NULL,
    level_text   TEXT,
    sample_label TEXT,
    expires_on   TEXT    NOT NULL
        CHECK (expires_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    recorded_at  TEXT    NOT NULL,
    recorded_by  TEXT    NOT NULL,
    reason       TEXT,
    origin       TEXT    NOT NULL CHECK (origin IN ('registered', 'corrected')),
    PRIMARY KEY (lot_id, revision),
    CHECK ((origin = 'corrected') = (reason IS NOT NULL))
) STRICT;

CREATE TRIGGER ana_lot_history_no_update BEFORE UPDATE ON ana_lot_history
BEGIN SELECT RAISE(ABORT, 'lot history is immutable'); END;
CREATE TRIGGER ana_lot_history_no_delete BEFORE DELETE ON ana_lot_history
BEGIN SELECT RAISE(ABORT, 'lot history is retained'); END;

INSERT INTO ana_lot_history (lot_id, revision, product_name, lot_number, level_text,
    sample_label, expires_on, recorded_at, recorded_by, origin)
SELECT id, 1, product_name, lot_number, level_text, sample_label, expires_on, recorded_at,
    recorded_by, 'registered'
FROM ana_lots;

-- An active lot is either withdrawn, keeping its values, or corrected, with the
-- history row of the new revision holding exactly the new values. The ID,
-- material and registration never change, and a withdrawn lot never changes.
DROP TRIGGER ana_lots_withdraw_only;

CREATE TRIGGER ana_lots_versioned BEFORE UPDATE ON ana_lots
WHEN NEW.id IS NOT OLD.id OR NEW.material_kind IS NOT OLD.material_kind
  OR NEW.recorded_by IS NOT OLD.recorded_by OR NEW.recorded_at IS NOT OLD.recorded_at
  OR NEW.revision IS NOT OLD.revision + 1 OR OLD.state <> 'active'
  OR (NEW.state = 'withdrawn' AND (NEW.product_name IS NOT OLD.product_name
    OR NEW.lot_number IS NOT OLD.lot_number OR NEW.level_text IS NOT OLD.level_text
    OR NEW.sample_label IS NOT OLD.sample_label OR NEW.expires_on IS NOT OLD.expires_on))
  OR (NEW.state = 'active' AND NOT EXISTS (
    SELECT 1 FROM ana_lot_history h WHERE h.lot_id = NEW.id AND h.revision = NEW.revision
      AND h.origin = 'corrected' AND h.product_name = NEW.product_name
      AND h.lot_number = NEW.lot_number AND h.level_text IS NEW.level_text
      AND h.sample_label IS NEW.sample_label AND h.expires_on = NEW.expires_on
  ))
BEGIN SELECT RAISE(ABORT, 'a lot is only withdrawn, or corrected with matching history'); END;
