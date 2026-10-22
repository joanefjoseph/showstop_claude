import type { Lang } from "../i18n";

/** KO/ES fall back to EN when blank, as on the original page. */
export interface FaqItem {
  q_en: string;
  a_en: string;
  q_ko?: string;
  a_ko?: string;
  q_es?: string;
  a_es?: string;
}

export function faqText(item: FaqItem, field: "q" | "a", lang: Lang): string {
  return item[`${field}_${lang}`] || item[`${field}_en`];
}

/** The FAQ as it was live when the page was saved. */
export const FAQ: FaqItem[] = [
  {
    q_en: "How do I get tickets to 2026 Jay Park World Tour [Serenades & Body Rolls] with Special Guest LNGSHOT?",
    a_en: "Ticketing links for each tour stop will be added to this page as they become available and may also be shared through official venue, promoter, and ticketing partner channels. Please only purchase tickets through official sources.",
  },
  {
    q_en: "What are the ticket and VIP Package on-sale dates?",
    a_en: "Please see the current on-sale schedule below:\n\n• JWalkerz Presale: Wednesday, June 10 at 10am local time\n• General On-sale: Friday, June 12 at 10am local time\n\nThere may be various other presales that are not operated by the artist team. For information on these, please contact the applicable promoter, venue, or ticketing platform.",
  },
  {
    q_en: "Are tickets guaranteed if I have presale access?",
    a_en: "No. Tickets and VIP Packages are limited and available on a first-come, first-served basis. Presale access does not guarantee that you will be able to purchase tickets or VIP Packages.",
  },
  {
    q_en: "Can General On-sale be canceled if tickets sell out during presale?",
    a_en: "Tickets and VIP Packages are limited and available on a first-come, first-served basis. VIP Packages may sell out during presale. However, a minimum of 10% of regular ticket inventory will be held for General On-sale in all markets.",
  },
  {
    q_en: "Where can I find tickets and/or VIP Packages?",
    a_en: "Ticketing links for each tour stop will be added to this page as they become available and may also be shared through official venue, promoter, and ticketing partner channels. Please only purchase tickets through official sources.",
  },
  {
    q_en: "How do I participate in the JWalkerz Presale?",
    a_en: "The JWalkerz Presale is only available to existing Jay Park Official Fanclub JWalkerz Members who joined before membership registration closed. New signups are not available for this presale.\n\nEligible members will receive presale details through Melon, and their Melon membership ID will serve as their presale password. Fans who are not eligible for the JWalkerz Presale should refer to the available venue, promoter, local, and General On-sale options.",
  },
  {
    q_en: "How many tickets and/or VIP Packages can I buy with my presale access?",
    a_en: "JWalkerz Presale Members may purchase up to 6 tickets total per code across the entire tour, subject to availability. This limit is not per show.\n\nVIP Packages are limited to 5 VIP Packages per transaction, subject to availability. Additional ticket limits may vary by ticketing platform, venue, or territory.",
  },
  {
    q_en: "Can I use my presale access for a different city than the one I selected?",
    a_en: "Yes. JWalkerz Presale codes can be used across tour dates, but the limit is 6 tickets total per code across the entire tour, not 6 tickets per city or per show. All tickets and VIP Packages are subject to availability.",
  },
  {
    q_en: "Are presale tickets refundable or transferable?",
    a_en: "Refund and transfer policies vary by ticketing platform, venue, and territory. Please check the official ticketing platform’s policies for your show before purchasing. All ticket purchases are subject to the terms and conditions of the applicable ticketing provider.",
  },
  {
    q_en: "What should I do if my presale code does not work?",
    a_en: "Please contact the applicable ticketing provider, promoter, official support contact for the presale you are trying to access, and/or tour@morevision.kr.",
  },
  {
    q_en: "Will VIP Packages include a ticket?",
    a_en: "Yes. VIP 1 and VIP 2 each include one GA floor ticket or reserved seat in the best available locations for that package level.",
  },
  {
    q_en: "What is included in VIP 1?",
    a_en: "VIP 1 includes:\n\n• One GA floor ticket or reserved seat in the best locations available\n• Early entry to the venue, where possible\n• Pre-show soundcheck\n• VIP group photo opportunity with Jay Park and LNGSHOT, with 5 fans per photo\n• Bye Session with Jay Park and LNGSHOT",
  },
  {
    q_en: "What is included in VIP 2?",
    a_en: "VIP 2 includes:\n\n• One GA floor ticket or reserved seat in the best locations available after VIP 1\n• Early entry to the venue, where possible\n• Pre-show soundcheck\n• Bye Session with Jay Park and LNGSHOT",
  },
  {
    q_en: "Can I transfer my VIP Package to someone else?",
    a_en: "VIP Packages are not transferable on Ticketmaster. Transfer policies may vary by ticketing platform, venue, and territory, so please check the official ticketing platform’s policies for your show before purchasing.",
  },
  {
    q_en: "What ID do I need for VIP check-in?",
    a_en: "Everyone checking in for a VIP experience on the day of the event will be required to show a valid government-issued photo ID that matches the name of the original purchaser. VIP ticket purchasers will receive an email with full details approximately three to five days prior to the show.",
  },
  {
    q_en: "When will VIP check-in and schedule details be sent?",
    a_en: "VIP ticket purchasers will receive an email with full details approximately three to five days prior to the show.",
  },
  {
    q_en: "What is the Bye Session?",
    a_en: "The Bye Session is a brief farewell interaction with Jay Park and LNGSHOT. Timing and format may vary depending on the city and day-of-show schedule, but it is intended as a short goodbye moment for VIP guests. Photos and videos are not permitted during the Bye Session.",
  },
  {
    q_en: "How many fans will be included in each VIP 1 group photo opportunity?",
    a_en: "VIP group photo opportunities are currently planned as group photos with 5 fans per photo.",
  },
  {
    q_en: "How will I receive my VIP photo?",
    a_en: "VIP 1 ticket purchasers will receive an email with full details on how to access their photos approximately three to five days prior to the show.",
  },
  {
    q_en: "Is VIP inventory different for the New York City show?",
    a_en: "For the NYC show, VIP tickets are currently expected to be limited to 400 total: 250 VIP 1 tickets and 150 VIP 2 tickets.",
  },
  {
    q_en: "Will NYC VIP guests be allowed to leave and re-enter the venue after VIP activities?",
    a_en: "NYC VIP guests may be required to remain inside the venue after entering for VIP activities. Final entry and re-entry instructions will be shared with VIP purchasers prior to the show.",
  },
  {
    q_en: "Will New York City have a Bye Session?",
    a_en: "For the NYC show, VIP Packages will include a Hi Session instead of a Bye Session. The Hi Session is a brief interaction with Jay Park and LNGSHOT before the show. Timing and format may vary depending on the day-of-show schedule. Photos and videos are not permitted during the Hi Session.",
  },
  {
    q_en: "How will tickets be delivered?",
    a_en: "Ticket delivery methods may vary by city, venue, and ticketing platform, and may include digital and/or physical delivery options. Please check the ticketing page for your city for the most accurate delivery information. Please ensure that your email address is correct when purchasing.",
  },
  {
    q_en: "Is the floor GA standing or seated?",
    a_en: "Floor setup may vary by venue. Please check the ticketing page for your city or contact the venue directly for the most accurate seating and floor information.",
  },
  {
    q_en: "What time do doors open?",
    a_en: "Door times vary by city and venue. Please check the official ticketing page for your show closer to the event date.",
  },
  {
    q_en: "What time does the show start?",
    a_en: "Show times vary by city and venue. Please check the official ticketing page for your show closer to the event date.",
  },
  {
    q_en: "Are there any trigger warnings for this show?",
    a_en: "There may be lasers, strobe lights, synthetic smoke and fog, and high-intensity sound at this show. Anyone sensitive to these elements should consider whether attending this show is advisable for them.",
  },
  {
    q_en: "Are there age restrictions?",
    a_en: "Age restrictions may vary by venue. Please check the official ticketing page or contact the venue directly before purchasing.",
  },
  {
    q_en: "What am I allowed to bring into the venue?",
    a_en: "Please contact the venue for the show you want to attend. Bag policies, prohibited items, and entry procedures vary by venue.",
  },
  { q_en: "Can I bring gifts for Jay Park or LNGSHOT?", a_en: "No. Gifts will not be accepted." },
  { q_en: "Can I bring fan signs or banners?", a_en: "Please follow venue rules and local regulations." },
  { q_en: "Can I bring lightsticks?", a_en: "Please follow venue rules and local regulations." },
  {
    q_en: "Will there be merchandise available at the show?",
    a_en: "Yes, official tour merchandise will be available for purchase at the show, subject to availability. For payment methods, merch booth hours, and venue-specific details, please check the venue or official show information closer to the event date.",
  },
  { q_en: "Will there be exclusive VIP merchandise?", a_en: "No." },
  { q_en: "Can I camp overnight or line up early?", a_en: "Please follow venue rules and local regulations." },
  {
    q_en: "Who can I contact for more information or issues regarding my tickets and/or VIP experiences?",
    a_en: "Please contact tour@morevision.kr.",
  },
];