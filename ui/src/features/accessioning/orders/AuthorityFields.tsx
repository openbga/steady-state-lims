import { ChoiceInput, TextInput } from "@/components/FormFields";
import { Section } from "@/components/Section";
import { AUTHORITY_KINDS } from "./labels";
import styles from "./OrderForm.module.css";

/**
 * The authority to test exactly as the ordering source supplied it (REQ-ORD-005), from the
 * bottom of the requisition. Nothing is suggested or inferred.
 */
export function AuthorityFields() {
  return (
    <Section title="Authority to test">
      <p className={styles.hint}>
        From the bottom of the requisition: how the practitioner ordered the tests.
      </p>
      <div className={styles.fields}>
        <ChoiceInput
          name="authority.kind"
          label="As supplied"
          options={AUTHORITY_KINDS}
          isRequired
        />
        <TextInput
          name="authority.documentRef"
          label="Document reference"
          description="Such as the signed requisition's number."
        />
      </div>
    </Section>
  );
}
