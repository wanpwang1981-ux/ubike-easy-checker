import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the root directory so src/index.html works
        super().__init__(*args, **kwargs)

print(f"Starting server at port {PORT}...")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Aye aye, Captain! Server is now serving at http://localhost:{PORT}")
    print(f"Point yer browser to http://localhost:{PORT}/src/ to see the app.")
    httpd.serve_forever()
