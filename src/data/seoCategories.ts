export type SeoCategory = {
  id: string;
  slug: string;
  label: string;
  description: string;
};

export const seoCategories: SeoCategory[] = [
  {
    id: "vehicle-wraps-fleet-graphics",
    slug: "vehicle-wraps-fleet-graphics",
    label: "Vehicle Wraps & Fleet Graphics",
    description: "Custom vehicle wraps and fleet graphics designed to make work trucks, vans, trailers, and commercial fleets recognizable on the road throughout Arkansas.",
  },
  {
    id: "logo-identity-design",
    slug: "logo-identity-design",
    label: "Logo & Identity Design",
    description: "Logo and identity design built to stay clear and consistent across signs, vehicles, printed materials, uniforms, and digital use.",
  },
  {
    id: "commercial-branding",
    slug: "commercial-branding",
    label: "Commercial Signage",
    description: "Commercial signs and branded graphics that help Arkansas businesses look established, attract attention, and stay recognizable from the street.",
  },
  {
    id: "church-ministry-graphics",
    slug: "church-ministry-graphics",
    label: "Church & Ministry Graphics",
    description: "Banners, signs, vehicle graphics, and ministry communication materials designed to help churches carry a clear, consistent message beyond their walls.",
  },
  {
    id: "public-safety-graphics",
    slug: "public-safety-graphics",
    label: "Public Safety Graphics",
    description: "High-visibility vehicle lettering and graphics for police, fire, emergency, and other public-safety fleets, designed for clarity and professional presence.",
  },
  {
    id: "specialty-projects",
    slug: "specialty-projects",
    label: "Specialty Projects",
    description: "Custom graphics, dimensional displays, installations, and one-of-a-kind visual projects that do not fit a standard signage category.",
  },
];

export function getSeoCategory(slug: string) {
  return seoCategories.find((category) => category.slug === slug);
}
