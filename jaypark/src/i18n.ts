import { useSyncExternalStore } from "react";
import type { TourRegion } from "./data/tourVenues";

export type Lang = "en" | "ko" | "es";

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: "en", label: "EN" },
  { id: "ko", label: "한" },
  { id: "es", label: "ES" },
];

const EN = {
  eyebrow: "2026 Jay Park World Tour [Serenades & Body Rolls] with LNGSHOT",
  regions: "LATAM · North America · Europe & UK",
  tour_title: "Tour Dates",
  faq_title: "FAQS",
  faq_intro:
    "Please read all FAQs carefully before purchasing tickets and/or VIP Packages. Please only buy through official sources. Questions? Contact tour@morevision.kr.",
  contact: "Contact",
  privacy: "Privacy Policy",
  btn_buy: "Tickets",
  btn_checking: "Checking…",
  all: "All",
};

export type UiKey = keyof typeof EN;

const UI: Record<Lang, Partial<Record<UiKey, string>>> = {
  en: EN,
  ko: {
    eyebrow: "Jay Park 2026 월드투어 with LNGSHOT",
    regions: "라틴아메리카 · 북미 · 유럽 & 영국",
    tour_title: "투어 일정",
    faq_title: "자주 묻는 질문",
    faq_intro:
      "티켓 및 VIP 패키지를 구매하기 전에 FAQ를 꼼꼼히 읽어주세요. 반드시 공식 채널을 통해서만 구매하시기 바랍니다. 문의: tour@morevision.kr",
    contact: "문의하기",
    privacy: "Privacy Policy",
    btn_buy: "Tickets",
    btn_checking: "확인 중…",
    all: "전체",
  },
  es: {
    eyebrow: "Jay Park 2026 World Tour con LNGSHOT",
    regions: "Latinoamérica · Norteamérica · Europa y Reino Unido",
    tour_title: "Fechas de la gira",
    faq_title: "Preguntas frecuentes",
    faq_intro:
      "Lee todas las preguntas frecuentes con atención antes de comprar entradas o paquetes VIP. Compra únicamente a través de canales oficiales. ¿Dudas? tour@morevision.kr",
    contact: "Contacto",
    privacy: "Privacy Policy",
    btn_buy: "Tickets",
    btn_checking: "Comprobando…",
    all: "Todas",
  },
};

export const REGION_LABELS: Record<Lang, Record<TourRegion, string>> = {
  en: { latam: "LATAM", na: "North America", eu: "Europe & UK" },
  ko: { latam: "라틴아메리카", na: "북미", eu: "유럽 & 영국" },
  es: { latam: "Latinoamérica", na: "Norteamérica", eu: "Europa y RU" },
};

/** UI string for `lang`, falling back to English. */
export function t(lang: Lang, key: UiKey): string {
  return UI[lang][key] || EN[key];
}

/* ------------- shared language state (persisted like the original page) ------------- */

const STORAGE_KEY = "sbr_lang";

function readStored(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "en" || value === "ko" || value === "es") return value;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

let current: Lang = readStored();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener());
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => current);
}