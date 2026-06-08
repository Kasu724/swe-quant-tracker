import type {
  ALERT_CHANNELS,
  COMPANY_BUCKETS,
  COMPENSATION_INTERVALS,
  INTERNSHIP_SEASONS,
  LISTING_SORT_OPTIONS,
  REMOTE_TYPES,
  ROLE_CATEGORIES,
  SOURCE_TYPES
} from "./constants/domain";

export type CompanyBucketValue = (typeof COMPANY_BUCKETS)[number];
export type SourceTypeValue = (typeof SOURCE_TYPES)[number];
export type RoleCategoryValue = (typeof ROLE_CATEGORIES)[number];
export type RemoteTypeValue = (typeof REMOTE_TYPES)[number];
export type CompensationIntervalValue = (typeof COMPENSATION_INTERVALS)[number];
export type AlertChannelValue = (typeof ALERT_CHANNELS)[number];
export type InternshipSeasonValue = (typeof INTERNSHIP_SEASONS)[number];
export type ListingSortValue = (typeof LISTING_SORT_OPTIONS)[number];

export type NormalizedLocation = {
  raw: string;
  display: string;
  key: string;
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
  countryCode?: string;
  isRemote?: boolean;
  isUs?: boolean;
};

export type ParsedCompensation = {
  raw?: string;
  min?: number;
  max?: number;
  currency?: string;
  interval?: CompensationIntervalValue;
  known: boolean;
};

export type AdapterCompany = {
  id?: string;
  name: string;
  slug: string;
};

export type AdapterSource = {
  id?: string;
  sourceType: SourceTypeValue;
  sourceName: string;
  sourceIdentifier: string;
  sourceUrl: string;
  requestConfigJson?: Record<string, unknown> | null;
  parserConfigJson?: Record<string, unknown> | null;
};

export type AdapterFetchContext = {
  company: AdapterCompany;
  source: AdapterSource;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
  signal?: AbortSignal;
};

export type AdapterFetchedPosting = {
  externalJobId: string;
  title: string;
  applicationUrl: string;
  sourceUrl?: string;
  postingDate?: string | Date | null;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  employmentType?: string | null;
  locationRaw?: string | null;
  additionalLocations?: string[];
  remoteTypeHint?: string | null;
  payRaw?: string | null;
  compensation?: ParsedCompensation;
  metadata?: Record<string, unknown>;
  raw: unknown;
};

export type NormalizedPostingRecord = {
  slug: string;
  externalJobId: string;
  title: string;
  normalizedTitle: string;
  roleCategory: RoleCategoryValue;
  internshipFlag: boolean;
  season?: InternshipSeasonValue;
  year?: number;
  employmentType?: string;
  locationRaw?: string;
  locationsNormalized: NormalizedLocation[];
  locationCountries: string[];
  remoteType: RemoteTypeValue;
  compensationMin?: number;
  compensationMax?: number;
  compensationCurrency?: string;
  compensationInterval?: CompensationIntervalValue;
  payRaw?: string;
  postingDate?: Date;
  applicationUrl: string;
  sourceUrl?: string;
  sourceType: SourceTypeValue;
  sourceName: string;
  dedupeFingerprint: string;
  descriptionRaw?: string;
  descriptionText?: string;
  requirementsText?: string;
  metadataJson?: Record<string, unknown>;
  rawPostingJson: unknown;
};

export type ListingSearchRecord = {
  companySlug?: string;
  companyNameSnapshot: string;
  companyBucket: CompanyBucketValue;
  title: string;
  roleCategory: RoleCategoryValue;
  season?: string | null;
  year?: number | null;
  locationRaw?: string | null;
  locationCountries?: string[];
  remoteType: RemoteTypeValue;
  compensationMin?: number | null;
  compensationMax?: number | null;
  isActive: boolean;
  postingDate?: Date | null;
  discoveredAt?: Date | null;
};

