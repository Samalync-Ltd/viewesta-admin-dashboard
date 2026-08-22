export type ShowStatus = "draft" | "published" | "archived";

export interface CastMember {
  id: string; // for internal UI tracking
  name: string;
  character: string;
  role: string;
  actorImage?: File | null;
}

export interface ShowFormData {
  // Basic Information
  title: string;
  description: string;
  categoryId: string;
  ageRating: string;
  releaseYear: string;

  // Production Information
  directorName: string;
  producerName: string;

  // Media
  poster?: File | null;
  backdrop?: File | null;
  trailer?: File | null;
  durationMinutes: string;

  // Cast
  cast: CastMember[];
}
