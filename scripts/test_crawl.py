import urllib.request
from bs4 import BeautifulSoup

# Desktop site URL for Romans chapter 1
# VR=GAE (Korean), CI=45 (Romans bk index), CV=1 (chapter)
url = "http://www.holybible.or.kr/B_GAE/cgi/bibleftxt.php?VR=GAE&CI=45&CV=1"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read()
    html = html.decode('euc-kr', errors='ignore')
    soup = BeautifulSoup(html, 'html.parser')
    
    # Verses on desktop are often in <font class='tk1'> or similar, inside a table
    # Lets find all tk1 classes
    verses = soup.find_all('font', class_='tk1')
    if not verses:
        verses = soup.find_all('font', class_='tk3')
        
    for v in verses[:5]:
        print(v.get_text())
        
except Exception as e:
    print(e)
