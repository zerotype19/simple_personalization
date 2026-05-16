import type { CommercialIntentMemory, FormIntent, SessionProfile } from "@si/shared";
import { buyerSafeFormTimelineLabel } from "./formTimelineLabels";
import { formIntentToCommercialAction } from "./formIntentCommercialAction";
import { updateCommercialIntentMemory } from "./updateCommercialIntentMemory";

export function updateCommercialIntentFromForm(
  profile: SessionProfile,
  form: FormIntent,
): CommercialIntentMemory {
  const vertical = profile.site_context.vertical;
  const action = formIntentToCommercialAction(form, vertical);
  const timeline_label = buyerSafeFormTimelineLabel(form.form_type);

  const prev = profile.commercial_intent;
  const form_type_counts = { ...(prev?.form_type_counts ?? {}) };
  form_type_counts[form.form_type] = (form_type_counts[form.form_type] ?? 0) + 1;

  const base = updateCommercialIntentMemory(profile, { action, timeline_label });
  return { ...base, form_type_counts };
}
