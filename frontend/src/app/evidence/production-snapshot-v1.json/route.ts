import { productionEvidence } from "@/data/production-evidence";

export const dynamic = "force-static";

export function GET() {
  return Response.json(productionEvidence, {
    headers: {
      "Content-Disposition": "inline; filename=primercat-production-snapshot-v1.json",
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
