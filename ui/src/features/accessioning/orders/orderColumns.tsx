import { Fragment } from "react";
import { Link } from "react-router";
import type { DataGridColumn } from "@/components/DataGrid";
import { StatusBadge } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import type { OrderSummary } from "@/generated/OrderSummary";
import { subjectName } from "../subjects";
import { orderStatus } from "./labels";
import { OrderedTests } from "./OrderedTests";

export const orderPath = (orderId: string) => `/orders/${orderId}`;

const patientName = (order: OrderSummary) =>
  subjectName({ familyName: order.patientFamilyName, givenNames: order.patientGivenNames });

const sampleBarcodes = (order: OrderSummary) => order.sampleBarcodes.join("; ");

const accessionNumbers = (order: OrderSummary) =>
  order.accessions.map((accession) => accession.accessionNumber).join(", ");

/** Each accession of the order, linked to its page, or that none is received yet. */
function Accessions({ order }: { order: OrderSummary }) {
  if (order.accessions.length === 0) return "Not received yet";
  return order.accessions.map((accession, index) => (
    <Fragment key={accession.accessionId}>
      {index > 0 && ", "}
      <Link to={`/accessions/${accession.accessionId}`}>{accession.accessionNumber}</Link>
    </Fragment>
  ));
}

/**
 * Patient identity and source context remain visible before opening an order. Status and
 * Open holds sit together after the order number, and the fixed widths keep every column in
 * view at 1920 pixels with the navigation open (#4790); longer text is cut short and shown
 * in full on hover.
 */
export const ORDER_COLUMNS: readonly DataGridColumn<OrderSummary>[] = [
  {
    id: "patient",
    header: "Patient",
    cell: patientName,
    sortValue: patientName,
    identifier: true,
  },
  { id: "birthDate", header: "Birth date", cell: (order) => order.patientBirthDate, width: 100 },
  {
    id: "identifiers",
    header: "Patient identifiers",
    cell: (order) =>
      order.patientIdentifiers
        .map((i) => `${i.assigningAuthority} / ${i.identifierType}: ${i.value}`)
        .join("; ") || "None supplied",
  },
  {
    id: "placer",
    header: "Order number",
    cell: (order) => order.placerOrderId ?? "Not supplied",
    sortValue: (order) => order.placerOrderId ?? "",
    width: 112,
  },
  {
    id: "status",
    header: "Status",
    cell: (order) => {
      const status = orderStatus(order.status);
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
    sortValue: (order) => order.status,
    width: 220,
  },
  {
    id: "holds",
    header: "Open holds",
    cell: (order) =>
      order.openHoldCount === 0 ? (
        0
      ) : (
        <StatusBadge tone="hold">{`${order.openHoldCount} open`}</StatusBadge>
      ),
    sortValue: (order) => order.openHoldCount,
    align: "end",
    width: 100,
  },
  {
    id: "sampleBarcodes",
    header: "Sample barcode",
    cell: (order) => sampleBarcodes(order) || "None received",
    sortValue: sampleBarcodes,
    width: 130,
  },
  {
    id: "accessions",
    header: "Accession",
    cell: (order) => <Accessions order={order} />,
    sortValue: accessionNumbers,
    width: 130,
  },
  {
    id: "client",
    header: "Client",
    cell: (order) => order.clientName,
    sortValue: (order) => order.clientName,
  },
  {
    id: "items",
    header: "Tests",
    cell: (order) => <OrderedTests order={order} />,
    sortValue: (order) => order.itemCount,
    align: "end",
    width: 80,
  },
  {
    id: "received",
    header: "Order received",
    cell: (order) => <Timestamp value={order.receivedAt} />,
    sortValue: (order) => order.receivedAt,
    width: 180,
  },
];
