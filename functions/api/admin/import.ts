import { json } from "../../lib/access";

// This endpoint deliberately no longer parses multipart ZIP uploads. The private
// admin screen opens ZIPs on the owner's device and sends extracted images one at a time.
export const onRequestPost: PagesFunction = async () => json({ error: "Whole-ZIP uploads are disabled. Choose ZIP packages in Admin; they are opened locally in the browser and individual images are sent to /api/admin/import-image." }, { status: 410 });
