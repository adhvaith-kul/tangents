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
};
