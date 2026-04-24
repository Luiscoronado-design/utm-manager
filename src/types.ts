export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

export interface Space {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  profileId: string;
}

export interface Project {
  id: string;
  spaceId: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface List {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string;
  description?: string;
  order: number;
  createdAt: number;
}

export interface UTMLink {
  id: string;
  listId: string;
  title: string;
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  finalUrl: string;
  shortUrl?: string;
  createdAt: number;
}
