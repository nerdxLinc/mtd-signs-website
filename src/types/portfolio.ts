export type PortfolioStatus = "featured" | "archive";

export type WorkCategory = {
  id: string;
  slug: string;
  label: string;
  fallbackCoverImage: string;
  description: string;
  displayOrder: number;
};

export type PortfolioImage = {
  id: string;
  categoryId: string;
  status: PortfolioStatus;
  rank: number;
  isCategoryCover: boolean;
  isHidden: boolean;
  imageUrl: string;
  altText: string;
  filename: string;
  sourceZip?: string;
  projectKey?: string;
  projectLabel?: string;
  projectCount?: number;
};

export type TestimonialRecord = {
  id: string;
  text: string;
  clientName: string;
  isActive: boolean;
  displayOrder: number;
};
