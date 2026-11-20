import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { OrderDetail } from "@/generated/OrderDetail";
import type { SpecimenTypeView } from "@/generated/SpecimenTypeView";
import { useCommandQuery } from "@/lib/commands";
import { GET_ORDER } from "../orders/contract";
import { useOrderAccessionContext } from "../useOrderAccessionContext";
import { AccessionForm } from "./AccessionForm";
import { LIST_SPECIMEN_TYPES } from "./contract";
import { ReceiveBanner } from "./ReceiveBanner";

/**
 * Loads what receiving an order's material needs (the order, which of its tests can be
 * received, the specimen types) and shows the order's summary line and the Receive specimens
 * form, or why it cannot open. Used by Receive specimens and by New order's Specimens step.
 */
export function ReceiveSpecimens({ orderId }: { orderId: string }) {
  const order = useCommandQuery<OrderDetail>(GET_ORDER, { input: { orderId } });
  const context = useOrderAccessionContext(orderId);
  const specimenTypes = useCommandQuery<SpecimenTypeView[]>(LIST_SPECIMEN_TYPES);
  const failed = [order, context, specimenTypes].find((query) => query.isError);
  let content: ReactNode = failed ? null : <LoadingState label="Preparing specimen receipt…" />;
  // A failed background refresh must not unmount entered values or the pending save's
  // completion callback. Keep the loaded form and show the read failure alongside it.
  if (order.data && context.data && specimenTypes.data) {
    content =
      specimenTypes.data.length === 0 ? (
        <EmptyState
          title="No specimen types are set up"
          description="An administrator adds specimen types to the catalog first."
        />
      ) : (
        <AccessionForm
          order={order.data}
          context={context.data}
          specimenTypes={specimenTypes.data}
        />
      );
  }
  return (
    <>
      {order.data && <ReceiveBanner order={order.data} />}
      {failed?.error && (
        <ErrorState
          title={
            order.data && context.data
              ? "Specimen receipt could not be refreshed"
              : "Specimen receipt could not be prepared"
          }
          error={failed.error}
          onRetry={() => void failed.refetch()}
        />
      )}
      {content}
    </>
  );
}
