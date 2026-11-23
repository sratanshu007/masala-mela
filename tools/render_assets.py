# Renders icon / splash / store graphics from tools/assets.html
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
root = os.path.join(os.path.dirname(__file__), '..')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']); pg = b.new_page(viewport={'width': 2800, 'height': 2800})
        pg.set_default_timeout(180000); pg.goto('http://localhost:8766/tools/assets.html'); pg.wait_for_function('window.assetsReady === true', timeout=120000); pg.wait_for_timeout(500)
        jobs = [('icon', 'assets/icon-only.png', False), ('iconfg', 'assets/icon-foreground.png', True), ('iconbg', 'assets/icon-background.png', False),
                ('splash2', 'assets/splash.png', False), ('splash2', 'assets/splash-dark.png', False), ('feature', 'store/feature-graphic-1024x500.png', False),
                ('icon', 'store/icon-512.png', False)]
        for el, out, transparent in jobs:
            pg.evaluate(f"document.querySelectorAll('.a').forEach(e=>e.classList.toggle('on', e.id==='{el}'))")
            pg.wait_for_timeout(200)
            pg.locator('#' + el).screenshot(path=os.path.join(root, out), omit_background=transparent)
        b.close()
finally:
    srv.terminate()
