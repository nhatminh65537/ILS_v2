import os

content = ""

cwd = os.path.dirname(os.path.abspath(__file__))
for base, _, filenames in os.walk(cwd):
    for filename in filenames:
        if filename == 'db.sql':
            continue
        if filename.endswith('.sql'):
            filepath = os.path.join(base, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content += f.read() + "\n\n"

with open(os.path.join(cwd, 'db.sql'), 'w', encoding='utf-8') as f:
    f.write(content)

