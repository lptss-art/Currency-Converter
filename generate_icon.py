from PIL import Image, ImageDraw, ImageFont
import os

def generate_icon(size):
    img = Image.new('RGB', (size, size), color = (59, 130, 246)) # bg-blue-500
    d = ImageDraw.Draw(img)

    # Draw symbols
    font_size = int(size * 0.4)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    d.text((size*0.2, size*0.2), "$", fill=(255,255,255), font=font)
    d.text((size*0.6, size*0.2), "€", fill=(255,255,255), font=font)
    d.text((size*0.2, size*0.6), "£", fill=(255,255,255), font=font)
    d.text((size*0.6, size*0.6), "¥", fill=(255,255,255), font=font)

    img.save(f"icon-{size}x{size}.png")

generate_icon(192)
generate_icon(512)
