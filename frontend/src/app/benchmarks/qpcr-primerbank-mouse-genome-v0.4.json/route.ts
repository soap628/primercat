import benchmark from "@/data/qpcr-genome-benchmark-v0.4.json";

export function GET() {
  return Response.json(benchmark, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Disposition": 'inline; filename="qpcr-primerbank-mouse-genome-v0.4.json"',
    },
  });
}
