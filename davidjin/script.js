// Swallow dead links.
// This is a single-page site, so the only links that really work are the
// in-page "#section" ones. Everything else (the fake ticket URL, the bare "#"
// placeholders for the press kit and socials, and the mailing-list form) is
// neutralised here: it still looks clickable, but goes nowhere.
// To let a real link through later, add a data-live attribute to its <a> tag.
function swallowDeadLinks() {
    const swallow = (e) => e.preventDefault();

    document.querySelectorAll('a[href="#"], a[href]:not([href^="#"]):not([data-live])').forEach(link => {
        // Point the link at the page itself so hovering or right-click >
        // "Open in new tab" can't reach the fake URL either.
        link.setAttribute('href', '#');
        link.removeAttribute('target');

        link.addEventListener('click', swallow);    // click, Enter key, Ctrl/Cmd+click
        link.addEventListener('auxclick', swallow); // middle-click
    });

    // The mailing-list form has nowhere to submit to; stop it reloading the page.
    document.querySelectorAll('form.newsletter-form').forEach(form => {
        form.addEventListener('submit', swallow);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    const links = document.querySelectorAll('.nav-link, .nav-cta');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    });

    // Smooth scroll with offset for fixed header
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            if(targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            const headerOffset = 70; // Height of the navbar
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        });
    });

    // Neutralise the fake external links and the newsletter form
    swallowDeadLinks();
});