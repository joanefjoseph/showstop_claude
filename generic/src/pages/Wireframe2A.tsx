import { useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import { bridge } from "../api/bridgeClient";
import { formatEventDate } from "../api/format";
import { ARTIST, FAN_CLUB, STOPS, TAGLINE, TOUR_NAME, TOUR_YEAR } from "../data/tour";

/** 2A: tour announcement / landing page. Dates come live from the ticketing service. */
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
      <section className="hero">
        <p className="eyebrow">Live in {TOUR_YEAR}</p>
        <h1>{ARTIST}</h1>
        <h2>{TOUR_NAME}</h2>
        <p className="lede">{TAGLINE}</p>
        <a className="btn primary" href="#dates">See dates</a>
      </section>

      <main className="shell">
        <section className="cards three">
          <article className="card">
            <h3>{FAN_CLUB} presale</h3>
            <p className="muted">Members get first access to selected dates before the general on-sale.</p>
          </article>
          <article className="card">
            <h3>Floor, Club &amp; Lower Bowl</h3>
            <p className="muted">Standing floor tickets, or reserved seats you pick on a live seat map.</p>
          </article>
          <article className="card">
            <h3>Secure mobile tickets</h3>
            <p className="muted">Rotating barcodes keep your ticket safe from screenshots and scalpers.</p>
          </article>
        </section>

        <h2 id="dates" className="section-title">Tour dates</h2>
        <ul className="dates">
          {sorted.map((s) => (
            <li key={s.id} className="date-row">
              <div className="when">{dates[s.id] ? formatEventDate(dates[s.id]) : loaded ? "Date TBA" : "…"}</div>
              <div className="where">
                <strong>{s.city}</strong>, {s.country}
                <span className="muted"> · {s.venue}</span>
              </div>
              <span className={`badge ${s.saleType === "PRESALE" ? "presale" : "onsale"}`}>
                {s.saleType === "PRESALE" ? `${FAN_CLUB} presale` : "On sale"}
              </span>
              <a className="btn primary" href={`#/2b?venue=${s.id}`}>Get tickets</a>
            </li>
          ))}
        </ul>
      </main>
    </TourLayout>
  );
}
