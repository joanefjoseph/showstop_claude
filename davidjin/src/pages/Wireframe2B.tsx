import { useEffect, useState } from "react";
import ComedyLayout from "../components/ComedyLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { TOUR_VENUES } from "../data/tourVenues";
import { loadAvailability, requireMember } from "../api/purchaseFlow";
import { useBridgeAction } from "../api/useBridgeAction";
import { scrollToSection, type PageProps } from "../routing";

const PROFILE = `${import.meta.env.BASE_URL}images/profile-pic.png`;
const PROFILE_FALLBACK = "https://via.placeholder.com/400x500?text=Profile+Picture";
const VIDEOS = [
  {
    title: "David Jin Comedy Clip 1",
    src: "https://www.youtube.com/embed/EviMq3B_mJs?si=wbWL7sQWit7aclmH",
  },
  {
    title: "David Jin Podcast Clip 1",
    src: "https://www.youtube.com/embed/IoH2eyLoc74?si=ojWLnEIa8krYnDtw",
  },
];

export default function Wireframe2B({ params }: PageProps) {
  const [profileSrc, setProfileSrc] = useState(PROFILE);
  const { pendingKey, error, run } = useBridgeAction();

  // Navbar links on 2C–2E land here as #/2b?section=<id>
  const section = params.get("section");
  useEffect(() => {
    if (section) scrollToSection(section);
  }, [section]);

  return (
    <ComedyLayout>
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>David Jin</h1>
          <p>Touring Comedian &amp; Chef</p>
          <a href="#shows" className="btn-primary hero-btn">See Upcoming Tour Dates</a>
        </div>
      </section>

      {/* Tour Dates / Shows Section */}
      <section id="shows" className="section">
        <div className="container">
          <h2>Upcoming Shows</h2>
          <div className="tour-list">
            {/* On-sale shows come from tourVenues.ts. Buy Tickets: validate the member,
                GET /events/<id>/availability, then on to 2C for that show. */}
            {TOUR_VENUES.map((v) => {
              const href = `#/2c?venue=${v.id}`;
              const isPending = pendingKey === v.id;
              return (
                <div key={v.id} className="tour-item">
                  <div className="tour-info">
                    <span className="tour-date">{v.dateLabel}</span>
                    <div className="tour-venue">
                      {v.showName} <span className="tour-city">{v.venue}</span>
                    </div>
                  </div>
                  <a
                    href={href}
                    className="btn-secondary"
                    aria-busy={isPending}
                    style={{ cursor: pendingKey ? "wait" : undefined }}
                    onClick={(e) => {
                      e.preventDefault();
                      void run(
                        v.id,
                        async () => {
                          await requireMember();        // POST /membership/verify (cached after the first call)
                          await loadAvailability(v.id); // GET /events/:eventId/availability
                        },
                        href,
                      );
                    }}
                  >
                    {isPending ? "Checking seats…" : "Buy Tickets"}
                  </a>
                </div>
              );
            })}

            {/* Not on sale yet, so there is no vendor event behind it */}
            <div className="tour-item">
              <div className="tour-info">
                <span className="tour-date">Nov 19, 2026</span>
                <div className="tour-venue">
                  Lil Dumplings - Thanksgiving Edition <span className="tour-city">New York, NY</span>
                </div>
              </div>
              <button type="button" className="btn-coming-soon" disabled>Coming Soon</button>
            </div>
          </div>
          <BridgeErrorNote message={error} />
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="section bg-darker">
        <div className="container">
          <h2>Watch</h2>
          <div className="video-grid">
            {VIDEOS.map(({ title, src }) => (
              <div key={title} className="video-wrapper">
                <iframe
                  src={src}
                  title={title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section">
        <div className="container about-grid">
          <div className="about-image">
            <img
              src={profileSrc}
              alt="David Jin Profile Picture"
              style={{ opacity: 0.7 }}
              onError={() => setProfileSrc(PROFILE_FALLBACK)}
            />
          </div>
          <div className="about-text">
            <h2>About David</h2>
            <p>
              David Jin is a nationally touring stand-up comedian and writer known for his sharp
              observational humor and quick crowd work. He has been featured on Laugh After Dark,
              the CTDBY Podcast, and produces the Lil Dumplings Comedy Show series.
            </p>
            <p>When he isn't on the road, you can catch him performing regularly at his home clubs in New York City.</p>
            <a href="#" className="text-link">Download Press Kit (EPK) →</a>
          </div>
        </div>
      </section>
    </ComedyLayout>
  );
}