// Per-template caption placement. Boxes are percentages of the image. Templates
// not listed use classic image-macro captions: top and bottom strips.

export interface CaptionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** "impact": white capitals with black outline. "plain": black text on a white panel. */
  style: "impact" | "plain";
  /** Starting font size as a percentage of image width. */
  size: number;
}

export interface MemeLayout {
  w: number; // natural pixel size, for the aspect ratio
  h: number;
  top: CaptionBox;
  bottom: CaptionBox;
}

const strips = (w: number, h: number): MemeLayout => ({
  w,
  h,
  top: { x: 2, y: 1, w: 96, h: 30, style: "impact", size: 9 },
  bottom: { x: 2, y: 69, w: 96, h: 30, style: "impact", size: 9 },
});

export const MEME_LAYOUTS: Record<string, MemeLayout> = {
  // Text goes on the white half beside each panel.
  drake: {
    w: 1200,
    h: 1200,
    top: { x: 52, y: 2, w: 46, h: 46, style: "plain", size: 6 },
    bottom: { x: 52, y: 52, w: 46, h: 46, style: "plain", size: 6 },
  },
  // Top = left button, bottom = right button, laid on the button labels.
  buttons: {
    w: 600,
    h: 908,
    top: { x: 9, y: 12, w: 36, h: 17, style: "plain", size: 4.5 },
    bottom: { x: 50, y: 8, w: 28, h: 14, style: "plain", size: 4.5 },
  },
  // Only two captions: first and last panel in the white left column.
  expanding: {
    w: 857,
    h: 1202,
    top: { x: 2, y: 1, w: 46, h: 22, style: "plain", size: 5.5 },
    bottom: { x: 2, y: 76, w: 46, h: 22, style: "plain", size: 5.5 },
  },
  distracted: strips(1200, 800),
  changemymind: strips(482, 361),
  thisisfine: strips(580, 282),
  womancat: strips(680, 438),
  pikachu: strips(1000, 999),
  pigeon: strips(1000, 898),
  exit: strips(804, 767),
  rollsafe: strips(702, 395),
  spongebob: strips(502, 353),
  onedoesnot: strips(568, 335),
  harold: strips(480, 601),
  disaster: strips(500, 375),
  alwayshasbeen: strips(960, 540),
  // The picture already says "I am once again asking" at 80-86% down; bottom text sits under it.
  bernie: {
    w: 750,
    h: 750,
    top: { x: 2, y: 1, w: 70, h: 17, style: "impact", size: 7 },
    bottom: { x: 2, y: 87, w: 96, h: 12, style: "impact", size: 6 },
  },
  // Top = Robin's speech bubble (left), bottom = Batman's (right).
  batmanslap: {
    w: 400,
    h: 387,
    top: { x: 4, y: 2, w: 46, h: 19, style: "plain", size: 5.5 },
    bottom: { x: 54, y: 2, w: 42, h: 15, style: "plain", size: 5.5 },
  },
  // Text goes on the white half beside each panel.
  pooh: {
    w: 800,
    h: 582,
    top: { x: 45, y: 2, w: 53, h: 46, style: "plain", size: 6 },
    bottom: { x: 45, y: 53, w: 53, h: 45, style: "plain", size: 6 },
  },
  // Strips kept off the faces.
  kermit: {
    w: 700,
    h: 325,
    top: { x: 2, y: 1, w: 96, h: 20, style: "impact", size: 7 },
    bottom: { x: 2, y: 78, w: 96, h: 21, style: "impact", size: 7 },
  },
  successkid: {
    w: 500,
    h: 500,
    top: { x: 2, y: 1, w: 96, h: 28, style: "impact", size: 9 },
    bottom: { x: 2, y: 76, w: 96, h: 23, style: "impact", size: 9 },
  },
  // Bottom text is the label on the button face; top sits in the dark corner.
  nutbutton: {
    w: 600,
    h: 446,
    top: { x: 2, y: 2, w: 50, h: 30, style: "impact", size: 7 },
    bottom: { x: 9, y: 52, w: 34, h: 26, style: "impact", size: 5 },
  },
  // Top is written on the card (white oval), bottom on the dark table at right.
  uno: {
    w: 500,
    h: 494,
    top: { x: 8, y: 20, w: 36, h: 28, style: "plain", size: 5 },
    bottom: { x: 53, y: 62, w: 44, h: 26, style: "impact", size: 5.5 },
  },
  // Both captions share the white band above the two faces.
  monkeypuppet: {
    w: 923,
    h: 768,
    top: { x: 2, y: 1, w: 96, h: 16, style: "plain", size: 5 },
    bottom: { x: 2, y: 18, w: 96, h: 16, style: "plain", size: 5 },
  },
  // Top goes in the grass left of the skull, bottom under the ribs.
  skeleton: {
    w: 298,
    h: 403,
    top: { x: 2, y: 2, w: 36, h: 34, style: "impact", size: 9 },
    bottom: { x: 2, y: 87, w: 96, h: 12, style: "impact", size: 8 },
  },
  cheers: {
    w: 600,
    h: 400,
    top: { x: 2, y: 1, w: 96, h: 16, style: "impact", size: 8 },
    bottom: { x: 2, y: 82, w: 96, h: 17, style: "impact", size: 8 },
  },
  fry: strips(552, 414),
  badluck: strips(475, 562),
};
