import os
from PIL import Image
import sys

def get_image_widths(directory):
    widths = []

    # Iterate through all files in the directory
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)

        # Try to open the file as an image
        try:
            with Image.open(file_path) as img:
                widths.append((filename, img.width))
        except Exception as e:
            # This will catch any exception thrown by Image.open, including
            # if the file is not an image.
            print(f"Failed to process {filename}. Error: {e}")

    return widths

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script_name.py <folder_path>")
        sys.exit(1)

    folder_path = sys.argv[1]

    if not os.path.exists(folder_path):
        print(f"The folder {folder_path} does not exist.")
        sys.exit(1)

    image_widths = get_image_widths(folder_path)
    
    # Sort images by width
    sorted_images = sorted(image_widths, key=lambda x: x[1])

    # Print the sorted widths
    for img in sorted_images:
        print(f"Image: {img[0]}, Width: {img[1]}")
    
    print([img[1] for img in sorted_images])

