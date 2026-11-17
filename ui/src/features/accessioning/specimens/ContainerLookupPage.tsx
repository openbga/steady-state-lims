import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useLocation, useSearchParams } from "react-router";
import { Button } from "@/components/Button";
import { Form } from "@/components/Form";
import { TextInput } from "@/components/FormFields";
import { Page, PageHeader } from "@/components/Page";
import { useFormatTime } from "@/lib/format";
import { IdentityBanner } from "@/lib/IdentityBanner";
import { ContainerResult, useContainerLookup } from "./ContainerResult";
import { LookupStart } from "./LookupStart";
import styles from "./lookup.module.css";
import { HISTORY_TABS, type HistoryTab } from "./MaterialHistory";

/** The scan a History tab belongs to, kept in the address's state while tabs change. */
function scanOf(state: unknown, key: string): string {
  if (typeof state === "object" && state !== null && "scan" in state) {
    if (typeof state.scan === "string") return state.scan;
  }
  return key;
}

/**
 * Finds a container by its barcode (REQ-SPC-001), for accession or quality staff. A scanner
 * types the barcode and presses Enter, here or in the top bar's scan field; the barcode goes
 * in the address (`?labelCode=`) and the field clears and keeps focus for the next scan. Each
 * scan is its own lookup, even of the same barcode: its new history entry remounts the
 * result. The History tab is in the address too (`&history=`); changing it keeps the scan.
 */
export function ContainerLookupPage() {
  const [params, setParams] = useSearchParams();
  const { key, state } = useLocation();
  const labelCode = params.get("labelCode")?.trim() ?? "";
  const scan = scanOf(state, key);
  const named = params.get("history");
  const tab: HistoryTab = HISTORY_TABS.find((each) => each === named) ?? HISTORY_TABS[0];
  const tabHref = (id: HistoryTab) =>
    `/containers?${new URLSearchParams({ labelCode, history: id })}`;
  const form = useForm({ defaultValues: { labelCode: "" } });
  const onSubmit = form.handleSubmit((values) => {
    setParams({ labelCode: values.labelCode.trim() });
    form.reset();
    form.setFocus("labelCode");
  });
  return (
    <Page>
      <PageHeader
        title="Container lookup"
        description="Scan or type a container barcode. Each lookup is recorded in the audit trail."
      />
      <div className={styles.scanBar}>
        <FormProvider {...form}>
          <Form
            aria-label="Container lookup"
            onSubmit={onSubmit}
            actions={
              <>
                <Button type="submit" variant="primary">
                  Find container
                </Button>
                {labelCode !== "" && <LastScan key={scan} labelCode={labelCode} />}
              </>
            }
          >
            <div className={styles.scanField}>
              <TextInput
                name="labelCode"
                label="Container barcode"
                placeholder="Scan or type a container barcode"
                isRequired
                autoFocus
              />
            </div>
          </Form>
        </FormProvider>
      </div>
      {labelCode === "" && <LookupStart />}
      {labelCode !== "" && (
        <>
          <ContainerBanner key={`banner-${scan}`} labelCode={labelCode} />
          <ContainerResult
            key={`result-${scan}`}
            labelCode={labelCode}
            tab={tab}
            tabHref={tabHref}
            routerOptions={{ state: { scan } }}
          />
        </>
      )}
    </Page>
  );
}

/** The barcode last looked up and when, beside the emptied field. */
function LastScan({ labelCode }: { labelCode: string }) {
  const formatTime = useFormatTime();
  const [at] = useState(() => new Date());
  return (
    <span className={styles.lastScan}>
      Last: {labelCode} · {formatTime(at.toISOString(), { today: at })}
    </span>
  );
}

/** Whose container it is, once found: the lookup already carries the patient. */
function ContainerBanner({ labelCode }: { labelCode: string }) {
  const match = useContainerLookup(labelCode);
  if (!match.isSuccess) return null;
  const { container, accessionNumber, subject } = match.data;
  return (
    <IdentityBanner
      subject={subject}
      specimen={{ accessionNumber, labelCode: container.labelCode }}
    />
  );
}
