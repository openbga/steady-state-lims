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

/** Each of the patient's identifiers on its own line, or that none was supplied. */
function Identifiers({ order }: { order: OrderSummary }) {
  if (order.patientIdentifiers.length === 0) return "None supplied";
  return order.patientIdentifiers.map((i, index) => (
    <Fragment key={`${i.assigningAuthority}/${i.identifierType}/${i.value}`}>
      {index > 0 && <br />}
      {`${i.assigningAuthority} / ${i.identifierType}: ${i.value}`}
    </Fragment>
  ));
}

const identifierText = (order: OrderSummary) =>
  order.patientIdentifiers
    .map((i) => `${i.assigningAuthority} / ${i.identifierType}: ${i.value}`)
    .join("; ");

/**
 * The order of a laboratory's work: when the order came in and its number, whose it is and who
 * sent it, what was ordered, its samples, whether it is held, its accession, and its status, last.
 * Titles wrap onto two lines and identifiers sit one per line, so nothing is cut short; the
 * fixed widths keep every column in view at 1920 pixels with the navigation open (#4790).
 */
export const ORDER_COLUMNS: readonly DataGridColumn<OrderSummary>[] = [
  {
    id: "received",
    header: "Order received",
    cell: (order) => <Timestamp value={order.receivedAt} />,
    sortValue: (order) => order.receivedAt,
    width: 170,
  },
  {
    id: "placer",
    header: "Order number",
    cell: (order) => order.placerOrderId ?? "Not supplied",
    sortValue: (order) => order.placerOrderId ?? "",
    width: 140,
  },
  {
    id: "patient",
    header: "Patient",
    cell: patientName,
    sortValue: patientName,
    identifier: true,
    width: 150,
  },
  { id: "birthDate", header: "Birth date", cell: (order) => order.patientBirthDate, width: 100 },
  {
    id: "identifiers",
    header: "Patient identifiers",
    cell: (order) => <Identifiers order={order} />,
    sortValue: identifierText,
    wrap: true,
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
    width: 70,
  },
  {
    id: "sampleBarcodes",
    header: "Sample barcode",
    cell: (order) => sampleBarcodes(order) || "None received",
    sortValue: sampleBarcodes,
    width: 120,
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
    width: 90,
  },
  {
    id: "accessions",
    header: "Accession",
    cell: (order) => <Accessions order={order} />,
    sortValue: accessionNumbers,
    width: 120,
  },
  {
    id: "status",
    header: "Status",
    cell: (order) => {
      const status = orderStatus(order.status);
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
    sortValue: (order) => order.status,
    width: 210,
  },
];
