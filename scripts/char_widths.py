import sys
import json

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

def calculate_widths(ttf_path, height):

    # image = Image.new("RGB", (2000, height))
    # draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(ttf_path, height)

    # x, y = (0, 0)

    widths = {}
    for code in range(32, 127):  # ASCII range for printable characters
        char = chr(code)
        # bbox = draw.textbbox((x, y), char, font=font)
        # draw.text((x, y), char, font=font, fill="white")
        # draw.rectangle(bbox, outline="red")

        # width = draw.textlength(char, font=font)
        # x += width
        
        widths[char] = font.getbbox(char)[2]
    
    # image.show()

    return widths

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <path_to_ttf> <height>")
        sys.exit(1)

    ttf_path = sys.argv[1]
    height = int(sys.argv[2])

    widths = calculate_widths(ttf_path, height)

    output = f"export default {json.dumps(widths)}"
    open("assets/char-widths.js", "w").write(output)
    print(output)

    # for char, width in widths.items():
    #     print(f"'{char}': {width}")

