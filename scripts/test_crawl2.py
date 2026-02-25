import urllib.request
from bs4 import BeautifulSoup
import re

url_gae = "http://www.holybible.or.kr/B_GAE/cgi/bibleftxt.php?VR=GAE&VL=45&CN=1&CV=99"
req = urllib.request.Request(url_gae, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('euc-kr', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')

print("Method 1 (Old): separator=' '")
ols = soup.find_all('ol')
for ol in ols:
    if ol.get('id', '').startswith('b_001'):
        fonts = ol.find_all('font')
        for f in fonts[:2]:
            text = f.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            print(text)

print("\nMethod 2: NO separator, just get_text() + clean whitespace")
for ol in ols:
    if ol.get('id', '').startswith('b_001'):
        fonts = ol.find_all('font')
        for f in fonts[:2]:
            text = f.get_text()
            # replace newlines/tabs with space
            text = re.sub(r'[\r\n\t]+', ' ', text)
            # reduce multiple spaces to list
            text = re.sub(r'\s{2,}', ' ', text).strip()
            print(text)
