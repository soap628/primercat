import Image from "next/image";

export default function SponsorPage({ params: { locale } }: { params: { locale: string } }) {
  const zh = locale === "zh";

  return (
    <div className="story-page aux-page-v7 sponsor-page-v7" style={{ maxWidth: 640 }}>

      {/* Hero */}
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 28,
          background: "radial-gradient(circle at top right, rgba(39,103,73,0.22), transparent 40%), linear-gradient(135deg, #071a10 0%, #0f3020 55%, #276749 100%)",
          color: "#fff",
          boxShadow: "0 24px 56px rgba(15,23,42,0.2)",
        }}
      >
        <div className="story-kicker">{zh ? "赞助支持" : "Sponsor"}</div>
        <h1 className="story-display" style={{ margin: "16px 0 14px" }}>
          {zh ? "支持 PrimerCat" : "Support PrimerCat"}
        </h1>
        <p className="story-copy" style={{ color: "rgba(255,255,255,0.8)", maxWidth: 520, margin: 0 }}>
          {zh
            ? "PrimerCat 由独立开发者维护。赞助将用于服务器、外部服务与持续维护。"
            : "PrimerCat is maintained by an independent developer. Contributions support hosting, external services, and ongoing maintenance."}
        </p>
      </section>

      {/* Why */}
      <section className="story-surface" style={{ padding: "24px clamp(20px, 4vw, 32px)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "var(--green)", marginBottom: 12 }}>
          {zh ? "资金用途" : "Use of contributions"}
        </div>
        <div className="story-bullet-list">
          {(zh ? [
            "服务器与 API 运营费用",
            "NCBI BLAST 调用与带宽成本",
            "持续维护与功能迭代",
          ] : [
            "Server and API operating costs",
            "NCBI BLAST calls and bandwidth",
            "Ongoing maintenance and new features",
          ]).map((w) => (
            <div key={w} className="story-bullet">{w}</div>
          ))}
        </div>
      </section>

      {/* Alipay QR */}
      <section className="story-surface" style={{ padding: "32px clamp(20px, 4vw, 36px)", textAlign: "center" as const }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 20 }}>
          {zh ? "支付宝扫码" : "Alipay"}
        </div>
        <div style={{
          display: "inline-block",
          padding: 12,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}>
          <Image
            src="/alipay.jpg"
            alt="Alipay QR Code"
            width={200}
            height={200}
            unoptimized
            style={{ borderRadius: 8, display: "block" }}
          />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 16 }}>
          {zh ? "打开支付宝 → 扫一扫" : "Open Alipay → Scan QR"}
        </p>
      </section>

      {/* Thank you */}
      <section className="story-surface" style={{ padding: "20px clamp(20px, 4vw, 32px)" }}>
        <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0, fontStyle: "italic" as const }}>
          {zh
            ? "感谢你支持 PrimerCat 的持续维护。"
            : "Thank you for supporting the continued maintenance of PrimerCat."}
        </p>
      </section>

    </div>
  );
}
