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
    since1994: "Since 1994",
    oneMission: "One mission.",
    makeYou: "Make you",
    unforgettable: "unforgettable.",
    founderCopy: "Signs, wraps, environments and graphics that build credibility, attract attention and sell for you every single day.",
    ownerDesigner: "Barry Branscum, Owner, Designer",
    founderSignatureAlt: "Barry Branscum signature",
    founderPhotoAlt: "Barry Branscum applying dimensional letters to the Leona Kemper dental sign",
    notJust: "Not just a sign company.",
    problemSolving: "A problem solving company.",
    problemCopy: "We didn't build our reputation by selling signs. We built it by helping businesses get noticed.",
    sameTruck: "Same truck.",
    differentBusiness: "Different business.",
    beforeTruckAlt: "Mr. Clean Services van before its Brown Bear Carpet Cleaning graphics",
    afterTruckAlt: "The van after its Brown Bear Carpet Cleaning graphics were installed",
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
    sendingMessage: "Sending...",
    messageSent: "Message received.",
    inTouch: "Your project details are saved. We'll be in touch shortly.",
    messageError: "We couldn't receive your message. Please try again or call 501.329.1111.",
    portfolioUnavailable: "This portfolio is temporarily unavailable. Please try again shortly.",
    allRights: "All rights reserved.",
    backToTop: "Back to top",
    callUs: "Call Us",
    testimonials: "Testimonials",
    clientTestimonials: "Client testimonials",
    mobileContactActions: "Mobile contact actions",
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
    enlargeImage: "View larger image",
    closeImage: "Close image",
    categoryNavigation: "Continue exploring portfolio work",
    categorySwitch: "Switch portfolio category",
    categories: {
      "vehicle-wraps-fleet-graphics": "Vehicle Wraps & Fleet Graphics",
      "logo-identity-design": "Logo & Identity Design",
      "commercial-branding": "Commercial Signage",
      "church-ministry-graphics": "Church & Ministry Graphics",
      "public-safety-graphics": "Public Safety Graphics",
      "specialty-projects": "Specialty Projects",
    },
    shortCategories: {
      "vehicle-wraps-fleet-graphics": "Vehicle Wraps",
      "logo-identity-design": "Logo & Identity",
      "commercial-branding": "Commercial Signage",
      "church-ministry-graphics": "Church & Ministry",
      "public-safety-graphics": "Public Safety",
      "specialty-projects": "Specialty Projects",
    },
  },
  es: {
    heroFirst: "La Primera Impresión",
    heroMatter: "Cuenta.",
    heroSupport: "Letreros, rotulación y gráficos hechos para destacar.",
    whatWeDo: "Lo Que Hacemos",
    startProject: "Inicie Su Proyecto",
    featuredWork: "Trabajo Destacado",
    browse: "Ver",
    thirtyYears: "Treinta años.",
    since1994: "Desde 1994",
    oneMission: "Una misión.",
    makeYou: "Hacerle",
    unforgettable: "inolvidable.",
    founderCopy: "Letreros, rotulación, ambientes y gráficos que generan credibilidad, atraen atención y trabajan para usted todos los días.",
    ownerDesigner: "Barry Branscum, Propietario y Diseñador",
    founderSignatureAlt: "Firma de Barry Branscum",
    founderPhotoAlt: "Barry Branscum colocando letras dimensionales en el letrero dental de Leona Kemper",
    notJust: "No somos solo una empresa de letreros.",
    problemSolving: "Resolvemos problemas.",
    problemCopy: "No construimos nuestra reputación vendiendo letreros. La construimos ayudando a las empresas a hacerse notar.",
    sameTruck: "El mismo camión.",
    differentBusiness: "Un negocio diferente.",
    beforeTruckAlt: "La furgoneta de Mr. Clean Services antes de sus gráficos de Brown Bear Carpet Cleaning",
    afterTruckAlt: "La furgoneta después de instalar sus gráficos de Brown Bear Carpet Cleaning",
    differenceThe: "La Diferencia",
    differenceWord: "MTD",
    differenceCopy: "Hacemos que su señalización refleje la calidad de su trabajo.",
    readyWhen: "Listos Cuando",
    youAre: "Usted Lo Esté.",
    name: "Nombre",
    email: "Correo electrónico",
    phone: "Teléfono",
    projectDetails: "Detalles del proyecto",
    sendMessage: "Enviar mensaje",
    sendingMessage: "Enviando...",
    messageSent: "Mensaje recibido.",
    inTouch: "Guardamos los detalles de su proyecto. Nos comunicaremos pronto.",
    messageError: "No pudimos recibir su mensaje. Inténtelo de nuevo o llame al 501.329.1111.",
    portfolioUnavailable: "Este portafolio no está disponible temporalmente. Inténtelo de nuevo en unos momentos.",
    allRights: "Todos los derechos reservados.",
    backToTop: "Volver arriba",
    callUs: "Llámenos",
    testimonials: "Testimonios",
    clientTestimonials: "Testimonios de clientes",
    mobileContactActions: "Opciones de contacto móvil",
    whatClientsSay: "Lo que dicen los clientes",
    noTestimonials: "Aún no hay testimonios aprobados de clientes.",
    noTestimonialsCopy: "Este carrusel está listo para comentarios aprobados de clientes y aparecerá aquí cuando se active un testimonio en el área privada de administración.",
    previousTestimonial: "Testimonio anterior",
    nextTestimonial: "Siguiente testimonio",
    backToFeaturedWork: "Volver al Trabajo Destacado",
    home: "Inicio",
    backToFeatured: "Volver a Destacados",
    project: "Proyecto",
    backToWork: "Volver al Trabajo",
    featured: "Destacado",
    archive: "Archivo",
    featuredImages: "imágenes destacadas",
    archiveImages: "imágenes del archivo",
    featuredSoon: "Las imágenes destacadas de esta categoría se agregarán pronto.",
    archiveSoon: "Pronto se agregará más trabajo a esta categoría.",
    projectSoon: "Pronto se agregará trabajo de este proyecto.",
    developmentPreview: "Vista de desarrollo con muestras temporales de imágenes locales. Conecte Cloudflare R2 y D1 para publicar el portafolio seleccionado.",
    seeMoreWork: "Ver Más Trabajo Como Este",
    viewFeatured: "Ver Destacados",
    seeMoreProject: "Ver más de este proyecto",
    enlargeImage: "Ver imagen ampliada",
    closeImage: "Cerrar imagen",
    categoryNavigation: "Seguir explorando el portafolio",
    categorySwitch: "Cambiar categoría del portafolio",
    categories: {
      "vehicle-wraps-fleet-graphics": "Rotulación de Vehículos y Flotillas",
      "logo-identity-design": "Diseño de Logotipo e Identidad",
      "commercial-branding": "Señalización Comercial",
      "church-ministry-graphics": "Gráficos para Iglesias y Ministerios",
      "public-safety-graphics": "Gráficos de Seguridad Pública",
      "specialty-projects": "Proyectos Especiales",
    },
    shortCategories: {
      "vehicle-wraps-fleet-graphics": "Rotulación de Vehículos",
      "logo-identity-design": "Logotipo e Identidad",
      "commercial-branding": "Señalización Comercial",
      "church-ministry-graphics": "Iglesias y Ministerios",
      "public-safety-graphics": "Seguridad Pública",
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
