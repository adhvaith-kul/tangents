// GIFs and memes. The exported names and signatures are frozen. Server-only
// (resolveGif calls an external API). Meme layouts live in components/media.

export interface MemeTemplate {
  /** Stable key the model uses, e.g. "drake". */
  id: string;
  name: string;
  /** One line telling the model when this template fits. */
  use: string;
  /** Path of the image under /public. */
  image: string;
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  { id: "drake", name: "Drake Hotline Bling", use: "Rejecting one thing and approving another: top text is the thing rejected, bottom text is the thing preferred.", image: "/memes/drake.jpg" },
  { id: "distracted", name: "Distracted Boyfriend", use: "Someone tempted away from what they have by something new: top text is the new shiny thing, bottom text is the neglected thing (short labels work best).", image: "/memes/distracted.jpg" },
  { id: "buttons", name: "Two Buttons", use: "A hard choice between two appealing or conflicting options: top text is the first option, bottom text the second.", image: "/memes/buttons.jpg" },
  { id: "changemymind", name: "Change My Mind", use: "Stating a confident, debatable opinion: top text is the claim; bottom text is left empty or a short challenge.", image: "/memes/changemymind.jpg" },
  { id: "thisisfine", name: "This Is Fine", use: "Calmly ignoring a developing disaster: top text names the chaos, bottom text is the denial (often 'this is fine').", image: "/memes/thisisfine.jpg" },
  { id: "womancat", name: "Woman Yelling at a Cat", use: "An angry accusation answered by blank indifference: top text is what is being shouted, bottom text is the unbothered reply.", image: "/memes/womancat.jpg" },
  { id: "pikachu", name: "Surprised Pikachu", use: "Feigned surprise at an entirely predictable consequence: top text sets up the obvious cause, bottom text is the 'surprised' result.", image: "/memes/pikachu.jpg" },
  { id: "expanding", name: "Expanding Brain", use: "Escalating levels of cleverness or absurdity: top text is the basic take, bottom text the galaxy-brain take.", image: "/memes/expanding.jpg" },
  { id: "pigeon", name: "Is This a Pigeon?", use: "Misidentifying something obvious: top text is the thing being misjudged, bottom text is the wrong label ('is this a ...?').", image: "/memes/pigeon.jpg" },
  { id: "exit", name: "Left Exit 12 Off Ramp", use: "Swerving off the sensible path for something tempting: top text is the sensible route, bottom text is the tempting detour.", image: "/memes/exit.jpg" },
  { id: "rollsafe", name: "Roll Safe", use: "A smug loophole that is technically clever: top text is the problem or premise, bottom text is the 'smart' workaround.", image: "/memes/rollsafe.jpg" },
  { id: "spongebob", name: "Mocking SpongeBob", use: "Mocking something someone said or a lazy argument: top text is the original statement, bottom text is its mocking repeat in alternating caps.", image: "/memes/spongebob.jpg" },
  { id: "onedoesnot", name: "One Does Not Simply", use: "Something that sounds easy but is not: top text is 'ONE DOES NOT SIMPLY', bottom text finishes the sentence.", image: "/memes/onedoesnot.jpg" },
  { id: "harold", name: "Hide the Pain Harold", use: "Smiling through quiet suffering: top text is the painful situation, bottom text is the forced positive spin.", image: "/memes/harold.jpg" },
  { id: "disaster", name: "Disaster Girl", use: "Smugly having caused or enjoyed a catastrophe: top text is the chaos around, bottom text is the culprit's role in it.", image: "/memes/disaster.jpg" },
  { id: "alwayshasbeen", name: "Always Has Been", use: "A sudden realisation that something was true all along: top text is 'Wait, it's all X?', bottom text is 'Always has been'.", image: "/memes/alwayshasbeen.png" },
  { id: "bernie", name: "Bernie: I Am Once Again Asking", use: "Making an earnest, slightly weary request: the picture already says 'I am once again asking'; top text is the setup (or left empty), bottom text finishes the ask ('for your support', 'that you read the article').", image: "/memes/bernie.jpg" },
  { id: "batmanslap", name: "Batman Slapping Robin", use: "Shutting down a dumb idea before it is finished: top text is what Robin blurts out, bottom text is Batman's flat dismissal.", image: "/memes/batmanslap.jpg" },
  { id: "pooh", name: "Tuxedo Winnie the Pooh", use: "The plain version against the fancy version of the same thing: top text is the ordinary phrasing, bottom text is the pretentious one.", image: "/memes/pooh.jpg" },
  { id: "kermit", name: "Evil Kermit", use: "A temptation arguing with conscience: top text is the sensible thought, bottom text is the dark voice saying to do the bad thing anyway.", image: "/memes/kermit.jpg" },
  { id: "fry", name: "Futurama Fry", use: "Squinting suspicion or honest doubt: top text is 'not sure if X', bottom text is 'or Y'.", image: "/memes/fry.jpg" },
  { id: "successkid", name: "Success Kid", use: "A small, smug win: top text is the situation, bottom text is the unlikely good outcome.", image: "/memes/successkid.jpg" },
  { id: "badluck", name: "Bad Luck Brian", use: "A mishap of one's own making, or luck that is always bad: top text is the hopeful setup, bottom text is how it went wrong.", image: "/memes/badluck.jpg" },
  { id: "nutbutton", name: "Blank Nut Button", use: "Giving in to an impulse you know is petty: top text is the situation or the restraint, bottom text is the label on the button (the thing you could not resist).", image: "/memes/nutbutton.jpg" },
  { id: "uno", name: "UNO Draw 25", use: "Refusing a small concession and taking a big penalty instead: top text is the thing they refuse to do (the card says 'or draw 25'), bottom text is what the person would rather do.", image: "/memes/uno.jpg" },
  { id: "monkeypuppet", name: "Awkward Monkey Puppet", use: "Looking away from an awkward situation: top text sets up the moment, bottom text is the pretending not to notice.", image: "/memes/monkeypuppet.jpg" },
  { id: "skeleton", name: "Waiting Skeleton", use: "Still waiting for something that is never coming: top text is what is awaited, bottom text is how long it has been.", image: "/memes/skeleton.jpg" },
  { id: "cheers", name: "Leonardo DiCaprio Cheers", use: "A smug toast to something good, or to someone else's misfortune: top text is the occasion, bottom text is what is being toasted.", image: "/memes/cheers.jpg" },
];

/** Famous accounts that post image memes on their real accounts, so the director may attach one. */
export const MEME_POSTERS: string[] = ["elonmusk"];

const TIMEOUT_MS = 4000;

interface GiphyRendition {
  url?: string;
  width?: string;
  height?: string;
}

/** A GIF for a search phrase (one of the top five at random), or null when no API key is configured or nothing fits. Never throws. */
export async function resolveGif(query: string): Promise<{ url: string; width: number; height: number } | null> {
  const key = process.env.GIPHY_API_KEY;
  const q = query.trim();
  if (!key || !q) return null;
  try {
    const params = new URLSearchParams({ api_key: key, q, limit: "5", rating: "pg" });
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { images?: Record<string, GiphyRendition> }[] };
    const usable = (body.data ?? [])
      .map((g) => {
        const r = g.images?.fixed_height ?? g.images?.downsized;
        const url = r?.url;
        const width = Number(r?.width);
        const height = Number(r?.height);
        return url && width > 0 && height > 0 ? { url, width, height } : null;
      })
      .filter((x): x is { url: string; width: number; height: number } => x !== null);
    if (!usable.length) return null;
    return usable[Math.floor(Math.random() * usable.length)];
  } catch {
    return null;
  }
}
