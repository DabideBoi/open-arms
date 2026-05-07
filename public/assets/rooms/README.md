# Room Images

This directory contains image assets for room tiles in the game.

## Usage

To add custom images for room types:

1. **Place your image files** in this directory (`public/assets/rooms/`)
   - Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP
   - Recommended size: 32x32 pixels per tile (e.g., a 3x3 room would be 96x96 pixels)
   - Use transparent backgrounds (PNG) for best results

2. **Name your files** descriptively (e.g., `dormitory.png`, `cafeteria.png`, etc.)

3. **Configure room types** to use images by adding the `image` property to room specifications in `src/constants/index.ts`:

```typescript
export const ROOM_SPECS: Record<RoomType, RoomSpec> = {
  dormitory: {
    type: "dormitory",
    width: 3,
    height: 3,
    buildCost: 500,
    maintenanceCost: 20,
    capacity: 4,
    closesAtNight: false,
    needsSatisfied: ["sleep"],
    image: "assets/rooms/dormitory.png"  // Add this line
  },
  // ... other rooms
};
```

4. **Load images in Phaser** by adding them to the preload phase in `src/game/scenes/MainScene.ts`:

```typescript
preload() {
  // Load room images
  this.load.image('assets/rooms/dormitory.png', 'assets/rooms/dormitory.png');
  this.load.image('assets/rooms/cafeteria.png', 'assets/rooms/cafeteria.png');
  // ... other images
}
```

## Fallback System

If an image is not found or fails to load, the game will automatically fall back to the default color-based rendering system. This ensures the game remains playable even without custom images.

## Image Guidelines

- **Resolution**: Images should match the tile dimensions (width × height × 32 pixels)
  - Dormitory (3×3): 96×96 pixels
  - Cafeteria (5×3): 160×96 pixels
  - Learning Center (4×3): 128×96 pixels
  - Vocational Room (4×3): 128×96 pixels
  - Bathroom (2×2): 64×64 pixels
  - Common Room (3×3): 96×96 pixels
  - Admin Office (2×2): 64×64 pixels
  - Fundraiser Station (3×2): 96×64 pixels

- **Style**: Keep images consistent with the game's visual style
- **Transparency**: Use PNG with alpha channel for transparent backgrounds
- **File Size**: Keep images optimized for web (< 100KB per image recommended)

## Example Structure

```
public/assets/rooms/
├── README.md (this file)
├── dormitory.png
├── cafeteria.png
├── learning_center.png
├── vocational_room.png
├── bathroom.png
├── common_room.png
├── admin_office.png
└── fundraiser_station.png
```

## Technical Details

- Images are rendered using Phaser's Image game objects
- Images are automatically scaled to fit the room dimensions
- Day/night lighting effects are applied via tint
- Room state (open/closed) affects image alpha transparency
- Images are cached and reused for performance
