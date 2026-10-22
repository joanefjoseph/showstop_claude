import { Fragment, useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { IMG } from "../assets";
import { FAQ, faqText } from "../data/faq";
import { TOUR_VENUES, type TourRegion } from "../data/tourVenues";
import { REGION_LABELS, t, useLang } from "../i18n";
import { loadAvailability, requireMember } from "../api/purchaseFlow";
import { useBridgeAction } from "../api/useBridgeAction";
import { scrollToSection, type PageProps } from "../routing";

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

export default function Wireframe2B({ params }: PageProps) {
  const lang = useLang();
  const [region, setRegion] = useState<RegionFilter>("all");
  const [logoFailed, setLogoFailed] = useState(false);
  const { pendingKey, error, run } = useBridgeAction();
  // Which row the last Tickets click was on, so its error shows under that row
  const [lastKey, setLastKey] = useState<string | null>(null);

  // "← Tour Dates" on 2C–2E lands here as #/2b?section=tour
  const section = params.get("section");
  useEffect(() => {
    if (section) scrollToSection(section);
  }, [section]);

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
            {/* Tickets: validate the member, GET /events/<id>/availability, then on to 2C for that stop. */}
            {stops.map((s) => {
              const href = `#/2c?venue=${s.id}`;
              const isPending = pendingKey === s.id;
              return (
                <Fragment key={s.id}>
                  <div className="stop">
                    <div className="date">{s.date}</div>
                    <div>
                      <div className="city">{s.city}</div>
                      <div className="venue">{s.venue}</div>
                    </div>
                    <div className="cta">
                      <a
                        className="ticket-btn"
                        href={href}
                        aria-busy={isPending}
                        style={{ cursor: pendingKey ? "wait" : undefined }}
                        onClick={(e) => {
                          e.preventDefault();
                          setLastKey(s.id);
                          void run(
                            s.id,
                            async () => {
                              await requireMember(); // POST /membership/verify (cached after the first call)
                              await loadAvailability(s.id); // GET /events/:eventId/availability
                            },
                            href,
                          );
                        }}
                      >
                        {isPending ? t(lang, "btn_checking") : t(lang, "btn_buy")}
                      </a>
                    </div>
                  </div>
                  {lastKey === s.id && <BridgeErrorNote message={error} />}
                </Fragment>
              );
            })}
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