import { SegmentedInput, TextInput } from "@/components/FormFields";
import { Section } from "@/components/Section";
import { AUTHORITY_KINDS } from "./labels";
import styles from "./OrderForm.module.css";

/**
 * The authority to test exactly as the ordering source supplied it (REQ-ORD-005), from the
 * bottom of the requisition. Nothing is suggested or inferred.
 */
export function AuthorityFields() {
  return (
    <Section
      title="Authority to test"
      description="From the bottom of the requisition: how the practitioner ordered the tests."
    >
      <div className={styles.authority}>
        <SegmentedInput
          name="authority.kind"
          label="As supplied"
          options={AUTHORITY_KINDS}
          tip={
            <p>
              The evidence of the practitioner's authority or intent to order, exactly as the
              requisition shows it. Choose Not supplied when it has none; never assume a signature.
            </p>
          }
          isRequired
        />
        <TextInput
          name="authority.documentRef"
          label="Document reference"
          placeholder="Such as the signed requisition's number"
        />
      </div>
    </Section>
  );
}
