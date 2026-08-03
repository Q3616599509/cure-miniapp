"""Generate proper PNG icons for Cure Mini Program tabbar and map markers."""
import struct
import zlib
import os

def create_png(width, height, pixels):
    """Create a minimal PNG from raw RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + c + crc

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA

    # IDAT: filter byte (0) + RGBA data per row
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter none
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    idat = zlib.compress(raw)

    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def fill_rect(pixels, w, x, y, rw, rh, color):
    """Fill a rectangle in pixel array."""
    for dy in range(rh):
        for dx in range(rw):
            px = x + dx
            py = y + dy
            if 0 <= px < w and 0 <= py < w:
                idx = (py * w + px) * 4
                pixels[idx:idx+4] = color

def draw_circle(pixels, w, cx, cy, r, color):
    """Draw a filled circle."""
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx + dy*dy <= r*r:
                px = cx + dx
                py = cy + dy
                if 0 <= px < w and 0 <= py < w:
                    idx = (py * w + px) * 4
                    pixels[idx:idx+4] = color

def make_icon(draw_fn, size=81, bg=None):
    """Create icon with given draw function."""
    pixels = bytearray(size * size * 4)
    if bg:
        for i in range(0, len(pixels), 4):
            pixels[i:i+4] = bg
    draw_fn(pixels, size)
    return create_png(size, size, bytes(pixels))

# Colors
PRIMARY = (131, 92, 69, 255)   # #835C45 棕色
PRIMARY_LIGHT = (168, 128, 102, 255)
GRAY = (153, 153, 153, 255)
GRAY_LIGHT = (200, 200, 200, 255)
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)
GREEN = (7, 193, 96, 255)

ICONS = {}

# ── Tabbar Icons (81x81) ──

def home_normal(pixels, s):
    """House icon."""
    c = GRAY
    # Roof
    for y in range(14, 36):
        t = (y - 14) / 22
        x_start = int(10 + (s//2 - 10) * (1 - t))
        x_end = int(s - 10 - (s//2 - 10) * (1 - t))
        fill_rect(pixels, s, x_start, y, x_end - x_start, 2, c)
    # Walls
    fill_rect(pixels, s, 16, 33, s - 32, s - 60, c)
    # Door
    fill_rect(pixels, s, s//2 - 6, 44, 12, s - 60, WHITE)

ICONS['home.png'] = home_normal

def home_active(pixels, s):
    home_normal(pixels, s)
    # Re-color to primary
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['home-active.png'] = home_active

def shop_normal(pixels, s):
    c = GRAY
    # Storefront
    fill_rect(pixels, s, 14, 22, s-28, s-48, c)
    # Door
    fill_rect(pixels, s, s//2 - 8, 38, 16, s-54, WHITE)
    # Awning
    for y in range(18, 24):
        fill_rect(pixels, s, 12, y, s-24, 1, c)
    # Window left/right
    fill_rect(pixels, s, 20, 28, 10, 8, WHITE)
    fill_rect(pixels, s, s-30, 28, 10, 8, WHITE)

ICONS['shop.png'] = shop_normal

def shop_active(pixels, s):
    shop_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['shop-active.png'] = shop_active

def vip_normal(pixels, s):
    c = GRAY
    # Diamond shape
    cx, cy = s//2, s//2
    r = 22
    for y in range(s):
        for x in range(s):
            dist = abs(x - cx) + abs(y - cy)
            if dist < r and dist > r - 4:
                idx = (y * s + x) * 4
                pixels[idx:idx+4] = c
    # Fill
    for y in range(s):
        for x in range(s):
            dist = abs(x - cx) + abs(y - cy)
            if dist <= r - 5:
                idx = (y * s + x) * 4
                pixels[idx:idx+4] = (c[0], c[1], c[2], 80)
    # V in center
    cx2, cy2 = s//2, s//2 + 4
    for dy in range(-8, 9):
        for dx in range(-5, 6):
            if dy >= abs(dx) - 3 and dy <= abs(dx) + 3 and dy < 10:
                idx = ((cy2 + dy) * s + (cx2 + dx)) * 4
                pixels[idx:idx+4] = c

ICONS['vip.png'] = vip_normal

def vip_active(pixels, s):
    vip_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['vip-active.png'] = vip_active

def user_normal(pixels, s):
    c = GRAY
    # Head circle
    draw_circle(pixels, s, s//2, 26, 12, c)
    # Body
    fill_rect(pixels, s, 16, 42, s-32, s-50, c)
    # Round top of body
    draw_circle(pixels, s, s//2, 42, 18, c)
    # Cut out head area (make body U-shaped)
    draw_circle(pixels, s, s//2, 26, 13, TRANSPARENT)

ICONS['user.png'] = user_normal

def user_active(pixels, s):
    user_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['user-active.png'] = user_active

# ── Additional tabbar icons ──

def cart_normal(pixels, s):
    c = GRAY
    # Cart body
    fill_rect(pixels, s, 16, 32, s-32, 28, c)
    # Wheels
    draw_circle(pixels, s, 26, 62, 7, c)
    draw_circle(pixels, s, s-26, 62, 7, c)
    # Handle
    fill_rect(pixels, s, s//2-2, 18, 4, 16, c)
    fill_rect(pixels, s, s//2-4, 16, 8, 4, c)

ICONS['cart.png'] = cart_normal

def cart_active(pixels, s):
    cart_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['cart-active.png'] = cart_active

# Order icon
def order_normal(pixels, s):
    c = GRAY
    fill_rect(pixels, s, 18, 18, s-36, s-36, c)
    fill_rect(pixels, s, 30, 32, s-60, 2, WHITE)
    fill_rect(pixels, s, 30, 42, s-48, 2, WHITE)
    draw_circle(pixels, s, s//2, 52, 8, WHITE)

ICONS['order.png'] = order_normal

def order_active(pixels, s):
    order_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['order-active.png'] = order_active

# Category icon
def category_normal(pixels, s):
    c = GRAY
    gap = 6
    w = (s - gap*4) // 3
    for i in range(3):
        x = gap + i*(w + gap)
        fill_rect(pixels, s, x, 18, w, w, c)
        fill_rect(pixels, s, x, 18 + w + gap, w, s - 18 - w - gap*2, c)

ICONS['category.png'] = category_normal

def category_active(pixels, s):
    category_normal(pixels, s)
    for i in range(0, len(pixels), 4):
        if pixels[i:i+3] == GRAY[:3]:
            pixels[i:i+4] = PRIMARY

ICONS['category-active.png'] = category_active

# ── Map Markers ──

def map_marker(pixels, s):
    """Teardrop-shaped map marker."""
    c = PRIMARY
    cx, cy = s//2, s//2 - 4
    # Teardrop shape
    for y in range(s):
        for x in range(s):
            dx, dy = x - cx, y - cy
            # Bottom point
            if y > cy + 10:
                t = (y - cy - 10) / (s - cy - 10)
                r = max(2, 14 * (1 - t*1.1))
                if dx*dx + dy*dy*0.5 < r*r:
                    idx = (y * s + x) * 4
                    pixels[idx:idx+4] = c
            else:
                r = 14
                if dx*dx + dy*dy < r*r:
                    idx = (y * s + x) * 4
                    pixels[idx:idx+4] = c
    # White dot in center
    draw_circle(pixels, s, cx, cy - 2, 5, WHITE)

ICONS['map-marker.png'] = map_marker

def location_marker(pixels, s):
    """Blue current location dot."""
    # Outer glow
    draw_circle(pixels, s, s//2, s//2, s//2 - 2, (7, 193, 96, 30))
    # Inner circle
    draw_circle(pixels, s, s//2, s//2, s//2 - 5, GREEN)
    # White ring
    for y in range(s):
        for x in range(s):
            dx, dy = x - s//2, y - s//2
            d = int((dx*dx + dy*dy)**0.5)
            if abs(d - s//4) < 1.5:
                idx = (y * s + x) * 4
                pixels[idx:idx+4] = WHITE

ICONS['location-marker.png'] = location_marker

# ── Generate all icons ──

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'miniprogram', 'assets')
TABBAR_DIR = os.path.join(OUTPUT_DIR, 'tabbar')

os.makedirs(TABBAR_DIR, exist_ok=True)

TABBAR_ICONS = ['home', 'home-active', 'shop', 'shop-active', 'vip', 'vip-active', 'user', 'user-active', 'cart', 'cart-active', 'order', 'order-active', 'category', 'category-active']
MAP_ICONS = ['map-marker', 'location-marker']

for name, draw_fn in ICONS.items():
    is_tabbar = name in [f'{t}.png' for t in TABBAR_ICONS]
    size = 81 if is_tabbar else (48 if 'marker' in name.lower() else 81)
    png_data = make_icon(draw_fn, size)
    filepath = os.path.join(TABBAR_DIR if is_tabbar else OUTPUT_DIR, name)
    with open(filepath, 'wb') as f:
        f.write(png_data)
    print(f"✅ Generated: {filepath} ({len(png_data)} bytes)")

print(f"\n🎉 All {len(ICONS)} icons generated successfully!")
