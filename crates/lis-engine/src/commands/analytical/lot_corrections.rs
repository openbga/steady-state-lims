//! Lot corrections and their history (#4558). Correcting needs
//! `manage_quality`; lots are laboratory configuration, so any signed-in user
//! may read their history.

use lis_analytical::{
    AnalyticalError, CorrectLotInput, LotHistoryEntry, LotHistoryInput, LotView, actions,
};
use lis_core::CommandError;

use super::MANAGE_QUALITY;
use crate::commands::people::name_recorders;
use crate::engine::Engine;
use crate::registry::{Access, CommandSpec, spec};

pub(crate) const CORRECT_LOT: CommandSpec =
    spec("correct_lot", actions::CORRECT_LOT, MANAGE_QUALITY);
pub(crate) const LOT_HISTORY: CommandSpec =
    spec("lot_history", "analytical.lot_history", Access::Session);

impl Engine {
    /// `correct_lot`.
    pub async fn correct_lot(&self, input: CorrectLotInput) -> Result<LotView, CommandError> {
        self.run(&CORRECT_LOT, |call| async move {
            self.write(&call, move |ctx| lis_analytical::correct_lot(ctx, input))
                .await
        })
        .await
    }

    /// `lot_history`, with who recorded each revision named on every read.
    pub async fn lot_history(
        &self,
        input: LotHistoryInput,
    ) -> Result<Vec<LotHistoryEntry>, CommandError> {
        self.run(&LOT_HISTORY, |call| async move {
            self.read(&call, move |conn| named_history(conn, input))
                .await
        })
        .await
    }
}

fn named_history(
    conn: &rusqlite::Connection,
    input: LotHistoryInput,
) -> Result<Vec<LotHistoryEntry>, AnalyticalError> {
    let mut rows = lis_analytical::lot_history(conn, input)?;
    name_recorders(
        conn,
        &mut rows,
        |row| Some(row.recorded_by.as_str()),
        |row, name| row.recorded_by_display = name,
    )?;
    Ok(rows)
}
