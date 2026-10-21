import { useEffect } from "react";
import KoomLayout from "../components/KoomLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { KOOM_LIVE } from "../data/tourVenues";
import { koomImage } from "../data/koomImages";
import { loadAvailability, requireMember } from "../api/purchaseFlow";
import { useBridgeAction } from "../api/useBridgeAction";
import { scrollToSection, type PageProps } from "../routing";

/* Lost in the PDF export of index.html (prints as ■) — paste the original character here. */
const VIEW_LOCATION_GLYPH = "↗";

export default function Wireframe2B({ params }: PageProps) {
  const venue = KOOM_LIVE;
  const { pendingKey, error, run } = useBridgeAction();

  // "Get Tickets" on 2C–2E lands here as #/2b?section=tickets
  const section = params.get("section");
  useEffect(() => {
    if (section) scrollToSection(section);
  }, [section]);

  // Tickets: validate the member, GET /events/<id>/availability, then on to 2C
  const ticketsHref = `#/2c?venue=${encodeURIComponent(venue.id)}`;
  const isPending = pendingKey === venue.id;
  const buyTickets = () =>
    void run(
      venue.id,
      async () => {
        await requireMember();            // POST /membership/verify (cached after the first call)
        await loadAvailability(venue.id); // GET /events/:eventId/availability
      },
      ticketsHref,
    );

  return (
    <KoomLayout>
      <section className="intro">
        <div className="intro-heading">
          <p className="eyebrow">OCTOBER 12–18 · MANHATTAN, NYC</p>
          <h1>KOOM Live</h1>
        </div>
        <div className="intro-details">
          <p className="intro-description">
            Experience an evening of live K-pop, special performances, and unforgettable energy.
          </p>
          <div className="fact"><span>LOCATION</span><strong>{venue.venue}</strong></div>
          <div className="fact"><span>DATE</span><strong>{venue.dateLabel}</strong></div>
        </div>
        <img className="hero-image" src={koomImage("live-hero.png")} alt="Crowd at a KOOM Live night concert" />
      </section>

      <section className="energy section-dark">
        <div className="section-inner">
          <div className="section-heading centered">
            <p className="eyebrow accent">THE NIGHT COMES ALIVE</p>
            <h2>Where the<br />Energy Peaks</h2>
            <p className="lead">
              When the conversations end, the stage comes alive. Experience K-pop performances, special
              showcases, and a night where the KOOM community comes together.
            </p>
          </div>
          <article id="tickets" className="concert-card">
            <div className="concert-copy">
              <span className="pill">Night ticket required</span>
              <div className="concert-text">
                <h3>Live Concert</h3>
                <p>The venue flips from pitch stage to standing concert. Lineup announced closer to the event.</p>
              </div>
              <div className="ticket-action">
                <button
                  type="button"
                  className="button button-pink is-action"
                  aria-busy={isPending}
                  onClick={buyTickets}
                >
                  {isPending ? "Checking seats…" : "Tickets"} <span aria-hidden="true">→</span>
                </button>
                <BridgeErrorNote message={error} />
              </div>
            </div>
            <img src={koomImage("feature.png")} alt="KOOM Live concert stage from the crowd" />
          </article>
        </div>
      </section>

      <section className="location-section">
        <div className="section-inner">
          <p className="eyebrow">FIND YOUR WAY</p>
          <h2>Location</h2>
          <div className="location-card">
            <div className="map-frame">
              <img className="map-image" src={koomImage("map.png")} alt="Map of Terminal 5 in Hell's Kitchen, Manhattan" />
              <img className="map-pin" src={koomImage("pin.svg")} alt="" />
            </div>
            <div className="location-copy">
              <span className="pill pill-dark">Venue</span>
              <div>
                <h3>{venue.venue}</h3>
                <p>{venue.address}</p>
              </div>
              <p className="venue-note">
                Three floors &amp; rooftop, ~3,000 capacity,<br className="desktop-only" /> day conference to night concert.
              </p>
              <button type="button" className="button button-navy">
                View Location <span aria-hidden="true">{VIEW_LOCATION_GLYPH}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </KoomLayout>
  );
}