import requests
resp = requests.get('http://localhost:8000/metagraph/95487b6c/edges')
edges = resp.json()['edges']
for e in edges[:5]:
    inv = list(e['invertex'])[0]
    out = list(e['outvertex'])[0]
    print(f'{inv} --> {out}')
