import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Set the directory to be served
        super().__init__(*args, directory='.', **kwargs)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    # Ensure the server is started from the project root
    print(f"Serving at http://localhost:{PORT}")
    print("To view the app, navigate to http://localhost:8000/src/")
    httpd.serve_forever()
