import sys
import math

from PIL import Image, ImageDraw, ImageFont

def generate_image_assets(ttf_path, font_size, output_dir, padded=True):
    # Load the TTF font
    font = ImageFont.truetype(ttf_path, font_size)

    padded_size = math.ceil(math.sqrt(2) * font_size)
    
    for code in range(32, 127):  # ASCII range for printable characters
        char = chr(code)
        _, _, width, _ = font.getbbox(char)

        img_size = (padded_size, padded_size) if padded else (width, font_size)

        # Create an image canvas large enough to fit the character
        img = Image.new("RGBA", img_size, (255, 255, 255, 0))

        draw = ImageDraw.Draw(img)
        
        # Draw the character on the image
        draw.text((padded_size / 2 - width / 2, padded_size / 2 - font_size / 2), char, font=font, fill="white")

        # Save the image to the output directory
        char_filename = f"{code}.png"
        img.save(f"{output_dir}/{char_filename}")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <path_to_ttf> <font_size> <output_directory>")
        sys.exit(1)

    ttf_path = sys.argv[1]
    font_size = int(sys.argv[2])
    output_dir = sys.argv[3]

    generate_image_assets(ttf_path, font_size, output_dir, padded=True)

