import { useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import { bridge } from "../api/bridgeClient";
import { formatEventDate } from "../api/format";
import { ARTIST, FAN_CLUB, FAQ, STOPS, TOUR_NAME, TOUR_YEAR } from "../data/tour";
import heroArt from "../assets/hero.jpg";
import logo from "../assets/logo.jpg";

/** 2A: tour landing page: poster hero, dates, FAQ. Dates come live from the ticketing service. */
export default function Wireframe2A() {
  const [dates, setDates] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Read-only: deliberately not loadAvailability, which would overwrite the purchase session.
    Promise.allSettled(STOPS.map((s) => bridge.getAvailability(s.id))).then((results) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[STOPS[i].id] = r.value.startsAt;
      });
      setDates(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = [...STOPS].sort((a, b) => (dates[a.id] ?? "9").localeCompare(dates[b.id] ?? "9"));

  return (
    <TourLayout>
      <section className="hero poster" style={{ backgroundImage: `url(${heroArt})` }}>
        <div className="poster-copy">
          <img className="poster-logo" src={logo} alt={ARTIST} />
          <h2>{TOUR_NAME}</h2>
          <p className="poster-year">{TOUR_YEAR} · North America &amp; Europe</p>
          <a className="btn primary" href="#dates">Get tickets</a>
        </div>
      </section>

      <main className="shell">
        <h2 id="dates" className="section-title">Tour dates</h2>
        <ul className="dates">
          {sorted.map((s) => (
            <li key={s.id} className="date-row">
              <div className="when">{dates[s.id] ? formatEventDate(dates[s.id]) : loaded ? "Date TBA" : "…"}</div>
              <div className="where">
                <strong>{s.city}</strong>, {s.country}
                <span className="muted"> · {s.venue}</span>
              </div>
              {s.saleType === "PRESALE" ? <span className="badge presale">{FAN_CLUB} presale</span> : <span />}
              <a className="btn primary" href={`#/2b?venue=${s.id}`}>Tickets</a>
            </li>
          ))}
        </ul>

        <h2 id="faq" className="section-title">FAQ</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p className="muted">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
    </TourLayout>
  );
}
