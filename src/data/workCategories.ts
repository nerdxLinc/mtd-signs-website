import workBigRock from "../assets/work-bigrock2.jpg";
import workCarlsonGracie from "../assets/work-carlsongracie.jpg";
import workCmg from "../assets/work-cmg.jpg";
import workChiropractic from "../assets/work-chiropractic.jpg";
import workConwayPd from "../assets/work-conwaypd.jpg";
import workDentist from "../assets/work-dentist.jpg";
import type { WorkCategory } from "../types/portfolio";

// Temporary covers use the strongest available source images. They are intentionally
// centralized so curated archive imagery can replace them without changing layouts.
export const workCategories: WorkCategory[] = [
  {
    id: "vehicle-wraps-fleet-graphics",
    slug: "vehicle-wraps-fleet-graphics",
    label: "Vehicle Wraps & Fleet Graphics",
    fallbackCoverImage: workBigRock,
    description: "Vehicle graphics and fleet applications.",
    displayOrder: 1,
  },
  {
    id: "logo-identity-design",
    slug: "logo-identity-design",
    label: "Logo & Identity Design",
    fallbackCoverImage: workCarlsonGracie,
    description: "Identity work and applied brand marks.",
    displayOrder: 2,
  },
  {
    id: "commercial-branding",
    slug: "commercial-branding",
    label: "Commercial Signage",
    fallbackCoverImage: workCmg,
    description: "Commercial graphics, signage, and branded environments.",
    displayOrder: 3,
  },
  {
    id: "church-ministry-graphics",
    slug: "church-ministry-graphics",
    label: "Church & Ministry Graphics",
    fallbackCoverImage: workChiropractic,
    description: "A temporary category cover for ministry-focused work.",
    displayOrder: 5,
  },
  {
    id: "public-safety-graphics",
    slug: "public-safety-graphics",
    label: "Public Safety Graphics",
    fallbackCoverImage: workConwayPd,
    description: "Public-safety and civic vehicle graphics.",
    displayOrder: 4,
  },
  {
    id: "specialty-projects",
    slug: "specialty-projects",
    label: "Specialty Projects",
    fallbackCoverImage: workDentist,
    description: "Special-format work beyond a single category.",
    displayOrder: 6,
  },
];

export function getWorkCategory(slug: string) {
  return workCategories.find((category) => category.slug === slug);
}
