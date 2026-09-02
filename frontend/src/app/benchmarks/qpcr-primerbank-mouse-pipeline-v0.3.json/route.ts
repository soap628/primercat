import benchmark from "@/data/qpcr-pipeline-benchmark-v0.3.json";

export async function GET() {
  return Response.json(benchmark, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": 'attachment; filename="qpcr-primerbank-mouse-pipeline-v0.3.json"',
    },
  });
}
