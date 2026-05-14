import type { ExperienceRecipe, ExperienceSurfaceCatalogFile, SiteVertical } from "./index";
import autoOemRecipes from "./context-packs/experience-recipes/auto-oem.json";
import autoRetailRecipes from "./context-packs/experience-recipes/auto-retail.json";
import b2bSaasRecipes from "./context-packs/experience-recipes/b2b-saas.json";
import ecommerceRecipes from "./context-packs/experience-recipes/ecommerce.json";
import financialRecipes from "./context-packs/experience-recipes/financial-services.json";
import genericRecipes from "./context-packs/experience-recipes/generic.json";
import healthcareRecipes from "./context-packs/experience-recipes/healthcare.json";
import publisherRecipes from "./context-packs/experience-recipes/publisher.json";
import autoOemSurfaces from "./context-packs/surface-catalogs/auto-oem.json";
import autoRetailSurfaces from "./context-packs/surface-catalogs/auto-retail.json";
import b2bSaasSurfaces from "./context-packs/surface-catalogs/b2b-saas.json";
import ecommerceSurfaces from "./context-packs/surface-catalogs/ecommerce.json";
import financialSurfaces from "./context-packs/surface-catalogs/financial-services.json";
import genericSurfaces from "./context-packs/surface-catalogs/generic.json";
import healthcareSurfaces from "./context-packs/surface-catalogs/healthcare.json";
import publisherSurfaces from "./context-packs/surface-catalogs/publisher.json";

export type ExperiencePackKey =
  | "auto-oem"
  | "auto-retail"
  | "b2b-saas"
  | "ecommerce"
  | "financial-services"
  | "healthcare"
  | "publisher"
  | "generic";

const VERTICAL_TO_PACK: Record<SiteVertical, ExperiencePackKey> = {
  auto_oem: "auto-oem",
  auto_retail: "auto-retail",
  ecommerce: "ecommerce",
  b2b_saas: "b2b-saas",
  publisher_content: "publisher",
  lead_generation: "b2b-saas",
  professional_services: "b2b-saas",
  nonprofit: "generic",
  unknown: "generic",
  general_business: "generic",
  content_led_business: "b2b-saas",
  healthcare: "healthcare",
  financial_services: "financial-services",
  education: "generic",
  travel_hospitality: "ecommerce",
  real_estate: "generic",
  home_services: "generic",
  local_services: "generic",
};

const RECIPES: Record<ExperiencePackKey, ExperienceRecipe[]> = {
  "auto-oem": autoOemRecipes as ExperienceRecipe[],
  "auto-retail": autoRetailRecipes as ExperienceRecipe[],
  "b2b-saas": b2bSaasRecipes as ExperienceRecipe[],
  ecommerce: ecommerceRecipes as ExperienceRecipe[],
  "financial-services": financialRecipes as ExperienceRecipe[],
  healthcare: healthcareRecipes as ExperienceRecipe[],
  publisher: publisherRecipes as ExperienceRecipe[],
  generic: genericRecipes as ExperienceRecipe[],
};

const SURFACES: Record<ExperiencePackKey, ExperienceSurfaceCatalogFile> = {
  "auto-oem": autoOemSurfaces as ExperienceSurfaceCatalogFile,
  "auto-retail": autoRetailSurfaces as ExperienceSurfaceCatalogFile,
  "b2b-saas": b2bSaasSurfaces as ExperienceSurfaceCatalogFile,
  ecommerce: ecommerceSurfaces as ExperienceSurfaceCatalogFile,
  "financial-services": financialSurfaces as ExperienceSurfaceCatalogFile,
  healthcare: healthcareSurfaces as ExperienceSurfaceCatalogFile,
  publisher: publisherSurfaces as ExperienceSurfaceCatalogFile,
  generic: genericSurfaces as ExperienceSurfaceCatalogFile,
};

export function experiencePackKeyForVertical(vertical: SiteVertical): ExperiencePackKey {
  return VERTICAL_TO_PACK[vertical] ?? "generic";
}

export function getExperienceRecipesForVertical(vertical: SiteVertical): ExperienceRecipe[] {
  const key = experiencePackKeyForVertical(vertical);
  const primary = RECIPES[key] ?? [];
  if (key === "generic") return primary;
  return [...primary, ...RECIPES.generic];
}

export function getSurfaceCatalogForVertical(vertical: SiteVertical): ExperienceSurfaceCatalogFile {
  const key = experiencePackKeyForVertical(vertical);
  return SURFACES[key] ?? SURFACES.generic;
}
