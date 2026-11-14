// How often each famous account posts on X, as rough posts per day. The engine
// does not reproduce these numbers; it uses them as shares, so an account that
// really posts twenty times a day stays one of the loudest voices here and one
// that posts twice a month turns up rarely, and nobody runs far ahead of their
// own habit. Accounts not listed take the default for their kind.
import type { AccountKind } from "./types";

const RATES: Record<string, number> = {
  // founders and investors
  elonmusk: 30, mcuban: 8, BillAckman: 6, sama: 2, zuck: 0.3, JeffBezos: 0.4, jensenhuang: 0.5,
  // music, film and fashion
  taylorswift13: 0.2, KimKardashian: 2, KylieJenner: 1, Drake: 0.3, iamcardib: 6, rihanna: 0.3, RealChalamet: 0.2,
  MrBeast: 4, VancityReynolds: 1.5, StephenKing: 5, TheRock: 2,
  // politics
  realDonaldTrump: 15, JDVance: 4, AOC: 4, GavinNewsom: 8,
  // commentators
  piersmorgan: 8, joerogan: 1, jimcramer: 10, benshapiro: 10, mehdirhasan: 10,
  // athletes
  KingJames: 2, StephenCurry30: 0.5, PatrickMahomes: 1, tkelce: 0.3, Cristiano: 1, KMbappe: 0.5, ErlingHaaland: 0.3,
  // pundits and insiders
  stephenasmith: 8, PatMcAfeeShow: 12, ShannonSharpe: 8, ShamsCharania: 12, AdamSchefter: 15, FabrizioRomano: 25,
  // official accounts
  WhiteHouse: 10, GovPressOffice: 15, GOP: 8, TheDemocrats: 8, SECGov: 2,
  OpenAI: 2, Tesla: 2, SpaceX: 3, nvidia: 6, Meta: 1, Spotify: 3, Apple: 0.2, Microsoft: 3, Google: 3, amazon: 2,
  xai: 1, blueorigin: 1, Nike: 1, skims: 3, fentybeauty: 3,
  NBA: 30, NFL: 30, premierleague: 20, Lakers: 12, Chiefs: 10, dallascowboys: 10, realmadrid: 12, ManUtd: 12,
  netflix: 8, MarvelStudios: 2, PlayStation: 4, Xbox: 4, RockstarGames: 0.5, TheAcademy: 3,

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line

  // ==== formula 1: new entries go directly under this line
};

const DEFAULT: Partial<Record<AccountKind, number>> = { figure: 2, org: 3, outlet: 12 };

/** Typical posts per day for a famous account. */
export function rateOf(handle: string, kind: AccountKind): number {
  return RATES[handle] ?? DEFAULT[kind] ?? 1;
}
