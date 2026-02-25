import urllib.request
import re
from bs4 import BeautifulSoup
import time
import os

def parse_verses(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []
        
    try:
        html = html.decode('euc-kr')
    except:
        html = html.decode('utf-8', errors='ignore')
        
    soup = BeautifulSoup(html, 'html.parser')
    
    verses = []
    # Find all <ol> tags
    ols = soup.find_all('ol')
    for ol in ols:
        # Some <ol> might not be verses, but verses have id starting with b_
        if ol.get('id', '').startswith('b_'):
            # Fetch <font> tags directly to avoid unclosed <li> nesting issues
            fonts = ol.find_all('font')
            for f in fonts:
                text = f.get_text()
                # Replace whitespace (newlines/tabs) and reduce multiple spaces
                text = re.sub(r'[\r\n\t]+', ' ', text)
                text = re.sub(r'\s{2,}', ' ', text).strip()
                if text:
                    verses.append(text)
                
    return verses

def main():
    output_lines = []
    
    for ch in range(1, 17):
        url_niv = f"http://www.holybible.or.kr/B_NIV/cgi/bibleftxt.php?VR=NIV&VL=45&CN={ch}&CV=99"
        url_gae = f"http://www.holybible.or.kr/B_GAE/cgi/bibleftxt.php?VR=GAE&VL=45&CN={ch}&CV=99"
        
        print(f"Crawling Romans Chapter {ch}...")
        
        niv_verses = parse_verses(url_niv)
        gae_verses = parse_verses(url_gae)
        
        # Merge them
        max_v = max(len(niv_verses), len(gae_verses))
        print(f"  - Found {len(niv_verses)} NIV, {len(gae_verses)} GAE")
        
        for v in range(max_v):
            verse_num = v + 1
            niv_text = niv_verses[v] if v < len(niv_verses) else "(No verse)"
            gae_text = gae_verses[v] if v < len(gae_verses) else "(No verse)"
            
            output_lines.append(f"{ch}:{verse_num} {niv_text}")
            output_lines.append(f"{ch}:{verse_num} {gae_text}")
            output_lines.append("") # empty line separator
            
        time.sleep(0.5) # be polite to the server
        
    os.makedirs("app/private1", exist_ok=True)
    with open("app/private1/romans.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
        
    print("Done! Saved to app/private1/romans.txt")

if __name__ == "__main__":
    main()
