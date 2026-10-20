import re, time
src=open('villa-del-garda/index.html',encoding='utf-8',errors='surrogateescape').read()
t=open('kore/_template.html',encoding='utf-8').read()
svg=open('kore/_dmap.svg.html',encoding='utf-8',errors='surrogateescape').read()
def notes(marker):
    i=src.index('<!-- '+marker+' -->'); j=src.index('</section>',i)
    m=re.search(r'<aside class="notes">.*?</aside>',src[i:j],re.S); return m.group(0)
def fix(n,marker):
    n=n.replace('Проект, который я покажу, проходит по этому порогу.','Важно: одна квартира в KORE дешевле 2 млн AED. Для визы нужно 2 юнита или другой проект.')
    n=n.replace('и MR. EIGHT, проект которого я покажу сегодня.','и Imtiaz, проект которого я покажу сегодня.')
    n=n.replace('А вот два района, на которых мы сейчас сфокусированы. Dubai Islands, флагманский проект государственного девелопера Nakheel и ключевая часть обновления исторического центра Deira. И DLRC в Dubailand, часть центра Silicon Oasis. Оба района входят в план города, то есть государство в них вкладывает.','А вот район проекта, который я покажу: DLRC в Dubailand, часть центра 05 Silicon Oasis. Он входит в план города, то есть государство в него вкладывает.')
    n=n.replace('Наведи на Dubai Islands: подсветится вместе с центром 01.','Наведи на DLRC в легенде: подсветится вместе с центром 05.')
    n=n.replace('Александр, добрый день!','[Имя клиента], добрый день!')
    return n
for m in re.findall(r'<!--NOTES:(.*?)-->',t):
    t=t.replace('<!--NOTES:'+m+'-->',fix(notes(m),m))
t=t.replace('__DMAP__',svg.replace('Dubai Islands и DLRC','и DLRC, где находится KORE').replace('x="640.0" y="626.4">DLRC · KORE','x="560.0" y="626.4">DLRC · KORE')).replace('__V__',time.strftime('%Y%m%d%H%M'))
open('kore/index.html','w',encoding='utf-8',errors='surrogateescape').write(t)
for w in ['Garda','Dubai Islands','Mr. Eight','MR. EIGHT','Creek Harbour','Islands']:
    for mm in re.finditer(w,t): print(w, t[max(0,mm.start()-120):mm.start()+60].replace('\n',' ')[:200])
