import { useEffect, useState } from "react";

export type Locale = "en" | "sq";

const dict = {
  en: {
    greeting_morning: "Good morning",
    greeting_evening: "Good evening",
    ask_perx: "Ask PERX: find me a gym near Blloku or a weekend retreat...",
    monthly_wallet: "Monthly wallet",
    add_to_cart: "Add",
    in_cart: "In cart",
    submit_for_approval: "Submit for approval",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    marketplace: "Marketplace",
    concierge: "Concierge",
    cart: "Cart",
    requests: "Requests",
    employer_dashboard: "Employer",
    provider_dashboard: "Provider",
    home: "Home",
    sign_out: "Sign out",
    seasonal_drops: "Seasonal drops",
    smart_package: "AI Smart package",
    of: "of",
    all_categories: "All",
  },
  sq: {
    greeting_morning: "Mirëmëngjes",
    greeting_evening: "Mirëmbrëma",
    ask_perx: "Pyet PERX: gjej një palestër pranë Bllokut ose një fundjavë...",
    monthly_wallet: "Portofoli mujor",
    add_to_cart: "Shto",
    in_cart: "Në shportë",
    submit_for_approval: "Dërgo për miratim",
    pending: "Në pritje",
    approved: "Miratuar",
    rejected: "Refuzuar",
    marketplace: "Tregu",
    concierge: "Asistent",
    cart: "Shportë",
    requests: "Kërkesat",
    employer_dashboard: "Punëdhënësi",
    provider_dashboard: "Ofruesi",
    home: "Kreu",
    sign_out: "Dil",
    seasonal_drops: "Oferta sezonale",
    smart_package: "Paketë AI",
    of: "nga",
    all_categories: "Të gjitha",
  },
} as const;

type Key = keyof typeof dict["en"];

let currentLocale: Locale = "en";
const listeners = new Set<(l: Locale) => void>();

export function setLocale(l: Locale) {
  currentLocale = l;
  if (typeof window !== "undefined") localStorage.setItem("perx_locale", l);
  listeners.forEach((fn) => fn(l));
}

export function useLocale() {
  const [locale, set] = useState<Locale>(currentLocale);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = (localStorage.getItem("perx_locale") as Locale | null) ?? "en";
      if (stored !== currentLocale) {
        currentLocale = stored;
        set(stored);
      }
    }
    const fn = (l: Locale) => set(l);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const t = (key: Key) => dict[locale][key] ?? dict.en[key];
  return { locale, setLocale, t };
}

export function formatAll(n: number, locale: Locale = currentLocale) {
  const formatter = new Intl.NumberFormat(locale === "sq" ? "sq-AL" : "en-US");
  return `${formatter.format(n)} ALL`;
}