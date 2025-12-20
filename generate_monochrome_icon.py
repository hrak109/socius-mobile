#!/usr/bin/env python3
"""Generate a monochrome (single-color) icon for Android themed icons."""

from PIL import Image
import sys

def create_monochrome_icon(input_path, output_path):
    """
    Convert an icon to a monochrome (white on transparent) version.
    This is required for Android's themed icons feature.
    """
    # Open the input image
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Create a new image with white color
    width, height = img.size
    monochrome = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # Get pixel data
    pixels = img.load()
    mono_pixels = monochrome.load()
    
    # Convert each pixel: if it has any opacity, make it white
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If pixel has any opacity (alpha > threshold), make it white
            if a > 30:  # Threshold to avoid faint pixels
                mono_pixels[x, y] = (255, 255, 255, a)
            else:
                mono_pixels[x, y] = (0, 0, 0, 0)
    
    # Save the monochrome icon
    monochrome.save(output_path, 'PNG')
    print(f"✓ Created monochrome icon: {output_path}")
    print(f"  Size: {width}x{height}")
    
if __name__ == '__main__':
    input_file = 'assets/images/icon.png'
    output_file = 'assets/images/android-icon-monochrome.png'
    
    create_monochrome_icon(input_file, output_file)
    print("\n✓ Monochrome icon generated successfully!")
    print("  Run 'npx expo prebuild --clean' to rebuild the app with the new icon.")
