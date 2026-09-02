import checksums from "@/data/production-reference-checksums-v1.json";

export const dynamic = "force-static";

export function GET() {
  return Response.json(checksums, {
    headers: {
      "Content-Disposition": "inline; filename=primercat-production-reference-checksums-v1.json",
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
