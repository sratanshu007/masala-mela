# Captures raw gameplay screens, then composes captioned store screenshots.
import subprocess, time, sys, time, os, base64
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
RAW = '/tmp/claude-0/raw'; os.makedirs(RAW, exist_ok=True)
SIZES = {'play': (360, 640, 'store/screenshots-android'), 'ios69': (440, 956, 'store/screenshots-iphone-6.9')}
CAPS = [('1', 'Desi khaane ka match‑3!', 'Jalebi, samosa, mirchi — 3 milao, swaad bachao'),
        ('2', '150 levels, 10 shehar', 'Chai Chowk se Rasoi Mahal tak ka safar'),
        ('3', 'Belan Blast! Kadhai Dhamaka!', 'Desi specials se bade combo banao'),
        ('4', 'Fika Seth ko haraao', 'Boss levels, blockers aur naye niyam'),
        ('5', 'Meethi aur Dabbu ki kahani', 'Hinglish story, desi music aur tyohaar'),
        ('6', 'Har din naya inaam', 'Kismat ka Kadhai — roz khelo, roz jeeto')]
def setup(pg, level):
    pg.evaluate(f"()=>{{MM_SAVE.data.level={level};MM_SAVE.data.coins=2450;MM_SAVE.data.seen={{intro:1,prefinale:1}};for(let i=1;i<=160;i++)MM_SAVE.data.seen['tip'+i]=1;for(let w=1;w<=10;w++)MM_SAVE.data.seen['w'+w]=1;for(let i=1;i<{level};i++)MM_SAVE.data.stars[i]=1+(i*7)%3;MM_SAVE.data.daily={{last:'',streak:0}};MM_SAVE.save();}}")
def start_level(pg, n):
    setup(pg, n); pg.evaluate('MM_UI.home()'); pg.wait_for_timeout(300)
    pg.click('#playBtn', force=True); pg.wait_for_timeout(500); pg.click('[data-play]', force=True); pg.wait_for_timeout(2600)
