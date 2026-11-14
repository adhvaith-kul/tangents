// The paragraph on image memes from famous accounts, shared by the story
// writer and the everyday-posts writer.
import { MEME_POSTERS, MEME_TEMPLATES } from "../media";

export function famousMemes(): string {
  const who = MEME_POSTERS.map((h) => "@" + h).join(", ");
  return `Memes: ${who} really post${MEME_POSTERS.length === 1 ? "s" : ""} image memes, so a post by ${MEME_POSTERS.length === 1 ? "that account" : "one of those accounts"} may set meme to a template id with top and bottom text; no other account's may, and for everyone else leave the key out. It is rare: a few times a day at most, and never in a serious moment. The post's text is then short or empty, and the captions are written the way that meme is written. Templates:
${MEME_TEMPLATES.map((m) => `- ${m.id} (${m.name}): ${m.use}`).join("\n")}`;
}
