import type { Env } from "./access";
import { suggestedCategory } from "./imports";

/**
 * Repairs records created under the original Admin workflow, which kept every
 * Archive item hidden and used Vehicle Wraps as an implicit fallback. New
 * imports do neither. Running this during a portfolio read makes the existing
 * collection recover itself as soon as the fixed site is deployed.
 */
export async function recoverLegacyPortfolio(env: Env) {
  await env.DB.prepare("UPDATE portfolio_images SET is_hidden = 0, updated_at = CURRENT_TIMESTAMP WHERE status = 'archive' AND is_hidden = 1").run();

  const vehicleRows = await env.DB.prepare("SELECT id, source_filename FROM portfolio_images WHERE category_id = 'vehicle-wraps-fleet-graphics'").all<any>();
  const fixes = vehicleRows.results
    .map((row) => ({ id: String(row.id), categoryId: suggestedCategory(String(row.source_filename ?? ""), "vehicle-wraps-fleet-graphics") }))
    .filter((row) => row.categoryId !== "vehicle-wraps-fleet-graphics");
  if (fixes.length) {
    await env.DB.batch(fixes.map((row) => env.DB.prepare("UPDATE portfolio_images SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.categoryId, row.id)));
  }
}

