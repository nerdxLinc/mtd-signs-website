import Hero from "./components/Hero";
import FounderStatement from "./components/FounderStatement";
import FeaturedWork from "./components/FeaturedWork";
import QuoteImpact from "./components/QuoteImpact";
import BeforeAfter from "./components/BeforeAfter";
import ProblemSolving from "./components/ProblemSolving";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import { getWorkCategory } from "./data/workCategories";
import CategoryGalleryPage from "./pages/CategoryGalleryPage";
import CategoryArchivePage from "./pages/CategoryArchivePage";
import ProjectGalleryPage from "./pages/ProjectGalleryPage";
import WorkRedirect from "./pages/WorkRedirect";
import AdminPage from "./pages/AdminPage";
import MobileContactBar from "./components/MobileContactBar";
import { useBrowserPath } from "./router";
import { useEffect } from "react";
import LanguageToggle from "./components/LanguageToggle";
import { useTranslation } from "./lib/i18n";
import SeoManager from "./components/SeoManager";

function PublicPage({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const scrollToHashTarget = () => {
      const targetId = window.location.hash.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;

      if (target) {
        window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    };

    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, []);

  return (
    <div className="public-page-shell min-h-screen bg-ink">
      <LanguageToggle />
      <div className="public-page-scroll">{children}</div>
      <MobileContactBar />
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const path = useBrowserPath().replace(/\/$/, "") || "/";
  const workPath = path.startsWith("/work/") ? path.replace("/work/", "") : "";
  const projectKey = path.startsWith("/projects/") ? path.replace("/projects/", "") : "";
  const isArchive = workPath.endsWith("/archive");
  const category = workPath ? getWorkCategory(workPath.replace(/\/archive$/, "")) : undefined;

  if (path === "/work") {
    return <><SeoManager path={path} /><WorkRedirect /></>;
  }

  if (projectKey && !projectKey.includes("/")) {
    return <><SeoManager path={path} /><PublicPage><ProjectGalleryPage projectKey={projectKey} /></PublicPage></>;
  }

  if (category) {
    return <><SeoManager path={path} /><PublicPage>{isArchive ? <CategoryArchivePage category={category} /> : <CategoryGalleryPage category={category} />}</PublicPage></>;
  }

  if (path === "/admin") {
    return <><SeoManager path={path} /><AdminPage /></>;
  }

  return (
    <>
    <SeoManager path={path} />
    <PublicPage>
      <main>
        <Hero />
        <FeaturedWork />
        <FounderStatement />
        <ProblemSolving />
        <QuoteImpact />
        <section id="difference" className="bg-ink px-4 pb-10 sm:px-8 sm:pb-12 lg:pb-14">
          <div className="mx-auto max-w-[1400px]">
            <h2 className="font-display text-5xl font-semibold uppercase leading-[0.88] text-bone sm:text-7xl lg:text-8xl">
              <span className="block">{t("differenceThe")}</span>
              <span className="block text-orange">{t("differenceWord")}</span>
            </h2>
            <span className="mt-5 block h-px w-20 bg-orange" />
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-bone/70 sm:text-lg">
              {t("differenceCopy")}
            </p>
          </div>
        </section>
        <BeforeAfter />
        <Contact />
      </main>
      <Footer />
    </PublicPage>
    </>
  );
}
