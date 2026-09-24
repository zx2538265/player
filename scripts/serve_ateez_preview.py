"""Loopback-only static preview with byte ranges for local video seeking."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def send_head(self):
        self.remaining=None
        path=Path(self.translate_path(self.path));header=self.headers.get('Range')
        if not header or not path.is_file(): return super().send_head()
        m=re.fullmatch(r'bytes=(\d+)-(\d*)',header)
        if not m: self.send_error(416);return None
        size=path.stat().st_size;start=int(m[1]);end=min(int(m[2]) if m[2] else size-1,size-1)
        if start>end: self.send_error(416);return None
        stream=path.open('rb');stream.seek(start);self.remaining=end-start+1
        self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length',str(self.remaining));self.end_headers();return stream
    def copyfile(self,source,output):
        if self.remaining is None:return super().copyfile(source,output)
        try:
            while self.remaining:
                data=source.read(min(1024*1024,self.remaining))
                if not data:break
                output.write(data);self.remaining-=len(data)
        except (ConnectionResetError,BrokenPipeError): pass
if __name__=='__main__':
    print('http://127.0.0.1:8766/video/ateez-preview/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
