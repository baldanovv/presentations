"""Build a stylised, rotated SVG map of Dubai from OpenStreetMap extracts.

Outputs an <svg> fragment with layers: land, water, roads, centres, key areas,
landmarks, labels. Colours come from CSS variables in deck.css.
"""
import json, math, os, sys
from shapely.geometry import LineString, Polygon, MultiPolygon, Point, box, mapping
from shapely.ops import linemerge, unary_union, split
from shapely import affinity

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'map.svg')

LAT0, LON0 = 25.12, 55.20
K = 1000.0  # units per degree before fit
COS = math.cos(math.radians(LAT0))


def proj(lon, lat):
    return ((lon - LON0) * COS * K, -(lat - LAT0) * K)


def load(name):
    p = os.path.join(HERE, name)
    if not os.path.exists(p):
        return None
    try:
        return json.load(open(p))
    except Exception:
        return None

# ---------- coastline -> land ----------
coast = load('coast.json')
lines = [LineString([proj(p['lon'], p['lat']) for p in e['geometry']]) for e in coast['elements'] if e['type'] == 'way']
merged = linemerge(lines)
geoms = list(merged.geoms) if hasattr(merged, 'geoms') else [merged]
rings = [g for g in geoms if g.is_ring]
opened = sorted([g for g in geoms if not g.is_ring], key=lambda g: -g.length)

# rotation so the coast runs horizontally, sea on top
a = proj(55.02, 24.99); b = proj(55.32, 25.28)
ANG = -math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))  # degrees to rotate (ccw positive in shapely)

frame = box(-700, -700, 700, 700)
# extend the open mainland coastline far beyond the frame so it splits it cleanly
_ext = []
for g in geoms:
    if g.is_ring:
        _ext.append(g); continue
    c = list(g.coords)
    if g.length > 2000:  # mainland
        c = [proj(55.95, 25.95)] + c + [proj(54.35, 24.45)] if c[0][1] < c[-1][1] else [proj(54.35, 24.45)] + c + [proj(55.95, 25.95)]
    _ext.append(LineString(c))
geoms = _ext
from shapely.ops import polygonize, nearest_points
from shapely.strtree import STRtree
coast_all = unary_union([g for g in geoms]).intersection(frame)
faces = list(polygonize(unary_union([frame.boundary, coast_all])))
segs = []
for g in geoms:
    c = list(g.coords)
    for i in range(len(c) - 1):
        segs.append(LineString([c[i], c[i + 1]]))
tree = STRtree(segs)
def is_land(pt):
    seg = segs[tree.nearest(pt)]
    (px, py), (qx, qy) = seg.coords
    cross = (qx - px) * (pt.y - py) - (qy - py) * (pt.x - px)
    return cross < 0  # y axis is flipped, so OSM "land on the left" becomes negative cross
land = unary_union([f for f in faces if f.area > 0.0001 and is_land(f.representative_point())])
print('sea test (should be False):', is_land(Point(proj(55.10, 25.25))), ' land test (True):', is_land(Point(proj(55.30, 25.10))))
islands = [Polygon(r.coords).buffer(0) for r in rings]
land = unary_union([land] + [i for i in islands if not land.contains(i.representative_point())])
# Dubai Islands = offshore islands in front of Deira
di_box = Polygon([proj(55.255, 25.285), proj(55.345, 25.285), proj(55.345, 25.36), proj(55.255, 25.36)])
dubai_islands = unary_union([i for i in islands if di_box.contains(i.centroid) and i.area > 0.05])

# ---------- rotate everything ----------
ORIGIN = (0, 0)

def rot(g):
    return affinity.rotate(g, ANG, origin=ORIGIN)

def rpt(lon, lat):
    p = rot(Point(proj(lon, lat)))
    return p.x, p.y

land_r = rot(land)
di_r = rot(dubai_islands)

# view window: from Palm Jebel Ali to Dubai Islands along coast, inland to Expo/DLRC
keys = [(54.97, 24.985), (55.33, 25.355), (55.40, 25.075), (55.15, 24.945), (55.42, 25.17), (55.20, 25.27)]
xs, ys = zip(*[rpt(*k) for k in keys])
pad = 6
minx, maxx = min(xs) - pad, max(xs) + pad
# sea headroom on top for labels
miny, maxy = min(ys) - 10, max(ys) + pad
W, H = 1664, 700
FITW = W - 470  # leave room on the right for the legend
s = min(FITW / (maxx - minx), H / (maxy - miny))
cx, cy = (minx + maxx) / 2, (miny + maxy) / 2

