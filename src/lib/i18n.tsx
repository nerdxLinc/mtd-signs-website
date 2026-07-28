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
    problemCopy: "We didn't build our reputation by selling signs. We built it by helping businesses get noticed.",
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
    inTouch: "We'll be in touch shortly.",
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
    heroFirst: "La Primera Impresion",
    heroMatter: "Cuenta.",
    heroSupport: "Letreros, rotulacion y graficos hechos para destacar.",
    whatWeDo: "Lo Que Hacemos",
    startProject: "Inicie Su Proyecto",
    featuredWork: "Trabajo Destacado",
    browse: "Ver",
    thirtyYears: "Treinta anos.",
    oneMission: "Una mision.",
    makeYou: "Hacerle",
    unforgettable: "inolvidable.",
    founderCopy: "Letreros, rotulacion, ambientes y graficos que generan credibilidad, atraen atencion y trabajan para usted todos los dias.",
    ownerDesigner: "Barry Branscum, Propietario y Disenador",
    notJust: "No somos solo una empresa de letreros.",
    problemSolving: "Resolvemos problemas.",
    problemCopy: "No construimos nuestra reputacion vendiendo letreros. La construimos ayudando a las empresas a hacerse notar.",
    sameTruck: "El mismo camion.",
    differentBusiness: "Un negocio diferente.",
    differenceThe: "La Diferencia",
    differenceWord: "MTD",
    differenceCopy: "Hacemos que su senalizacion refleje la calidad de su trabajo.",
    readyWhen: "Listos Cuando",
    youAre: "Usted Lo Este.",
    name: "Nombre",
    email: "Correo electronico",
    phone: "Telefono",
    projectDetails: "Detalles del proyecto",
    sendMessage: "Enviar mensaje",
    messageSent: "Mensaje enviado.",
    inTouch: "Nos comunicaremos pronto.",
    allRights: "Todos los derechos reservados.",
    backToTop: "Volver arriba",
    callUs: "Llamenos",
    testimonials: "Testimonios",
    whatClientsSay: "Lo que dicen los clientes",
    noTestimonials: "Aun no hay testimonios aprobados de clientes.",
    noTestimonialsCopy: "Este carrusel esta listo para comentarios aprobados de clientes y aparecera aqui cuando se active un testimonio en el area privada de administracion.",
    previousTestimonial: "Testimonio anterior",
    nextTestimonial: "Siguiente testimonio",
    backToFeaturedWork: "Volver al Trabajo Destacado",
    home: "Inicio",
    backToFeatured: "Volver a Destacados",
    project: "Proyecto",
    backToWork: "Volver al Trabajo",
    featured: "Destacado",
    archive: "Archivo",
    featuredImages: "imagenes destacadas",
    archiveImages: "imagenes del archivo",
    featuredSoon: "Las imagenes destacadas de esta categoria se agregaran pronto.",
    archiveSoon: "Pronto se agregara mas trabajo a esta categoria.",
    projectSoon: "Pronto se agregara trabajo de este proyecto.",
    developmentPreview: "Vista de desarrollo con muestras temporales de imagenes locales. Conecte Cloudflare R2 y D1 para publicar el portafolio seleccionado.",
    seeMoreWork: "Ver Mas Trabajo Como Este",
    viewFeatured: "Ver Destacados",
    seeMoreProject: "Ver mas de este proyecto",
    enlargeImage: "Ver imagen ampliada",
    closeImage: "Cerrar imagen",
    categoryNavigation: "Seguir explorando el portafolio",
    categorySwitch: "Cambiar categoria del portafolio",
    categories: {
      "vehicle-wraps-fleet-graphics": "Rotulacion de Vehiculos y Flotillas",
      "logo-identity-design": "Diseno de Logotipo e Identidad",
      "commercial-branding": "Senalizacion Comercial",
      "church-ministry-graphics": "Graficos para Iglesias y Ministerios",
      "public-safety-graphics": "Graficos de Seguridad Publica",
      "specialty-projects": "Proyectos Especiales",
    },
    shortCategories: {
      "vehicle-wraps-fleet-graphics": "Rotulacion de Vehiculos",
      "logo-identity-design": "Logotipo e Identidad",
      "commercial-branding": "Senalizacion Comercial",
      "church-ministry-graphics": "Iglesias y Ministerios",
      "public-safety-graphics": "Seguridad Publica",
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

