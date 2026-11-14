// Voices: persona sheets for the famous figures, house styles for the outlets,
// voices for the crowd, and the relationships the world starts with.
// OWNER: main session (personas and prompts workstream).

export interface InitialRelationship {
  a: string;
  b: string;
  score: number; // -10 to +10
  note: string;
}

/** handle -> persona sheet */
export const FIGURE_PERSONAS: Record<string, string> = {};
/** handle -> house style */
export const OUTLET_STYLES: Record<string, string> = {};
/** handle -> voice */
export const CROWD_VOICES: Record<string, string> = {};

export const INITIAL_RELATIONSHIPS: InitialRelationship[] = [];
