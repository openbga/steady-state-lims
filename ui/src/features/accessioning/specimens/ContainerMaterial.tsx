import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Timestamp } from "@/components/Timestamp";
import { Toolbar } from "@/components/Toolbar";
import type { ContainerView } from "@/generated/ContainerView";
import { useHasCapability } from "@/lib/commands";
import layout from "@/styles/layout.module.css";
import { type MaterialAction, MaterialActionDialog } from "./MaterialActionDialog";

/**
 * A container's material actions, offered from the engine's `allowedActions` and the
 * session's capabilities, and its open holds with their releases. The Holds fact counts the
 * open holds; they are listed only when there are some.
 */
export function ContainerMaterial({ container }: { container: ContainerView }) {
  const navigate = useNavigate();
  const [action, setAction] = useState<MaterialAction | null>(null);
  const accession = useHasCapability("accession");
  const quality = useHasCapability("manage_quality");
  const allowed = (name: string) => container.allowedActions.includes(name);
  return (
    <section aria-label={`Material actions for ${container.labelCode}`}>
      {container.locationChronologyUnresolved && (
        <Alert tone="warning" title="Current location needs source review">
          Legacy moves cannot establish the current location. Check the physical container and
          record an attributable move to its verified location.
        </Alert>
      )}
      {container.openHolds.length > 0 && (
        <ul className={layout.list} aria-label="Open holds">
          {container.openHolds.map((hold) => (
            <li key={hold.holdId}>
              <Toolbar>
                <span>
                  {hold.kind} hold: {hold.reason}. Placed <Timestamp value={hold.placedAt} />.
                </span>
                {hold.excursionId && (
                  <Link to={`/specimens/storage?excursionId=${hold.excursionId}`}>
                    View excursion
                  </Link>
                )}
                {quality && (
                  <Button onPress={() => setAction(hold)}>Release {hold.kind} hold</Button>
                )}
              </Toolbar>
            </li>
          ))}
        </ul>
      )}
      <Toolbar>
        {accession && allowed("move_container") && (
          <Button onPress={() => setAction("move")}>Move container</Button>
        )}
        {quality && container.state !== "disposed" && (
          <Button onPress={() => setAction("hold")}>Place hold</Button>
        )}
        {accession && allowed("mark_container_depleted") && (
          <Button onPress={() => setAction("deplete")}>Mark depleted</Button>
        )}
        {accession && allowed("dispose_container") && (
          <Button onPress={() => setAction("dispose")}>Dispose container</Button>
        )}
        <Button onPress={() => navigate("/specimens/storage")}>Storage excursions</Button>
      </Toolbar>
      {action && (
        <MaterialActionDialog
          container={container}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
    </section>
  );
}
