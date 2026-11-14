// GIFs and memes. STUB: the media workstream replaces the bodies. The exported
// names and signatures are frozen. Server-only (resolveGif calls an external API).

export interface MemeTemplate {
  /** Stable key the model uses, e.g. "drake". */
  id: string;
  name: string;
  /** One line telling the model when this template fits. */
  use: string;
  /** Path of the image under /public. */
  image: string;
}

export const MEME_TEMPLATES: MemeTemplate[] = [];

/** The top GIF for a search phrase, or null when no API key is configured or nothing fits. Never throws. */
export async function resolveGif(query: string): Promise<{ url: string; width: number; height: number } | null> {
  void query;
  return null;
}
