"""Refresh the English catalog: python3 scripts/sync-marketplace.py [downloaded HTML]."""
from html.parser import HTMLParser
from pathlib import Path
import json, re, sys, urllib.request
class Catalog(HTMLParser):
    def __init__(self):
        super().__init__(); self.items=[]; self.item=None; self.field=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='li' and a.get('class')=='card':
            self.item={'id':str(len(self.items)), 'name':a['data-name'], 'category':a['data-cat'], 'description':'', 'package':None, 'url':''}
        if self.item is None:return
        if tag=='p':self.field='description'
        if tag=='a' and a.get('class')=='desc-link':self.item['url']='https://awesome-dsh-plugin.com'+a['href']
        if tag=='input' and a.get('value','').startswith('dsh plugin --profile web add '):
            spec=a['value'].removeprefix('dsh plugin --profile web add ')
            if re.fullmatch(r'(?:@[a-z0-9._-]+/)?[a-z0-9][a-z0-9._-]*',spec):self.item['package']=spec
    def handle_data(self,data):
        if self.item and self.field:self.item[self.field]+=data
    def handle_endtag(self,tag):
        if tag=='p':self.field=None
        if tag=='li' and self.item:
            self.items.append(self.item);self.item=None
source=Path(sys.argv[1]).read_text() if len(sys.argv)>1 else urllib.request.urlopen('https://awesome-dsh-plugin.com/',timeout=30).read().decode()
p=Catalog();p.feed(source)
if len(p.items)<10:raise RuntimeError('Marketplace markup changed; keeping the previous catalog.')
from datetime import datetime,timezone
Path('data/marketplace.json').write_text(json.dumps({'source':'https://awesome-dsh-plugin.com/','updatedAt':datetime.now(timezone.utc).isoformat(),'plugins':p.items},ensure_ascii=False))
print(f'{len(p.items)} plugins; {sum(bool(p["package"]) for p in p.items)} published packages')
