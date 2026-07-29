import workBigRock from "../assets/work-bigrock2.jpg";
import workCarlsonGracie from "../assets/work-carlsongracie.jpg";
import workCmg from "../assets/work-cmg.jpg";
import workChiropractic from "../assets/work-chiropractic.jpg";
import workConwayPd from "../assets/work-conwaypd.jpg";
import workDentist from "../assets/work-dentist.jpg";
import type { WorkCategory } from "../types/portfolio";
import { getSeoCategory } from "./seoCategories";

function seoDescription(slug: string) {
  return getSeoCategory(slug)?.description ?? "";
}

// Temporary covers use the strongest available source images. They are intentionally
// centralized so curated archive imagery can replace them without changing layouts.
export const workCategories: WorkCategory[] = [
  {
    id: "vehicle-wraps-fleet-graphics",
    slug: "vehicle-wraps-fleet-graphics",
    label: "Vehicle Wraps & Fleet Graphics",
    fallbackCoverImage: workBigRock,
    description: seoDescription("vehicle-wraps-fleet-graphics"),
    displayOrder: 1,
  },
  {
    id: "logo-identity-design",
    slug: "logo-identity-design",
    label: "Logo & Identity Design",
    fallbackCoverImage: workCarlsonGracie,
    description: seoDescription("logo-identity-design"),
    displayOrder: 2,
  },
  {
    id: "commercial-branding",
    slug: "commercial-branding",
    label: "Commercial Signage",
    fallbackCoverImage: workCmg,
    description: seoDescription("commercial-branding"),
    displayOrder: 3,
  },
  {
    id: "church-ministry-graphics",
    slug: "church-ministry-graphics",
    label: "Church & Ministry Graphics",
    fallbackCoverImage: workChiropractic,
    description: seoDescription("church-ministry-graphics"),
    displayOrder: 5,
  },
  {
    id: "public-safety-graphics",
    slug: "public-safety-graphics",
    label: "Public Safety Graphics",
    fallbackCoverImage: workConwayPd,
    description: seoDescription("public-safety-graphics"),
    displayOrder: 4,
  },
  {
    id: "specialty-projects",
    slug: "specialty-projects",
    label: "Specialty Projects",
    fallbackCoverImage: workDentist,
    description: seoDescription("specialty-projects"),
    displayOrder: 6,
  },
];

export function getWorkCategory(slug: string) {
  return workCategories.find((category) => category.slug === slug);
}
