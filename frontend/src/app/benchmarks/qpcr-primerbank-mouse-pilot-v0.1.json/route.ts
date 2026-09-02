import benchmark from "@/data/qpcr-reference-benchmark-v0.1.json";

export async function GET() {
  return Response.json(benchmark, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": 'attachment; filename="qpcr-primerbank-mouse-pilot-v0.1.json"',
    },
  });
}
