import benchmark from "@/data/qpcr-transcriptome-benchmark-v0.5.json";

export const dynamic = "force-static";

export function GET() {
  return Response.json(benchmark, {
    headers: {
      "Content-Disposition": "attachment; filename=qpcr-primerbank-mouse-transcriptome-v0.5.json",
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
