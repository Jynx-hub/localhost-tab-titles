"""Serves the current directory on 127.0.0.1:<port>.

Not `python -m http.server`: its HTTPServer calls socket.getfqdn() before listening, which can
hang for 30s+ on CI runners with slow reverse DNS. A plain TCPServer skips that.
"""
import http.server
import socketserver
import sys


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


Server(("127.0.0.1", int(sys.argv[1])), http.server.SimpleHTTPRequestHandler).serve_forever()