def move(pg, k=1):
    for _ in range(k):
        pg.evaluate('''async()=>{const g=MM_UI.game;while(g.busy)await new Promise(r=>setTimeout(r,50));const m=g.findMoves(false).sort((a,b)=>b.value-a.value)[0];if(m)MM_UI.board.hooks.onSwap(m.a,m.b);}''')
        pg.wait_for_timeout(700)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        for key, (w, h, outdir) in ({} if os.environ.get('COMPOSE_ONLY') else SIZES).items():
            pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=3); pg.set_default_timeout(8000)
            pg.on('pageerror', lambda e: print('PAGEERR', e))
            pg.set_default_timeout(180000); pg.goto('http://localhost:8768/www/index.html'); pg.wait_for_function("document.querySelector('#tapStart').style.display==='inline-block'", timeout=120000)
            setup(pg, 3); pg.click('#tapStart', force=True); pg.wait_for_timeout(1000)

            for _ in range(20):
                if pg.evaluate("!!document.querySelector('#login.on')"): break
                time.sleep(0.3)
            if pg.evaluate("!!document.querySelector('#login.on [data-guest]')"):
                pg.evaluate("document.querySelector('#login [data-guest]').click()"); time.sleep(0.4)
                pg.evaluate("document.querySelector('#login [data-go]').click()"); time.sleep(1.5)
            pg.evaluate('MM_UI.closeModal()')
            # 1 gameplay with praise
            start_level(pg, 23); move(pg, 2); pg.evaluate("MM_UI.board.hooks.onEvent('matched',{combo:3,size:9})"); pg.wait_for_timeout(250)
            pg.screenshot(path=f'{RAW}/{key}_1.png'); print(key,1,flush=True); pg.evaluate('MM_UI.pause()'); pg.wait_for_timeout(200); pg.click('[data-quit]', force=True); pg.wait_for_timeout(800)
            # 2 map
            setup(pg, 34); pg.evaluate('MM_UI.home()'); pg.wait_for_timeout(600); pg.screenshot(path=f'{RAW}/{key}_2.png'); print(key,2,flush=True)
            # 3 specials: place specials and fire a combo
            start_level(pg, 62)
            pair = pg.evaluate("()=>{const g=MM_UI.game;for(let r=4;r<9;r++)for(let c=1;c<6;c++){const A=g.cells[r][c],B=g.cells[r][c+1];if(g.movable(A)&&g.movable(B)&&!A.p.ing&&!B.p.ing){A.p.sp='h';B.p.sp='k';return [[r,c],[r,c+1]];}}}")
            pg.wait_for_timeout(300); pg.evaluate(f"MM_UI.board.hooks.onSwap({pair[0]},{pair[1]})"); pg.wait_for_timeout(260)
            pg.screenshot(path=f'{RAW}/{key}_3.png'); print(key,3,flush=True); pg.wait_for_timeout(1500); pg.evaluate('MM_UI.pause()'); pg.wait_for_timeout(200); pg.click('[data-quit]', force=True); pg.wait_for_timeout(800)
            # 4 boss
            start_level(pg, 150); move(pg, 1); pg.wait_for_timeout(800); pg.screenshot(path=f'{RAW}/{key}_4.png'); print(key,4,flush=True)
            pg.evaluate('MM_UI.pause()'); pg.wait_for_timeout(200); pg.click('[data-quit]', force=True); pg.wait_for_timeout(800)
            print('to5',flush=True)
            # 5 story
            setup(pg, 16); print('s16',flush=True); pg.evaluate('MM_UI.home()'); print('h16',flush=True); pg.wait_for_timeout(300)
            pg.evaluate("()=>{MM_UI.playScene([{who:'dabbu',t:'Namaste! Main Dabbu. Bhookh lagi hai! Chalo Meethi, swaad wapas laate hain!'}]); return 1;}"); pg.wait_for_timeout(2600)
            pg.screenshot(path=f'{RAW}/{key}_5.png'); print(key,5,flush=True); pg.click('#dlg', force=True); pg.wait_for_timeout(400)
            # 6 daily
            pg.evaluate("document.querySelector('[data-open=\"daily\"]').click()"); pg.wait_for_timeout(700); pg.screenshot(path=f'{RAW}/{key}_6.png'); print(key,6,flush=True); pg.evaluate('MM_UI.closeModal()')
            pg.close()
        # compose
        os.makedirs(os.path.join(root, 'store'), exist_ok=True)
        for key, (w, h, outdir) in SIZES.items():
            os.makedirs(os.path.join(root, outdir), exist_ok=True)
            pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=3)
            for i, title, sub in CAPS:
                data = base64.b64encode(open(f'{RAW}/{key}_{i}.png', 'rb').read()).decode()
                html = f'''<html><head><meta charset="utf-8"><link rel="stylesheet" href="../www/css/style.css"></head><body style="margin:0;overflow:hidden;background:radial-gradient(circle at 50% 20%,#FFC36B,#FF8A3D 40%,#B43A0C)">
                <div style="position:absolute;inset:-30%;background:repeating-conic-gradient(rgba(255,255,255,.12) 0 9deg,transparent 9deg 18deg)"></div>
                <div style="position:relative;text-align:center;padding:{h*0.035}px 14px 0;color:#fff;font-family:Baloo">
                <div style="font-weight:800;font-size:{w*0.078}px;line-height:1.05;paint-order:stroke fill;-webkit-text-stroke:5px #7A1F0E;text-shadow:0 4px 0 #7A1F0E">{title}</div>
                <div style="font-size:{w*0.045}px;margin-top:6px;text-shadow:0 2px 0 #7A1F0E">{sub}</div></div>
                <div style="position:absolute;left:50%;transform:translateX(-50%);top:{h*0.2}px;width:{w*0.8}px;border-radius:28px;overflow:hidden;border:6px solid #2B1B5A;box-shadow:0 18px 40px rgba(0,0,0,.4)">
                <img src="data:image/png;base64,{data}" style="width:100%;display:block"></div></body></html>'''
                open(os.path.join(root, 'tools', '_compose.html'), 'w').write(html)
                pg.goto(f'http://localhost:8768/tools/_compose.html?{key}{i}'); pg.wait_for_timeout(500)
                pg.screenshot(path=os.path.join(root, outdir, f'{i}.png'))
        b.close()
finally:
    srv.terminate()