def tx(x, y):
    return (FITW / 2 + (x - cx) * s, H / 2 + (y - cy) * s)

view = box(*(lambda p0, p1: (min(p0[0], p1[0]), min(p0[1], p1[1]), max(p0[0], p1[0]), max(p0[1], p1[1])))(
    (cx - FITW / 2 / s, cy - H / 2 / s), (cx + (W - FITW / 2) / s, cy + H / 2 / s))).buffer(4)


def path_of(geom, tol=0.0):
    if geom.is_empty:
        return ''
    if tol:
        geom = geom.simplify(tol / s, preserve_topology=True)
    out = []
    def ring(coords, close=True):
        pts = [tx(x, y) for x, y in coords]
        d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
        return d + ('Z' if close else '')
    if geom.geom_type == 'Polygon':
        geoms_ = [geom]
    elif geom.geom_type == 'MultiPolygon':
        geoms_ = list(geom.geoms)
    elif geom.geom_type in ('LineString', 'MultiLineString'):
        ls = [geom] if geom.geom_type == 'LineString' else list(geom.geoms)
        return ' '.join(ring(l.coords, False) for l in ls if len(l.coords) > 1)
    else:
        geoms_ = [g for g in getattr(geom, 'geoms', []) if g.geom_type in ('Polygon',)]
    for p in geoms_:
        out.append(ring(p.exterior.coords))
        for h in p.interiors:
            out.append(ring(h.coords))
    return ' '.join(out)

land_v = land_r.intersection(view)

# ---------- water (creek / canal) ----------
water_paths = []
w = load('water.json')
if w:
    polys = []
    for e in w['elements']:
        if e['type'] == 'way' and 'geometry' in e:
            pts = [proj(p['lon'], p['lat']) for p in e['geometry']]
            if len(pts) > 3 and pts[0] == pts[-1]:
                polys.append(Polygon(pts).buffer(0))
            elif e.get('tags', {}).get('waterway') == 'canal':
                polys.append(LineString(pts).buffer(0.06))
        if e['type'] == 'relation':
            for m in e.get('members', []):
                if m.get('role') == 'outer' and 'geometry' in m:
                    pts = [proj(p['lon'], p['lat']) for p in m['geometry']]
                    if len(pts) > 3 and pts[0] == pts[-1]:
                        polys.append(Polygon(pts).buffer(0))
    if polys:
        water = rot(unary_union(polys)).intersection(view)
        water_paths.append(path_of(water, 0.4))

# ---------- roads ----------
def roads(name, tol):
    r = load(name)
    if not r:
        return ''
    ls = [LineString([proj(p['lon'], p['lat']) for p in e['geometry']]) for e in r['elements'] if e['type'] == 'way' and len(e.get('geometry', [])) > 1]
    m = linemerge(ls)
    m = rot(m).intersection(view)
    return path_of(m, tol)

road_major = roads('roads1.json', 0.6)
road_minor = roads('roads2.json', 0.8)

# ---------- zones ----------
def blob(pts, grow=1.2):
    poly = Polygon([proj(lo, la) for la, lo in pts]).convex_hull
    return rot(poly.buffer(-5, join_style=1).buffer(6.2, join_style=1, quad_segs=16))

centres = {
    '1': blob([(25.245, 55.276), (25.272, 55.284), (25.288, 55.318), (25.272, 55.343), (25.246, 55.322)]),
    '2': blob([(25.178, 55.255), (25.199, 55.262), (25.204, 55.289), (25.186, 55.300), (25.172, 55.279)]),
    '3': blob([(25.066, 55.128), (25.083, 55.124), (25.094, 55.141), (25.082, 55.156), (25.068, 55.148)]),
    '4': blob([(24.951, 55.136), (24.971, 55.138), (24.975, 55.161), (24.958, 55.168), (24.948, 55.152)]),
    '5': blob([(25.110, 55.371), (25.130, 55.372), (25.134, 55.394), (25.116, 55.400), (25.108, 55.386)]),
}
centre_anchor = {'1': (55.305, 25.262), '2': (55.270, 25.184), '3': (55.140, 25.080), '4': (55.152, 24.961), '5': (55.385, 25.121)}

