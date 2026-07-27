import workBigRock from "../assets/work-bigrock2.jpg";
import workBrownBear from "../assets/work-brownbear.jpg";
import workCarlsonGracie from "../assets/work-carlsongracie.jpg";
import workChiropractic from "../assets/work-chiropractic.jpg";
import workCmg from "../assets/work-cmg.jpg";
import workConwayPd from "../assets/work-conwaypd.jpg";
import workDentist from "../assets/work-dentist.jpg";
import workFelland from "../assets/work-felland.jpg";
import workHurtado from "../assets/work-hurtado.jpg";
import type { PortfolioImage } from "../types/portfolio";

// Development-only samples. Cloudflare D1 and R2 become the public source when
// their bindings are connected; these keep local builds useful in the meantime.
export const developmentPortfolioImages: PortfolioImage[] = [
  { id: "dev-big-rock", categoryId: "vehicle-wraps-fleet-graphics", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workBigRock, altText: "Big Rock Junk Removal truck graphics", filename: "big-rock-junk-removal-truck.jpg" },
  { id: "dev-hurtado", categoryId: "vehicle-wraps-fleet-graphics", status: "featured", rank: 2, isCategoryCover: false, isHidden: false, imageUrl: workHurtado, altText: "Hurtado Roofing work truck graphics", filename: "hurtado-roofing-pro-truck.jpg" },
  { id: "dev-brown-bear", categoryId: "vehicle-wraps-fleet-graphics", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workBrownBear, altText: "Brown Bear Carpet Cleaning vehicle graphic", filename: "brown-bear-carpet-cleaning.jpg" },
  { id: "dev-carlson", categoryId: "logo-identity-design", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workCarlsonGracie, altText: "Carlson Gracie identity application", filename: "carlson-gracie-vilonia.jpg" },
  { id: "dev-felland", categoryId: "logo-identity-design", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workFelland, altText: "Felland Bros. applied identity graphic", filename: "felland-bros-identity.jpg" },
  { id: "dev-cmg", categoryId: "commercial-branding", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workCmg, altText: "Conway Marble and Granite branded vehicle", filename: "conway-marble-granite.jpg" },
  { id: "dev-brown-commercial", categoryId: "commercial-branding", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workBrownBear, altText: "Brown Bear Carpet Cleaning commercial vehicle application", filename: "brown-bear-carpet-cleaning-truck-application.jpg" },
  { id: "dev-dentist", categoryId: "church-ministry-graphics", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workDentist, altText: "Dimensional sign example", filename: "dimensional-sign-example.jpg" },
  { id: "dev-church-archive", categoryId: "church-ministry-graphics", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workFelland, altText: "Ministry graphic application sample", filename: "ministry-graphic-application.jpg" },
  { id: "dev-public-safety", categoryId: "public-safety-graphics", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workConwayPd, altText: "Public safety vehicle graphic", filename: "conway-public-safety-vehicle.jpg" },
  { id: "dev-public-safety-archive", categoryId: "public-safety-graphics", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workBigRock, altText: "Public-service vehicle graphic sample", filename: "public-service-vehicle-sample.jpg" },
  { id: "dev-specialty", categoryId: "specialty-projects", status: "featured", rank: 1, isCategoryCover: true, isHidden: false, imageUrl: workChiropractic, altText: "Specialty sign application", filename: "specialty-sign-application.jpg" },
  { id: "dev-specialty-archive", categoryId: "specialty-projects", status: "archive", rank: 1, isCategoryCover: false, isHidden: false, imageUrl: workDentist, altText: "Specialty project sample", filename: "specialty-project-sample.jpg" },
];
