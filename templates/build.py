"""Build a deck: python templates/build.py decks/<project>

Reads decks/<project>/deck.json, slides.html, deck.js and writes index.html.
<!--BLOCK:name--> in slides.html pulls templates/blocks/<lang>/name.html.
{{var}} takes its value from deck.json; a value "@file" is read from the deck folder.
An unknown {{var}} stops the build, so nothing project specific slips through unfilled.
"""
import json, os, re, sys, time

T = os.path.dirname(os.path.abspath(__file__))

# partner logos on the company slide: the deck's developer goes first, then this order, 7 + 6 per row
LOGOS = [('emaar', 'Emaar'), ('sobha', 'Sobha'), ('damac', 'Damac'), ('nakheel', 'Nakheel'), ('omniyat', 'Omniyat'),
         ('mr8', 'Mr. Eight'), ('imtiaz', 'Imtiaz'), ('ellington', 'Ellington'), ('object1', 'Object 1'),
         ('danube', 'Danube'), ('select', 'Select Group'), ('tiger', 'Tiger'), ('bnw', 'BNW')]


def rd(p):
    return open(p, encoding='utf-8', errors='surrogateescape').read()


def logos(featured):
    order = [l for l in LOGOS if l[0] == featured] + [l for l in LOGOS if l[0] != featured]
    img = lambda l: '<img src="../../assets/brand/dev/%s.png" alt="%s">' % l
    return '        ' + ''.join(map(img, order[:7])) + '\n        ' + ''.join(map(img, order[7:]))


def build(deck):
    cfg = json.loads(rd(os.path.join(deck, 'deck.json')))
    lang = cfg.get('lang', 'ru')
    v = dict(cfg)
    for k, val in cfg.items():
        if isinstance(val, str) and val.startswith('@'):
            v[k] = rd(os.path.join(deck, val[1:])).rstrip('\n')
    v['logos'] = logos(cfg.get('featured_logo', ''))
    v['dubai_map'] = rd(os.path.join(T, 'blocks', 'dubai-2040-map.svg.html'))
    js = os.path.join(deck, 'deck.js')
    v['deck_script'] = rd(js) if os.path.exists(js) else ''
    v['v'] = time.strftime('%Y%m%d%H%M')

    def block(m):
        return rd(os.path.join(T, 'blocks', lang, m.group(1) + '.html')).rstrip('\n')
    v['slides'] = re.sub(r'<!--BLOCK:([\w-]+)-->', block, rd(os.path.join(deck, 'slides.html')).rstrip('\n'))

    out = rd(os.path.join(T, 'base.html'))
    for _ in range(5):  # values may contain {{vars}} themselves (blocks, map)
        out = re.sub(r'\{\{(\w+)\}\}', lambda m: v[m.group(1)] if m.group(1) in v else m.group(0), out)
    missing = sorted(set(re.findall(r'\{\{(\w+)\}\}', out)))
    if missing:
        sys.exit('Не заполнено в deck.json: ' + ', '.join(missing))
    open(os.path.join(deck, 'index.html'), 'w', encoding='utf-8', errors='surrogateescape', newline='\n').write(out)
    print('ok', os.path.join(deck, 'index.html'))


if __name__ == '__main__':
    build(sys.argv[1].rstrip('/\\'))
