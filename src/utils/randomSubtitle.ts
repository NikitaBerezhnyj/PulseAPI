import { apiSubtitles } from "../constants/subtitles";

export function getRandomSubtitle(): string {
  const index = Math.floor(Math.random() * apiSubtitles.length);
  return apiSubtitles[index];
}
