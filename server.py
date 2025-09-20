import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = "."
LOG_FILE = "server.log"

# Redirect stdout and stderr to a log file
sys.stdout = open(LOG_FILE, 'w')
sys.stderr = sys.stdout

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Also log requests to the file
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

print(f"Server configuration: PORT={PORT}, DIRECTORY={DIRECTORY}")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT} from directory {DIRECTORY}")
    httpd.serve_forever()
