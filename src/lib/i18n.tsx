import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "es";

const copy = {
  en: {
    heroFirst: "First Impressions",
    heroMatter: "Matter.",
    heroSupport: "Signs, wraps, and graphics made to be seen.",
    whatWeDo: "What We Do",
    startProject: "Start Your Project",
    featuredWork: "Featured Work",
    browse: "Browse",
    thirtyYears: "Thirty years.",
    oneMission: "One mission.",
    makeYou: "Make you",
    unforgettable: "unforgettable.",
    founderCopy: "Signs, wraps, environments and graphics that build credibility, attract attention and sell for you every single day.",
    ownerDesigner: "Barry Branscum, Owner, Designer",
    notJust: "Not just a sign company.",
    problemSolving: "A problem solving company.",
    problemCopy: "We didnâ€™t build our reputation by selling signs. We built it by helping businesses get noticed.",
    sameTruck: "Same truck.",
    differentBusiness: "Different business.",
    differenceThe: "The MTD",
    differenceWord: "Difference",
    differenceCopy: "We make your signage reflect the quality of your work.",
    readyWhen: "Ready When",
    youAre: "You Are.",
    name: "Name",
    email: "Email",
    phone: "Phone",
    projectDetails: "Project Details",
    sendMessage: "Send Message",
    messageSent: "Message sent.",
    inTouch: "Weâ€™ll be in touch shortly.",
    allRights: "All rights reserved.",
    backToTop: "Back to top",
    callUs: "Call Us",
    testimonials: "Testimonials",
    whatClientsSay: "What clients say",
    noTestimonials: "No approved client testimonials are active yet.",
    noTestimonialsCopy: "This carousel is ready for approved client feedback and will appear here once a testimonial is activated in the private admin area.",
    previousTestimonial: "Previous testimonial",
    nextTestimonial: "Next testimonial",
    backToFeaturedWork: "Back to Featured Work",
    home: "Home",
    backToFeatured: "Back to Featured",
    project: "Project",
    backToWork: "Back to Work",
    featured: "Featured",
    archive: "Archive",
    featuredImages: "featured images",
    archiveImages: "archive images",
    featuredSoon: "Featured images for this category will be added soon.",
    archiveSoon: "More work for this category will be added soon.",
    projectSoon: "Work from this project will be added soon.",
    developmentPreview: "Development preview using temporary local image samples. Connect Cloudflare R2 and D1 to publish the curated portfolio.",
    seeMoreWork: "See More Work Like This",
    viewFeatured: "View Featured",
    seeMoreProject: "See more from this project",
    categoryNavigation: "Continue exploring portfolio work",
    categorySwitch: "Switch portfolio category",
    categories: {
      "vehicle-wraps-fleet-graphics": "Vehicle Wraps & Fleet Graphics",
      "logo-identity-design": "Logo & Identity Design",
      "commercial-branding": "Commercial Branding",
      "church-ministry-graphics": "Church & Ministry Graphics",
      "public-safety-graphics": "Public Safety Graphics",
      "specialty-projects": "Specialty Projects",
    },
    shortCategories: {
      "vehicle-wraps-fleet-graphics": "Vehicle Wraps",
      "logo-identity-design": "Logo & Identity",
      "commercial-branding": "Commercial Branding",
      "church-ministry-graphics": "Church & Ministry",
      "public-safety-graphics": "Public Safety",
      "specialty-projects": "Specialty Projects",
    },
  },
  es: {
    heroFirst: "La Primera ImpresiÃ³n",
    heroMatter: "Cuenta.",
    heroSupport: "Letreros, rotulaciÃ³n y grÃ¡ficos hechos para destacar.",
    whatWeDo: "Lo Que Hacemos",
    startProject: "Inicie Su Proyecto",
    featuredWork: "Trabajo Destacado",
    browse: "Ver",
    thirtyYears: "Treinta aÃ±os.",
    oneMission: "Una misiÃ³n.",
    makeYou: "Hacerle",
    unforgettable: "inolvidable.",
    founderCopy: "Letreros, rotulaciÃ³n, ambientes y grÃ¡ficos que generan credibilidad, atraen atenciÃ³n y trabajan para usted todos los dÃ­as.",
    ownerDesigner: "Barry Branscum, Propietario y DiseÃ±ador",
    notJust: "No somos solo una empresa de letreros.",
    problemSolving: "Resolvemos problemas.",
    problemCopy: "No construimos nuestra reputaciÃ³n vendiendo letreros. La construimos ayudando a las empresas a hacerse notar.",
    sameTruck: "El mismo camiÃ³n.",
    differentBusiness: "Un negocio diferente.",
    differenceThe: "La Diferencia",
    differenceWord: "MTD",
    differenceCopy: "Hacemos que su seÃ±alizaciÃ³n refleje la calidad de su trabajo.",
    readyWhen: "Listos Cuando",
    youAre: "Usted Lo EstÃ©.",
    name: "Nombre",
    email: "Correo electrÃ³nico",
    phone: "TelÃ©fono",
    projectDetails: "Detalles del proyecto",
    sendMessage: "Enviar mensaje",
    messageSent: "Mensaje enviado.",
    inTouch: "Nos comunicaremos pronto.",
    allRights: "Todos los derechos reservados.",
    backToTop: "Volver arriba",
    callUs: "LlÃ¡menos",
    testimonials: "Testimonios",
    whatClientsSay: "Lo que dicen los clientes",
    noTestimonials: "AÃºn no hay testimonios aprobados de clientes.",
    noTestimonialsCopy: "Este carrusel estÃ¡ listo para comentarios aprobados de clientes y aparecerÃ¡ aquÃ­ cuando se active un testimonio en el Ã¡rea privada de administraciÃ³n.",
    previousTestimonial: "Testimonio anterior",
    nextTestimonial: "Siguiente testimonio",
    backToFeaturedWork: "Volver al Trabajo Destacado",
    home: "Inicio",
    backToFeatured: "Volver a Destacados",
    project: "Proyecto",
    backToWork: "Volver al Trabajo",
    featured: "Destacado",
    archive: "Archivo",
    featuredImages: "imÃ¡genes destacadas",
    archiveImages: "imÃ¡genes del archivo",
    featuredSoon: "Las imÃ¡genes destacadas de esta categorÃ­a se agregarÃ¡n pronto.",
    archiveSoon: "Pronto se agregarÃ¡ mÃ¡s trabajo a esta categorÃ­a.",
    projectSoon: "Pronto se agregarÃ¡ trabajo de este proyecto.",
    developmentPreview: "Vista de desarrollo con muestras temporales de imÃ¡genes locales. Conecte Cloudflare R2 y D1 para publicar el portafolio seleccionado.",
    seeMoreWork: "Ver MÃ¡s Trabajo Como Este",
    viewFeatured: "Ver Destacados",
    seeMoreProject: "Ver mÃ¡s de este proyecto",
    categoryNavigation: "Seguir explorando el portafolio",
    categorySwitch: "Cambiar categorÃ­a del portafolio",
    categories: {
      "vehicle-wraps-fleet-graphics": "RotulaciÃ³n de VehÃ­culos y Flotillas",
      "logo-identity-design": "DiseÃ±o de Logotipo e Identidad",
      "commercial-branding": "Marca Comercial",
      "church-ministry-graphics": "GrÃ¡ficos para Iglesias y Ministerios",
      "public-safety-graphics": "GrÃ¡ficos de Seguridad PÃºblica",
      "specialty-projects": "Proyectos Especiales",
    },
    shortCategories: {
      "vehicle-wraps-fleet-graphics": "RotulaciÃ³n de VehÃ­culos",
      "logo-identity-design": "Logotipo e Identidad",
      "commercial-branding": "Marca Comercial",
      "church-ministry-graphics": "Iglesias y Ministerios",
      "public-safety-graphics": "Seguridad PÃºblica",
      "specialty-projects": "Proyectos Especiales",
    },
  },
} as const;

type CopyKey = Exclude<keyof typeof copy.en, "categories" | "shortCategories">;
type TranslationContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: CopyKey) => string;
  categoryLabel: (categoryId: string, fallback: string, short?: boolean) => string;
};

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("mtd-language") === "es" ? "es" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("mtd-language", language);
  }, [language]);

  const value = useMemo<TranslationContextValue>(() => ({
    language,
    setLanguage,
    t: (key) => copy[language][key] as string,
    categoryLabel: (categoryId, fallback, short = false) => {
      const labels = short ? copy[language].shortCategories : copy[language].categories;
      return labels[categoryId as keyof typeof labels] ?? fallback;
    },
  }), [language]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useTranslation must be used inside LanguageProvider");
  return context;
}
