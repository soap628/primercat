import benchmark from "@/data/qpcr-reference-cohort-mouse-v0.6.json";

export const dynamic = "force-static";

export function GET() {
  return Response.json(benchmark, {
    headers: {
      "Content-Disposition": "attachment; filename=qpcr-fixed-refseq-mouse-cohort-v0.6.json",
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
