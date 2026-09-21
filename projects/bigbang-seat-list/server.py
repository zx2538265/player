"""Local-only seat list. Python 3.10+, no third-party dependencies."""
import csv
import io
import json
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
SOURCE = 'https://docs.google.com/spreadsheets/d/1sRUzihKsaGH8BO-YtRW429YzbnnWuz1rYu6Lnc-jTCk/export?format=csv&gid=405148681'
LOCK = threading.Lock()

def normalize(rows):
    header = next(rows)
    required = ['日期', '群友']
    indices = [header.index(key) for key in required]
    records = []
    for number, row in enumerate(rows, 2):
        if not any(str(value).strip() for value in row):
            continue
        values = [str(row[i]).strip() if i < len(row) else '' for i in indices]
        match = re.fullmatch(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?: 00:00:00)?', values[0])
        if not match:
            raise ValueError(f'第 {number} 列的日期無法辨識；保留舊資料，請檢查來源')
        day = datetime(*map(int, match.groups())).strftime('%Y-%m-%d')
        records.append(dict(zip(['date', 'name'], [day, *values[1:]]), sourceRow=number))
    if not records:
        raise ValueError('來源沒有名單；保留舊資料')
    return {'updatedAt': datetime.now(timezone.utc).isoformat(), 'records': records, 'source': SOURCE}

def save(data):
    path = ROOT / 'data/seats.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    temp.replace(path)

class Handler(BaseHTTPRequestHandler):
    def send(self, status, body, mime='application/json; charset=utf-8'):
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        files = {'/': ('public/index.html', 'text/html; charset=utf-8'), '/style.css': ('public/style.css', 'text/css; charset=utf-8'), '/app.js': ('public/app.js', 'text/javascript; charset=utf-8'), '/api/seats': ('data/seats.json', 'application/json; charset=utf-8')}
        item = files.get(self.path)
        if not item:
            return self.send(404, b'{}')
        try:
            self.send(200, (ROOT / item[0]).read_bytes(), item[1])
        except FileNotFoundError:
            self.send(503, b'{"error":"No local data. Refresh required."}')

    def do_POST(self):
        if self.path != '/api/refresh':
            return self.send(404, b'{}')
        if self.headers.get('X-Local-Refresh') != '1' or self.headers.get('Sec-Fetch-Site') not in (None, 'same-origin'):
            return self.send(403, b'{}')
        try:
            with LOCK:
                with urlopen(SOURCE, timeout=30) as response:
                    raw = response.read().decode('utf-8-sig')
                data = normalize(iter(csv.reader(io.StringIO(raw))))
                save(data)
            self.send(200, json.dumps(data, ensure_ascii=False).encode())
        except Exception:
            self.send(502, json.dumps({'error': '更新失敗，既有名單已保留。請確認網路與試算表讀取權限。'}, ensure_ascii=False).encode())

if __name__ == '__main__':
    print('BIGBANG seat list: http://127.0.0.1:8766', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
