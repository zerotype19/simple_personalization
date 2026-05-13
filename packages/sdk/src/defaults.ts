import type { SDKConfig } from "@si/shared";
import { GENERIC_HOSTED_SDK_CONFIG } from "@si/shared";

/** Baked into the hosted IIFE; neutral copy so third-party embeds do not ship dealer-specific strings. */
export const DEFAULT_CONFIG: SDKConfig = GENERIC_HOSTED_SDK_CONFIG;
