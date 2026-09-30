import PhoneCard from "@/components/phone-card";

export const dynamic = "force-dynamic";

export default function Home() {
  const configuredPhone = process.env.VAPI_PHONE_NUMBER?.trim() || "";
  const phoneNumber = /^\+[1-9]\d{7,14}$/.test(configuredPhone) ? configuredPhone : "";

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand" aria-label="Call Authright">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>Call Authright</span>
          </div>
          <span className="header-tag">AI phone reception</span>
        </div>
      </header>

      <main className="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Call Authright<br /><em>Phone Service Demo</em></h1>
          </div>

          <PhoneCard phoneNumber={phoneNumber} />
        </section>
      </main>
    </div>
  );
}
