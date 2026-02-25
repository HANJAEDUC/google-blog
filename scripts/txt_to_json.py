import json

data = []
with open('app/private1/romans.txt', 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f if line.strip()]

i = 0
while i < len(lines):
    l1 = lines[i]
    if i + 1 < len(lines):
        l2 = lines[i+1]
    else:
        l2 = ""
        
    parts1 = l1.split(' ', 1)
    if len(parts1) == 2 and ':' in parts1[0]:
        cv = parts1[0].split(':')
        ch = int(cv[0])
        v = int(cv[1])
        niv = parts1[1]
        
        gae = ""
        parts2 = l2.split(' ', 1)
        if len(parts2) == 2 and parts2[0] == parts1[0]:
            gae = parts2[1]
            i += 2
        else:
            i += 1
            
        data.append({
            "chapter": ch,
            "verse": v,
            "niv": niv,
            "gae": gae
        })
    else:
        i += 1

with open('app/private1/romans.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Converted to app/private1/romans.json")
