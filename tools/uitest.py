# Headless UI play-test: boots the game, plays levels with real swaps, screenshots every screen.
import subprocess, time, time, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
os.makedirs(OUT, exist_ok=True)
www = os.path.join(os.path.dirname(__file__), '..', 'www')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765'], cwd=www, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors = []
def tap(pg, sel):
    try: pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}'); if(e) e.click();}})()")
    except Exception: pass
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
        pg.set_default_timeout(120000)
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
        pg.goto('http://localhost:8765/index.html')
        pg.wait_for_timeout(700); pg.screenshot(path=f'{OUT}/01_splash.png')
        pg.wait_for_selector('#tapStart', state='visible', timeout=5000)
        pg.click('#tapStart', force=True); pg.wait_for_timeout(1500)

        for _ in range(20):
            if pg.evaluate("!!document.querySelector('#login.on')"): break
            time.sleep(0.3)
        if pg.evaluate("!!document.querySelector('#login.on [data-guest]')"):
            pg.evaluate("document.querySelector('#login [data-guest]').click()"); time.sleep(0.4)
            pg.evaluate("document.querySelector('#login [data-go]').click()"); time.sleep(1.5)
        pg.screenshot(path=f'{OUT}/02_story.png')
        for i in range(12):
            if pg.is_visible('#dlg.on'):
                tap(pg, '#dlg'); pg.wait_for_timeout(120); tap(pg, '#dlg'); pg.wait_for_timeout(150)
        pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/03_prelevel.png')
        pg.click('[data-play]', force=True); pg.wait_for_timeout(1800)
        for i in range(6):
            if pg.is_visible('#dlg.on'): tap(pg, '#dlg'); pg.wait_for_timeout(300)
        pg.screenshot(path=f'{OUT}/04_game.png')
        # play moves through the real input handler path
        def play(n):
            for i in range(n):
                over = pg.evaluate('!MM_UI.game || MM_UI.game.over')
                if over: break
                pg.evaluate('''async () => { const g = MM_UI.game; while (g.busy) await new Promise(r=>setTimeout(r,50));
                   const m = g.findMoves(false).sort((a,b)=>b.value-a.value)[0]; if (m) MM_UI.board.hooks.onSwap(m.a, m.b); }''')
                pg.wait_for_timeout(900)
        play(4); pg.screenshot(path=f'{OUT}/05_midgame.png')
        play(40); pg.wait_for_timeout(3500)
        pg.screenshot(path=f'{OUT}/06_result.png')
        print('level1 won:', pg.evaluate('MM_SAVE.data.level'), 'stars', pg.evaluate('JSON.stringify(MM_SAVE.data.stars)'))
        # go to map
        if pg.is_visible('[data-map]'): pg.click('[data-map]', force=True); pg.wait_for_timeout(1200)
        for i in range(4):
            if pg.is_visible('#dlg.on'): tap(pg, '#dlg'); pg.wait_for_timeout(200)
        pg.screenshot(path=f'{OUT}/07_map.png')
        # popups
        for name in ['shop', 'daily', 'events', 'profile', 'lives']:
            pg.evaluate(f"document.querySelector('[data-open=\"{name}\"]').click()"); pg.wait_for_timeout(500)
            pg.screenshot(path=f'{OUT}/08_{name}.png')
            pg.evaluate('MM_UI.closeModal()'); pg.wait_for_timeout(300)
        # jump to later worlds to render blockers
        for lv in [8, 33, 47, 77, 107, 122, 150]:
            pg.evaluate(f'''() => {{ MM_SAVE.data.level = {lv}; MM_SAVE.data.seen = {{intro:1,prefinale:1}}; for (let w=1;w<=10;w++) MM_SAVE.data.seen['w'+w]=1; MM_SAVE.data.lives=5; MM_SAVE.save(); }}''')
            pg.evaluate(f'document.querySelector("#playBtn") && MM_UI.home()'); pg.wait_for_timeout(400)
            pg.click('#playBtn', force=True); pg.wait_for_timeout(500)
            if pg.is_visible('[data-play]'): pg.click('[data-play]', force=True)
            pg.wait_for_timeout(1700)
            for i in range(4):
                if pg.is_visible('#dlg.on'): tap(pg, '#dlg'); pg.wait_for_timeout(250)
            play(2)
            pg.screenshot(path=f'{OUT}/10_level{lv}.png')
            pg.evaluate('MM_UI.pause()'); pg.wait_for_timeout(300)
            pg.click('[data-quit]', force=True); pg.wait_for_timeout(900)
        # force a loss popup
        pg.evaluate("() => { MM_SAVE.data.lives=5; MM_SAVE.save(); }")
        pg.click('#playBtn', force=True); pg.wait_for_timeout(500); pg.click('[data-play]', force=True); pg.wait_for_timeout(1700)
        pg.evaluate("MM_UI.game.moves = 1"); play(1); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{OUT}/11_lose.png')
        b.close()
finally:
    srv.terminate()
print('ERRORS:', len(errors))
for e in errors[:30]: print(' ', e)
