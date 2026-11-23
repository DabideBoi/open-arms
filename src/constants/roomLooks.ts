import type { RoomType } from '../types';

// Art layout for each room, built from the Kenney "Roguelike Indoors" sheet
// (public/assets/kenney/indoor.png, 16px tiles, 1px gap, 27 columns; frame = row*27 + col).
// Each 16px sprite is drawn at 2x so it fills exactly one 32px game tile.

export interface RoomProp {
  f: number;       // frame in the indoor sheet
  x: number;       // room-local tile column
  y: number;       // room-local tile row
  flip?: boolean;
}

export interface RoomLook {
  floor: number;   // frame repeated across every tile of the room
  tint?: number;   // multiplied into the floor so one frame can serve several rooms
  checker?: [number, number]; // two-colour tile floor drawn in code (the sheet has none); replaces `floor`
  props: RoomProp[];
  seats?: { x: number; y: number }[]; // room-local tiles: one resident per seat (beds, chairs). Must match ROOM_SPECS capacity.
}

const WOOD = 51;
const GREEN_CARPET = 159;

export const ROOM_LOOKS: Record<RoomType, RoomLook> = {
  dormitory: {
    floor: WOOD,
    // Each bed sprite tile is one bed; the middle row is the aisle.
    props: [
      { f: 8, x: 0, y: 0 }, { f: 9, x: 1, y: 0 }, { f: 91, x: 2, y: 0 },
      { f: 16, x: 2, y: 1 },
      { f: 8, x: 0, y: 2 }, { f: 9, x: 1, y: 2 }, { f: 91, x: 2, y: 2 },
    ],
    seats: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  },
  cafeteria: {
    floor: WOOD,
    checker: [0xeadfc6, 0xd8caa8],
    props: [
      { f: 325, x: 0, y: 0 }, { f: 326, x: 1, y: 0 }, { f: 392, x: 2, y: 0 }, { f: 329, x: 3, y: 0 }, { f: 332, x: 4, y: 0 },
      { f: 112, x: 0, y: 1 }, { f: 113, x: 1, y: 1 }, { f: 114, x: 2, y: 1 }, { f: 115, x: 3, y: 1 }, { f: 54, x: 4, y: 1 },
      { f: 54, x: 0, y: 2 }, { f: 54, x: 1, y: 2 }, { f: 54, x: 2, y: 2 }, { f: 54, x: 3, y: 2 }, { f: 17, x: 4, y: 2 },
    ],
    seats: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 1 }],
  },
  clinic: {
    floor: WOOD,
    checker: [0xe8f1f6, 0xcfdfe8],
    props: [
      { f: 116, x: 0, y: 0 }, { f: 117, x: 1, y: 0 }, { f: 478, x: 2, y: 0 },
      { f: 116, x: 0, y: 1 }, { f: 117, x: 1, y: 1 }, { f: 16, x: 2, y: 1 },
      { f: 218, x: 2, y: 2 },
    ],
  },
  bathroom: {
    floor: WOOD,
    checker: [0xd2efef, 0xaedada],
    props: [
      { f: 416, x: 0, y: 0 }, { f: 400, x: 1, y: 0 },
      { f: 427, x: 1, y: 1 }, { f: 17, x: 0, y: 1 },
    ],
  },
  common_room: {
    floor: GREEN_CARPET,
    props: [
      { f: 239, x: 0, y: 0 }, { f: 240, x: 1, y: 0 }, { f: 17, x: 2, y: 0 },
      { f: 129, x: 0, y: 2 }, { f: 130, x: 2, y: 2 },
    ],
  },
  admin_office: {
    floor: WOOD,
    tint: 0xd8c2a6,
    props: [
      { f: 478, x: 0, y: 0 }, { f: 480, x: 1, y: 0 },
      { f: 58, x: 0, y: 1 }, { f: 54, x: 1, y: 1 },
    ],
  },
  fundraiser_station: {
    floor: WOOD,
    tint: 0xffe9b0,
    props: [
      { f: 43, x: 0, y: 0 }, { f: 44, x: 1, y: 0 }, { f: 45, x: 2, y: 0 },
      { f: 0, x: 0, y: 1 }, { f: 1, x: 1, y: 1 }, { f: 2, x: 2, y: 1 },
    ],
  },
  potted_plant: {
    floor: WOOD,
    props: [{ f: 16, x: 0, y: 0 }],
  },
  fountain: {
    floor: WOOD,
    checker: [0xd9dde2, 0xc4c9cf],
    props: [{ f: 397, x: 0, y: 0 }],
  },
  large_dormitory: {
    floor: WOOD,
    tint: 0xf0dcc0,
    // Two rows of three beds with an aisle between them
    props: [
      { f: 8, x: 0, y: 0 }, { f: 9, x: 1, y: 0 }, { f: 8, x: 2, y: 0 }, { f: 91, x: 3, y: 0 },
      { f: 16, x: 3, y: 1 },
      { f: 8, x: 0, y: 2 }, { f: 9, x: 1, y: 2 }, { f: 8, x: 2, y: 2 }, { f: 91, x: 3, y: 2 },
    ],
    seats: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
  },
  medical_center: {
    floor: WOOD,
    checker: [0xeef6fa, 0xd3e4ee],
    props: [
      { f: 116, x: 0, y: 0 }, { f: 117, x: 1, y: 0 }, { f: 116, x: 2, y: 0 }, { f: 117, x: 3, y: 0 },
      { f: 116, x: 0, y: 1 }, { f: 117, x: 1, y: 1 }, { f: 478, x: 2, y: 1 }, { f: 480, x: 3, y: 1 },
      { f: 16, x: 0, y: 2 }, { f: 218, x: 3, y: 2 },
    ],
  },
  dining_hall: {
    floor: WOOD,
    checker: [0xf2e6c9, 0xdfd0ab],
    props: [
      { f: 325, x: 0, y: 0 }, { f: 326, x: 1, y: 0 }, { f: 392, x: 2, y: 0 }, { f: 329, x: 3, y: 0 }, { f: 332, x: 4, y: 0 }, { f: 333, x: 5, y: 0 },
      { f: 54, x: 0, y: 1 }, { f: 112, x: 1, y: 1 }, { f: 113, x: 2, y: 1 }, { f: 114, x: 3, y: 1 }, { f: 115, x: 4, y: 1 }, { f: 54, x: 5, y: 1, flip: true },
      { f: 54, x: 0, y: 2 }, { f: 54, x: 1, y: 2 }, { f: 54, x: 2, y: 2 }, { f: 54, x: 3, y: 2 }, { f: 54, x: 4, y: 2 }, { f: 54, x: 5, y: 2 },
    ],
    seats: [
      { x: 0, y: 1 }, { x: 5, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
    ],
  },
  library: {
    floor: WOOD,
    tint: 0xc9a77f,
    props: [
      { f: 478, x: 0, y: 0 }, { f: 479, x: 1, y: 0 }, { f: 480, x: 2, y: 0 },
      { f: 54, x: 0, y: 2 }, { f: 113, x: 1, y: 2 }, { f: 17, x: 2, y: 2 },
    ],
  },
  garden: {
    floor: GREEN_CARPET,
    tint: 0xb8e0a0,
    props: [
      { f: 16, x: 0, y: 0 }, { f: 17, x: 1, y: 0 }, { f: 16, x: 2, y: 0 },
      { f: 397, x: 1, y: 1 },
      { f: 17, x: 0, y: 2 }, { f: 16, x: 2, y: 2 },
    ],
  },
};

// Ready-made walkers from the Kenney "Roguelike Characters" sheet
// (public/assets/kenney/chars.png, 16px tiles, 1px gap, 54 columns).
export const FEMALE_FRAMES = [270, 271, 379, 486];
export const MALE_FRAMES = [324, 325, 378, 432, 433, 487, 541, 594];
export const RESIDENT_FRAMES = [...FEMALE_FRAMES, ...MALE_FRAMES]; // gender unknown (old saves)
export const CHARS_SHEET_COLUMNS = 54;

/** Stable per-resident number, so the same person always gets the same look. */
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The chars.png frame a resident is drawn with (scene and UI share this). */
export function residentFrame(id: string, gender?: 'male' | 'female'): number {
  const frames = gender === 'female' ? FEMALE_FRAMES : gender === 'male' ? MALE_FRAMES : RESIDENT_FRAMES;
  return frames[hashId(id) % frames.length];
}
