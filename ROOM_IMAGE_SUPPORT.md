# Room Image Support Documentation

## Overview

The game now supports custom images for room tiles. This feature allows you to replace the default color-based room rendering with custom images while maintaining full backward compatibility with the existing color system.

## Changes Made

### 1. Type Definitions (`src/types/index.ts`)

Added optional `image` property to room-related interfaces:

- **`Room` interface**: Added `image?: string` field to store the image path/key for individual room instances
- **`RoomSpec` interface**: Added `image?: string` field to define default images for room types

### 2. Rendering System (`src/game/scenes/MainScene.ts`)

Updated the rendering logic to support images with automatic fallback:

- **New property**: `roomImages: Map<string, Phaser.GameObjects.Image>` - Tracks image objects for each room
- **Enhanced `renderRooms()` method**:
  - Checks if a room has an image property and if the texture is loaded
  - If image exists: Renders using Phaser Image object with proper scaling and effects
  - If no image: Falls back to the existing color-based rendering
  - Applies day/night tinting to images
  - Applies alpha transparency based on room state (open/closed)
  - Maintains all existing visual effects (borders, capacity indicators, fundraiser highlights)
- **Updated `shutdown()` method**: Properly cleans up room image objects to prevent memory leaks

### 3. Asset Directory Structure

Created `public/assets/rooms/` directory with:
- **README.md**: Comprehensive guide on how to add and use room images
- **.gitkeep**: Ensures the directory is tracked by git

## How the System Works

### Image Loading Flow

1. **Optional Configuration**: Add `image` property to room specs in `src/constants/index.ts`
2. **Texture Loading**: Load images in Phaser's preload phase (must be added manually)
3. **Automatic Detection**: Rendering system checks if texture exists using `this.textures.exists()`
4. **Smart Rendering**: 
   - If texture exists → Render image
   - If texture missing → Fall back to color rendering
5. **Graceful Degradation**: Game remains fully playable without any images

### Fallback System

The fallback system ensures the game works in all scenarios:

- ✅ **No images configured**: Uses default color rendering
- ✅ **Image configured but not loaded**: Falls back to color rendering
- ✅ **Image loaded successfully**: Renders image with all effects
- ✅ **Image fails to load**: Automatically falls back to color rendering

### Visual Effects Applied to Images

Images receive the same visual treatment as color-based rooms:

- **Day/Night Tinting**: Images are tinted based on current phase
- **Room State Alpha**: Closed rooms appear dimmed (50% alpha)
- **Active Fundraiser**: Full opacity with pulsing gold border
- **Ambient Lighting**: Tint color matches the day/night cycle
- **Proper Scaling**: Images are automatically scaled to fit room dimensions

## How to Add Images

### Step 1: Prepare Your Images

Create images matching the room dimensions:

| Room Type | Dimensions (tiles) | Image Size (pixels) |
|-----------|-------------------|---------------------|
| Dormitory | 3×3 | 96×96 |
| Cafeteria | 5×3 | 160×96 |
| Learning Center | 4×3 | 128×96 |
| Vocational Room | 4×3 | 128×96 |
| Bathroom | 2×2 | 64×64 |
| Common Room | 3×3 | 96×96 |
| Admin Office | 2×2 | 64×64 |
| Fundraiser Station | 3×2 | 96×64 |

**Recommendations**:
- Use PNG format with transparency
- Keep file sizes under 100KB
- Use consistent art style
- Test with day/night tinting

### Step 2: Place Images

Copy your image files to `public/assets/rooms/`:

```
public/assets/rooms/
├── dormitory.png
├── cafeteria.png
├── learning_center.png
└── ... (other room images)
```

### Step 3: Load Images in Phaser

Add a `preload()` method to `MainScene` (or update existing one):

```typescript
preload() {
  // Load room images
  this.load.image('rooms/dormitory', 'assets/rooms/dormitory.png');
  this.load.image('rooms/cafeteria', 'assets/rooms/cafeteria.png');
  this.load.image('rooms/learning_center', 'assets/rooms/learning_center.png');
  this.load.image('rooms/vocational_room', 'assets/rooms/vocational_room.png');
  this.load.image('rooms/bathroom', 'assets/rooms/bathroom.png');
  this.load.image('rooms/common_room', 'assets/rooms/common_room.png');
  this.load.image('rooms/admin_office', 'assets/rooms/admin_office.png');
  this.load.image('rooms/fundraiser_station', 'assets/rooms/fundraiser_station.png');
}
```

