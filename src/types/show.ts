export type ShowStatus = "draft" | "published" | "archived";

export interface CastMember {
  id: string; // for internal UI tracking
  actorName: string;
  characterName: string;
  role: string;
  actorImage?: File | null;
}

export interface Episode {
  id: string; // for internal UI tracking
  episodeNumber: number;
  title: string;
  description: string;
  duration: number; // minutes
  thumbnail?: File | null;
  videoFile?: File | null;
}

export interface Season {
  id: string; // for internal UI tracking
  seasonNumber: number;
  title: string;
  description: string;
  episodes: Episode[];
}

export interface ShowFormData {
  // Basic Information
  title: string;
  shortDescription: string;
  fullSynopsis: string;
  language: string;
  country: string;
  genre: string;
  ageRating: string;
  releaseDate: string;
  status: ShowStatus;

  // Production Information
  director: string;
  producer: string;
  productionCompany: string;

  // Media
  poster?: File | null;
  backdrop?: File | null;
  trailer?: File | null;
  gallery: File[];

  // Cast
  cast: CastMember[];

  // Seasons
  seasons: Season[];

  // Access Settings
  accessType: "Free" | "Subscription" | "PPV" | "PPV + Subscription";
  price?: number;
  isFeatured: boolean;
}
