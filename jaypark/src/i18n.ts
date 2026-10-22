import { useSyncExternalStore } from "react";
import type { TourRegion } from "./data/tourVenues";

export type Lang = "en" | "ko" | "es";

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: "en", label: "EN" },
  { id: "ko", label: "한" },
  { id: "es", label: "ES" },
];

const EN = {
  /* ---- 2A: tour page ---- */
  eyebrow: "2026 Jay Park World Tour [Serenades & Body Rolls] with LNGSHOT",
  regions: "LATAM · North America · Europe & UK",
  tour_title: "Tour Dates",
  faq_title: "FAQS",
  faq_intro:
    "Please read all FAQs carefully before purchasing tickets and/or VIP Packages. Please only buy through official sources. Questions? Contact tour@morevision.kr.",
  contact: "Contact",
  privacy: "Privacy Policy",
  btn_buy: "Tickets",
  all: "All",

  /* ---- 2B: JWalkerz presale sign-in ---- */
  presale_title: "JWalkerz Presale",
  presale_intro:
    "Presale tickets are only available to members of Jay Park's official fanclub, JWalkerz. Sign in with your Melon Ticket account to continue, or join the fanclub below.",
  presale_notice_title: "Presale only",
  presale_notice:
    "Only presale tickets are on sale right now, and presale is open to JWalkerz members only. General on-sale begins in {days} days.",
  signin_title: "Member sign-in",
  signin_sub: "Sign in to your JWalkerz membership with your Melon Ticket account.",
  username: "Username",
  password: "Password",
  sign_in: "Sign in",
  signing_in: "Signing in…",
  signed_in_as: "Signed in as {name}",
  continuing: "Taking you to seat selection…",
  verified_title: "Membership verified",
  join_title: "Join JWalkerz",
  join_sub: "Not a member yet? Join Jay Park's official fanclub through Melon Ticket to get presale access.",
  join_cta: "Sign up on Melon Ticket →",
  join_poster_alt: "JWalkerz membership recruitment poster",
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
    all: "전체",

    presale_title: "JWalkerz 선예매",
    presale_intro:
      "선예매는 박재범 공식 팬클럽 회원(JWalkerz)만 이용하실 수 있습니다. Melon 티켓 계정으로 로그인하시거나, 아래에서 팬클럽에 가입해 주세요.",
    presale_notice_title: "현재 선예매 진행 중",
    presale_notice:
      "현재는 선예매만 진행 중이며, 선예매는 JWalkerz 회원만 참여하실 수 있습니다. 일반 예매는 {days}일 후에 시작됩니다.",
    signin_title: "회원 로그인",
    signin_sub: "Melon 티켓 계정으로 로그인하여 JWalkerz 회원 인증을 진행해 주세요.",
    username: "아이디",
    password: "비밀번호",
    sign_in: "로그인",
    signing_in: "로그인 중…",
    signed_in_as: "{name}님, 로그인되었습니다",
    continuing: "좌석 선택 페이지로 이동합니다…",
    verified_title: "회원 인증 완료",
    join_title: "JWalkerz 가입하기",
    join_sub: "아직 회원이 아니신가요? Melon 티켓에서 박재범 공식 팬클럽에 가입하고 선예매에 참여하세요.",
    join_cta: "Melon 티켓에서 가입하기 →",
    join_poster_alt: "JWalkerz 회원 모집 포스터",
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
    all: "Todas",

    presale_title: "Preventa JWalkerz",
    presale_intro:
      "La preventa está disponible solo para miembros del club de fans oficial de Jay Park, JWalkerz. Inicia sesión con tu cuenta de Melon Ticket para continuar o únete al club de fans abajo.",
    presale_notice_title: "Solo preventa",
    presale_notice:
      "Por ahora solo está disponible la preventa, exclusiva para miembros de JWalkerz. La venta general comienza en {days} días.",
    signin_title: "Acceso de miembros",
    signin_sub: "Inicia sesión en tu membresía JWalkerz con tu cuenta de Melon Ticket.",
    username: "Usuario",
    password: "Contraseña",
    sign_in: "Iniciar sesión",
    signing_in: "Iniciando sesión…",
    signed_in_as: "Sesión iniciada como {name}",
    continuing: "Te llevamos a la selección de asientos…",
    verified_title: "Membresía verificada",
    join_title: "Únete a JWalkerz",
    join_sub: "¿Aún no eres miembro? Únete al club de fans oficial de Jay Park a través de Melon Ticket para acceder a la preventa.",
    join_cta: "Regístrate en Melon Ticket →",
    join_poster_alt: "Póster de reclutamiento de miembros de JWalkerz",
  },
};

export const REGION_LABELS: Record<Lang, Record<TourRegion, string>> = {
  en: { latam: "LATAM", na: "North America", eu: "Europe & UK" },
  ko: { latam: "라틴아메리카", na: "북미", eu: "유럽 & 영국" },
  es: { latam: "Latinoamérica", na: "Norteamérica", eu: "Europa y RU" },
};

/** UI string for `lang` (falling back to English), with {placeholders} filled from `vars`. */
export function t(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  const text = UI[lang][key] || EN[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
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