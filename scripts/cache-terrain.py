"""Bundle public DEM tiles for the default Merapi 20 km patch, preserving provenance."""
import argparse, concurrent.futures, datetime, json, math, pathlib, urllib.request
parser = argparse.ArgumentParser()
parser.add_argument("--context", action="store_true", help="Cache the 60 km surrounding Merapi landscape")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'terrain'
lat, lon, zoom = -7.54, 110.446, 10 if args.context else 12
half_width = 30.1 if args.context else 10.1
keys = set()
for east in (-half_width, 0, half_width):
    for north in (-half_width, 0, half_width):
        distance = math.hypot(east, north) / 6371
        bearing = math.atan2(east, north)
        a = math.radians(lat)
        b = math.asin(math.sin(a)*math.cos(distance)+math.cos(a)*math.sin(distance)*math.cos(bearing))
        c = math.radians(lon)+math.atan2(math.sin(bearing)*math.sin(distance)*math.cos(a),math.cos(distance)-math.sin(a)*math.sin(b))
        x = int((math.degrees(c)+180)/360*2**zoom)
        y = int((1-math.asinh(math.tan(b))/math.pi)/2*2**zoom)
        keys.add((x,y))
xmin,xmax=min(x for x,y in keys),max(x for x,y in keys)
ymin,ymax=min(y for x,y in keys),max(y for x,y in keys)
def download(key):
    x,y=key
    path=f'{zoom}/{x}/{y}.png'
    url=f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{path}'
    with urllib.request.urlopen(url,timeout=25) as response:
        content=response.read()
        if not content.startswith(b'\x89PNG'): raise ValueError('Expected PNG')
        dest=root/path; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(content)
        return (f'{zoom}/{x}/{y}', {'path':path,'source':response.headers.get('x-amz-meta-x-imagery-sources','Unspecified composite DEM'),'lastModified':response.headers.get('Last-Modified'),'url':url})
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    tiles=dict(pool.map(download,[(x,y) for x in range(xmin,xmax+1) for y in range(ymin,ymax+1)]))
existing = json.loads((root/'manifest.json').read_text()) if (root/'manifest.json').exists() else {'tiles': {}}
existing['tiles'].update(tiles)
tiles = existing['tiles']
(root/'manifest.json').write_text(json.dumps({'retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tiles':tiles},indent=2))
print(f'Bundled {len(tiles)} terrain tiles; source records preserved in public/terrain/manifest.json')