### Step 4: Configure Room Specs

Update `src/constants/index.ts` to reference the images:

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
    image: "rooms/dormitory"  // Add this line
  },
  
  cafeteria: {
    type: "cafeteria",
    width: 5,
    height: 3,
    buildCost: 800,
    maintenanceCost: 40,
    capacity: 10,
    closesAtNight: true,
    needsSatisfied: ["food"],
    image: "rooms/cafeteria"  // Add this line
  },
  
  // ... continue for other room types
};
```

### Step 5: Test

1. Start the development server: `npm run dev`
2. Build rooms in the game
3. Verify images appear correctly
4. Test day/night transitions
5. Test room states (open/closed)
6. Verify fallback works if you remove an image

## Technical Details

### Image Object Management

- **Creation**: Images are created on-demand when a room is first rendered
- **Caching**: Image objects are stored in `roomImages` Map for reuse
- **Updates**: Position, scale, alpha, and tint are updated each frame
- **Cleanup**: Images are destroyed when rooms are removed or scene shuts down

### Performance Considerations

- **Object Pooling**: Image objects are reused for the same room
- **Lazy Loading**: Images are only created when needed
- **Efficient Updates**: Only properties that change are updated
- **Memory Management**: Proper cleanup prevents memory leaks

### Depth Ordering

- Grid: Depth 0 (background)
- Room Images: Depth 1 (above grid)
- Room Graphics: Depth 0 (borders and indicators)
- Residents: Depth 2 (above rooms)
- Placement Preview: Depth 100 (top layer)

## Backward Compatibility

The implementation is fully backward compatible:

- ✅ Existing games without images continue to work
- ✅ No changes required to existing code
- ✅ Save files remain compatible
- ✅ Color system remains as fallback
- ✅ All existing features work with or without images

## Future Enhancements

Possible improvements for future versions:

1. **Animated Tiles**: Support sprite sheets for animated rooms
2. **Seasonal Variants**: Different images based on game events
3. **Damage States**: Visual indication of maintenance needs
4. **Upgrade Visuals**: Different images for upgraded rooms
5. **Preload Helper**: Automatic image loading based on room specs
6. **Image Editor**: In-game tool to preview and configure images

## Troubleshooting

### Images Not Appearing

1. **Check file path**: Ensure image is in `public/assets/rooms/`
2. **Verify preload**: Confirm image is loaded in `preload()` method
3. **Check key match**: Image key in `preload()` must match `image` property
4. **Console errors**: Check browser console for loading errors
5. **File format**: Ensure image format is supported (PNG, JPG, etc.)

### Images Look Wrong

1. **Check dimensions**: Verify image size matches room dimensions × 32 pixels
2. **Test transparency**: Use PNG with alpha channel if needed
3. **Verify tinting**: Images are tinted for day/night - test both phases
4. **Check compression**: Ensure image quality is sufficient

### Performance Issues

1. **Optimize images**: Compress images to reduce file size
2. **Reduce resolution**: Use exact required dimensions, no larger
3. **Limit animations**: Avoid complex animated sprites initially
4. **Monitor memory**: Check for memory leaks if adding many rooms

## Files Modified

- `src/types/index.ts` - Added `image` property to Room and RoomSpec interfaces
- `src/game/scenes/MainScene.ts` - Updated rendering logic and cleanup
- `public/assets/rooms/README.md` - Created user guide for images
- `public/assets/rooms/.gitkeep` - Ensures directory is tracked
- `ROOM_IMAGE_SUPPORT.md` - This documentation file

## Testing Checklist

- [x] Build succeeds without errors
- [x] Game runs without images (color fallback works)
- [x] TypeScript types are correct
- [x] No runtime errors in console
- [x] Memory cleanup works properly
- [x] Documentation is complete

## Summary

The room image support system is now fully implemented and ready to use. The system is:

- **Optional**: Works with or without images
- **Flexible**: Easy to add/remove images
- **Robust**: Automatic fallback to colors
- **Performant**: Efficient rendering and memory management
- **Compatible**: No breaking changes to existing code

Users can now enhance their game's visual appeal with custom room images while maintaining full backward compatibility with the existing color-based system.
