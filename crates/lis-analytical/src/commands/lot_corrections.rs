//! Lot corrections (REQ-ANA-007, #4558). A correction keeps the lot's ID and
//! material and adds a revision with a reason to its immutable history. Runs
//! keep the values in effect when they were created and QC positions keep the
//! sample label they copied; new runs, positions and imports use the corrected
//! values. A wrong material is fixed by withdrawing the lot and registering a new one.

use lis_core::Capability;
use lis_store::CommandContext;
use serde::Deserialize;
use ts_rs::TS;

use super::lots::sample_label;
use super::{CODE_MAX, NAME_MAX, actor, clinical, reason};
use crate::actions;
use crate::error::{AnalyticalError, ensure_revision, invalid};
use crate::model::{CivilDate, LotId, LotState};
use crate::queries;
use crate::repo::lot_history::{self as repo, LotFacts, NewRevision};
use crate::repo::lots::{self, LotRow};
use crate::views::LotView;

/// Input of [`correct_lot`]: the complete corrected values.
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
#[ts(export)]
pub struct CorrectLotInput {
    /// The lot; its ID and material never change.
    pub lot_id: LotId,
    /// The revision shown.
    #[ts(type = "number")]
    pub expected_revision: i64,
    /// The product name.
    pub product_name: String,
    /// The manufacturer's lot number.
    pub lot_number: String,
    /// The level, as labelled.
    #[serde(default)]
    #[ts(optional)]
    pub level_text: Option<String>,
    /// The sample label; required for controls and calibrators and refused for others.
    #[serde(default)]
    #[ts(optional)]
    pub sample_label: Option<String>,
    /// The last day of use, `YYYY-MM-DD`.
    pub expires_on: String,
    /// Why, as entered.
    pub reason: String,
}

/// Corrects an active lot as a new revision with a reason (#4558). Refuses an
/// unchanged lot, a product and lot number another lot of the material has,
/// and a sample label another active lot uses.
pub fn correct_lot(
    ctx: &mut CommandContext<'_>,
    input: CorrectLotInput,
) -> Result<LotView, AnalyticalError> {
    ctx.require(Capability::ManageQuality)?;
    let lot = lots::lot(ctx.tx(), input.lot_id)?.ok_or(AnalyticalError::NotFound("lot"))?;
    ensure_revision(lot.revision, input.expected_revision)?;
    if lot.state != LotState::Active {
        return Err(AnalyticalError::WrongState("lot"));
    }
    let product_name = lis_core::required_text("productName", &input.product_name, NAME_MAX)?;
    let lot_number = lis_core::required_text("lotNumber", &input.lot_number, CODE_MAX)?;
    let level_text = lis_core::optional_text("levelText", input.level_text.as_deref(), CODE_MAX)?;
    let sample_label = sample_label(lot.material_kind, input.sample_label.as_deref())?;
    let expires_on = CivilDate::parse("expiresOn", &input.expires_on)?;
    let facts = LotFacts {
        product_name: &product_name,
        lot_number: &lot_number,
        level_text: level_text.as_deref(),
        sample_label: sample_label.as_deref(),
        expires_on,
    };
    if unchanged(&lot, &facts) {
        return Err(invalid(
            "lot",
            "unchanged",
            "Change at least one value before saving.",
        ));
    }
    let reason = reason(&input.reason)?;
    check_unique(ctx, &lot, &facts)?;
    let revision = lot.revision + 1;
    let by = actor(ctx);
    repo::insert_revision(
        ctx.tx(),
        &NewRevision {
            lot_id: lot.id,
            revision,
            facts,
            by: &by,
            at: ctx.now(),
            reason: Some(&reason),
        },
    )?;
    repo::correct_lot(ctx.tx(), lot.id, revision, &facts)?;
    ctx.audit(
        clinical(actions::CORRECT_LOT)
            .record("lot", lot.id)
            .old_revision(lot.revision)
            .new_revision(revision)
            .reason(reason),
    )?;
    queries::lot_view(ctx.tx(), lot.id, ctx.now())
}

fn unchanged(lot: &LotRow, new: &LotFacts<'_>) -> bool {
    lot.product_name == new.product_name
        && lot.lot_number == new.lot_number
        && lot.level_text.as_deref() == new.level_text
        && lot.sample_label.as_deref() == new.sample_label
        && lot.expires_on == new.expires_on.to_text()
}

/// The material, product and lot number identify one lot; the analyzer's sample
/// label identifies one active lot.
fn check_unique(
    ctx: &CommandContext<'_>,
    lot: &LotRow,
    facts: &LotFacts<'_>,
) -> Result<(), AnalyticalError> {
    if repo::duplicate_lot(ctx.tx(), lot.id, facts)? {
        return Err(AnalyticalError::Duplicate("lot"));
    }
    let Some(label) = facts.sample_label else {
        return Ok(());
    };
    if let Some((product, number)) = repo::sample_label_holder(ctx.tx(), lot.id, label)? {
        return Err(invalid(
            "sampleLabel",
            "in_use",
            &format!(
                "The active lot {product} {number} already uses this sample label. Choose another label, or withdraw that lot first."
            ),
        ));
    }
    Ok(())
}
