# Builds a single self-contained HTML of the game (for the web demo / artifact).
import re, base64, os
root = os.path.join(os.path.dirname(__file__), '..', 'www')
html = open(os.path.join(root, 'index.html')).read()
css = open(os.path.join(root, 'css/style.css')).read() + '\n' + open(os.path.join(root, 'admin/admin.css')).read()
css = re.sub(r"url\(\.\./fonts/([^)]+)\)", lambda m: "url(data:font/woff2;base64," + base64.b64encode(open(os.path.join(root, 'fonts', m.group(1)), 'rb').read()).decode() + ")", css)
body = html.split('<body>')[1].split('</body>')[0]
def inline_js(m):
    return '<script>\n' + open(os.path.join(root, m.group(1))).read() + '\n</script>'
body = re.sub(r'<script src="([^"]+)"></script>', inline_js, body)
icon = base64.b64encode(open(os.path.join(root, 'img/icon-192.png'), 'rb').read()).decode()
out = f'''<title>Masala Mela</title>
<meta name="description" content="Masala Mela: Swaad Bachao — desi food match-3 by Deific Digital">
<link rel="icon" href="data:image/png;base64,{icon}">
<style>
{css}
</style>
{body}'''
open(os.path.join(os.path.dirname(__file__), '..', 'dist', 'masala-mela-web.html'), 'w').write(out)
print(len(out) // 1024, 'KB')
