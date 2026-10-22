import { useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import { IMG } from "../assets";
import { FAQ, faqText } from "../data/faq";
import { TOUR_VENUES, type TourRegion } from "../data/tourVenues";
import { REGION_LABELS, t, useLang } from "../i18n";
import { scrollToSection, type PageProps } from "../routing";
import { updateSession } from "../api/purchaseSession";

type RegionFilter = "all" | TourRegion;
const REGION_TABS: RegionFilter[] = ["all", "latam", "na", "eu"];

const LINKABLE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|https?:\/\/\S+)/g;

/** FAQ answer text; emails and URLs look like links but are dead (TourLayout swallows "#"). */
function RichText({ text }: { text: string }) {
  // split() with one capture group: odd indexes are the matches
  return (
    <>
      {text.split(LINKABLE).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href="#">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function Wireframe2A({ params }: PageProps) {
  const lang = useLang();
  const [region, setRegion] = useState<RegionFilter>("all");
  const [logoFailed, setLogoFailed] = useState(false);

  // "← Tour Dates" on 2B–2E lands here as #/2a?section=tour
  const section = params.get("section");
  useEffect(() => {
    if (section) scrollToSection(section);
  }, [section]);
  // Leaving the purchase flow signs the fan out, so every way back into 2C–2E goes through 2B's sign-in
  useEffect(() => {
    updateSession({ member: undefined });
  }, []);

  const stops = TOUR_VENUES.filter((s) => region === "all" || s.region === region);

  return (
    <TourLayout>
      {/* HERO */}
      <section className="hero wrap">
        <div className="hero-poster">
          <div className="hero-copy">
            <h1 className="title">
              {logoFailed ? (
                <span className="title-fallback">{t("en", "eyebrow")}</span>
              ) : (
                <img
                  className="title-logo"
                  src={IMG.logo}
                  alt="Jay Park 2026 World Tour with LNGSHOT. Serenades & Body Rolls."
                  onError={() => setLogoFailed(true)}
                />
              )}
            </h1>
          </div>
          <div className="hero-art-frame" aria-hidden="true">
            <img className="hero-art" src={IMG.heroArt} alt="" />
          </div>
        </div>
        <p className="sr-only">{t(lang, "eyebrow")}</p>
        <p className="sr-only">{t(lang, "regions")}</p>
        <div className="hero-cta">
          <a className="ticket-btn" id="heroBtn" href="#tour">
            Tickets
          </a>
        </div>
      </section>

      {/* TOUR */}
      <section className="section" id="tour">
        <div className="wrap">
          <h2>{t(lang, "tour_title")}</h2>
          <div className="region-tabs" id="regionTabs">
            {REGION_TABS.map((r) => (
              <button key={r} type="button" aria-pressed={r === region} onClick={() => setRegion(r)}>
                {r === "all" ? t(lang, "all") : REGION_LABELS[lang][r]}
              </button>
            ))}
          </div>

          <div className="stops" id="stops">
            {/* Tickets → 2B, the JWalkerz presale gate, for that stop */}
            {stops.map((s) => (
              <div key={s.id} className="stop">
                <div className="date">{s.date}</div>
                <div>
                  <div className="city">{s.city}</div>
                  <div className="venue">{s.venue}</div>
                </div>
                <div className="cta">
                  <a className="ticket-btn" href={`#/2b?venue=${s.id}`}>
                    {t(lang, "btn_buy")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="wrap">
          <h2>{t(lang, "faq_title")}</h2>
          <p className="faq-intro">{t(lang, "faq_intro")}</p>
          <div id="faqList">
            {FAQ.map((item) => (
              <details key={item.q_en} className="faq">
                <summary>{faqText(item, "q", lang)}</summary>
                <div className="ans">
                  <RichText text={faqText(item, "a", lang)} />
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </TourLayout>
  );
}