"""Sample deployable challenge: a tiny Flask app with a path-traversal flaw.

The per-user flag is injected by the deploy server as the env var FLAG and written
to a file the app will *not* serve directly — the player must exploit the
``/read?file=`` endpoint (no path sanitisation) to read it.

This is intentionally vulnerable; it exists only to demonstrate the instance-flag
deploy flow end to end.
"""
import os

from flask import Flask, request

app = Flask(__name__)

FLAG = os.environ.get('FLAG', 'ILS{local_debug_flag}')
FLAG_PATH = '/secret/flag.txt'

os.makedirs(os.path.dirname(FLAG_PATH), exist_ok=True)
with open(FLAG_PATH, 'w', encoding='utf-8') as fh:
    fh.write(FLAG)


@app.route('/')
def index():
    return (
        '<h1>Baby File Reader</h1>'
        '<p>This service reads files for you. Try '
        '<code>/read?file=/etc/hostname</code>.</p>'
        '<p>The flag is somewhere on the filesystem. Good luck.</p>'
    )


@app.route('/read')
def read():
    # VULN: no sanitisation — path traversal lets the player read the flag file.
    path = request.args.get('file', '')
    if not path:
        return 'Provide ?file=', 400
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as fh:
            return f'<pre>{fh.read()}</pre>'
    except (FileNotFoundError, IsADirectoryError, PermissionError) as exc:
        return f'Cannot read {path}: {exc}', 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
