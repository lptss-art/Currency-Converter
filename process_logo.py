from PIL import Image
import os

input_path = "C:/Users/marce/.gemini/antigravity/brain/70e221b5-03e1-4525-81e8-908657183d1f/currency_converter_logo_1791433017296.jpg"

try:
    print("Reading generated image...")
    img = Image.open(input_path).convert("RGBA")
    
    # Crop the bottom text out. Image is 1024x1024. Text is usually in the bottom 150px.
    # We will crop to 1024x850
    img = img.crop((0, 0, 1024, 850))
    
    print("Removing white background...")
    datas = img.getdata()
    new_data = []
    for item in datas:
        # Check if the pixel is close to white
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            # Change near white to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    print("Background removed. Cropping...")
    bbox = img.getbbox()
    if bbox:
        img_cropped = img.crop(bbox)
    else:
        img_cropped = img
        
    # We want a square image
    w, h = img_cropped.size
    size = max(w, h)
    
    # Add a little padding (e.g., 5%)
    padded_size = int(size * 1.1)
    
    square_img = Image.new("RGBA", (padded_size, padded_size), (255, 255, 255, 0))
    offset = ((padded_size - w) // 2, (padded_size - h) // 2)
    square_img.paste(img_cropped, offset)
    
    print("Saving logo.png...")
    square_img.save("logo.png")
    
    print("Saving icon-192x192.png...")
    img_192 = square_img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save("icon-192x192.png")
    
    print("Saving icon-512x512.png...")
    img_512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save("icon-512x512.png")
    
    print("Saving icon-maskable-512x512.png (with solid background)...")
    maskable_bg = Image.new("RGBA", (512, 512), (255, 255, 255, 255)) 
    maskable_fg = square_img.resize((410, 410), Image.Resampling.LANCZOS)
    maskable_bg.paste(maskable_fg, ((512-410)//2, (512-410)//2), maskable_fg)
    maskable_bg.save("icon-maskable-512x512.png")

    print("Success")
    
except Exception as e:
    print(f"Error: {e}")