dlrc_c = Point(proj(55.3845, 25.0905))
dlrc = rot(dlrc_c.buffer(9, quad_segs=3))  # ~1 km schematic outline
key = {'di': di_r.buffer(0.15, join_style=1), 'dlrc': dlrc}
key_anchor = {'di': (55.300, 25.318), 'dlrc': (55.3845, 25.0905)}

landmarks = [
    ('Burj Khalifa', 55.2744, 25.1972, 'right'),
    ('Burj Al Arab', 55.1853, 25.1412, 'above'),
    ('Atlantis', 55.1171, 25.1304, 'above'),
    ('Аэропорт DXB', 55.3657, 25.2532, 'below'),
    ('Global Village', 55.3080, 25.0718, 'below'),
]
island_labels = [
    ('Palm Jumeirah', 55.138, 25.118),
    ('Palm Jebel Ali', 54.990, 25.000),
    ('The World', 55.172, 25.222),
    ('Dubai Creek', 55.338, 25.218),
]

out = []
out.append(f'<svg class="dmap" viewBox="0 0 {W} {H}" role="img" aria-label="Карта Дубая: пять городских центров 2040, Dubai Islands и DLRC">')
out.append(f'<rect class="sea" x="0" y="0" width="{W}" height="{H}"/>')
out.append(f'<path class="land" fill-rule="evenodd" d="{path_of(land_v, 0.5)}"/>')
for wp in water_paths:
    out.append(f'<path class="water" fill-rule="evenodd" d="{wp}"/>')
if road_minor:
    out.append(f'<path class="road minor" pathLength="1" d="{road_minor}"/>')
if road_major:
    out.append(f'<path class="road major" pathLength="1" d="{road_major}"/>')
for name, lo, la in island_labels:
    x, y = tx(*rpt(lo, la))
    out.append(f'<text class="place" x="{x:.0f}" y="{y:.0f}">{name}</text>')
out.append('<g class="zones">')
for z, g in centres.items():
    x, y = tx(*rpt(*centre_anchor[z]))
    out.append(f'<g class="zone centre" data-z="c{z}"><path pathLength="1" fill-rule="evenodd" d="{path_of(g.intersection(view), 0.3)}"/>'
               f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17"/><text class="num" x="{x:.1f}" y="{y + 5.5:.1f}">0{z}</text></g>')
labels = {'di': 'Dubai Islands', 'dlrc': 'DLRC'}
offs = {'di': (-215, -2), 'dlrc': (70, 7)}
for z, g in key.items():
    x, y = tx(*rpt(*key_anchor[z]))
    ox, oy = offs[z]
    out.append(f'<g class="zone hot" data-z="{z}"><path pathLength="1" fill-rule="evenodd" d="{path_of(g.intersection(view), 0.25)}"/>'
               f'<circle class="ping" cx="{x:.1f}" cy="{y:.1f}" r="10"/><circle class="dot" cx="{x:.1f}" cy="{y:.1f}" r="7"/>'
               f'<text class="hotlabel" x="{x + ox:.1f}" y="{y + oy:.1f}">{labels[z]}</text></g>')
out.append('</g>')
out.append('<g class="marks">')
for name, lo, la, pos in landmarks:
    x, y = tx(*rpt(lo, la))
    if not (0 < x < W and 0 < y < H):
        continue
    dx, dy, anchor = {'below': (0, 24, 'middle'), 'above': (0, -14, 'middle'), 'right': (12, 5, 'start')}[pos]
    out.append(f'<g class="mark"><circle cx="{x:.1f}" cy="{y:.1f}" r="3.5"/><text x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{anchor}">{name}</text></g>')
out.append('</g>')
out.append(f'<text class="sea-label" x="{FITW*0.45:.0f}" y="36">Персидский залив</text>')
out.append(f'<text class="credit" x="{W - 8}" y="{H - 8}">© OpenStreetMap contributors</text>')
out.append('</svg>')
svg = '\n'.join(out)
open(OUT, 'w').write(svg)
print('angle', round(ANG, 1), 'bytes', len(svg), 'islands DI', len(getattr(dubai_islands, 'geoms', [dubai_islands])))
