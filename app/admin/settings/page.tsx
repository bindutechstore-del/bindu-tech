import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "@/components/admin/settings-form";
import { DeliveryZoneManager } from "@/components/admin/delivery-zone-manager";
import { PageHeader } from "@/components/ui/primitives";
import type { DeliveryZone, Setting } from "@/types/database";
import { deliveryNoteFromOptions, sanitiseHighlights } from "@/lib/content/highlights";
import { formatTaka } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // Full admins only. Managers get everything else, but not configuration —
  // the settings_admin_write policy enforces the same rule in SQL.
  await requireAdmin();
  const db = createAdminClient();

  const [{ data: settings }, { data: zones }] = await Promise.all([
    db.from("settings").select("*").order("key"),
    db.from("delivery_zones").select("*").order("position"),
  ]);

  const settingRows = (settings ?? []) as Setting[];
  const zoneRows = (zones ?? []) as DeliveryZone[];
  const highlights = sanitiseHighlights(
    settingRows.find((s) => s.key === "home_highlights")?.value,
  );
  const deliveryAuto = deliveryNoteFromOptions(
    zoneRows
      .filter((z) => z.is_active)
      .map((z) => ({
        name: z.name,
        feePaisa: z.fee_paisa,
        minDays: z.min_days,
        maxDays: z.max_days,
      })),
    formatTaka,
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store configuration and delivery pricing. Nothing here is hardcoded in the app."
      />
      <SettingsForm settings={settingRows} highlights={highlights} deliveryAuto={deliveryAuto} />
      <div className="mt-6">
        <DeliveryZoneManager zones={zoneRows} />
      </div>
    </>
  );
}
