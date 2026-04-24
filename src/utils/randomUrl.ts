import { exampleUrl } from "../constants/urls";

export function getRandomUrl(): string {
  const index = Math.floor(Math.random() * exampleUrl.length);
  return exampleUrl[index];
}
