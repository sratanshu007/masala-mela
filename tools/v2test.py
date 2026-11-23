from playwright.sync_api import sync_playwright
import time, sys
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']); pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    pg.set_default_timeout(150000); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8773/www/index.html')
    pg.wait_for_function("document.querySelector('#tapStart').style.display==='inline-block'",timeout=150000)
    print('ready', flush=True); pg.evaluate("document.querySelector('#tapStart').click()"); time.sleep(2)
    pg.screenshot(path='/tmp/claude-0/v1.png'); print("shot", '/tmp/claude-0/v1.png', flush=True)
    pg.evaluate("document.querySelector('[data-phone]').click()"); time.sleep(0.5)
    pg.fill('#lgPhone','9876543210'); pg.fill('#lgName','Aaryan')
    pg.evaluate("document.querySelector('[data-send]').click()"); time.sleep(0.8)
    pg.screenshot(path='/tmp/claude-0/v2.png'); print("shot", '/tmp/claude-0/v2.png', flush=True)
    for i,c in enumerate('123456'): pg.fill(f'.otp input[data-i="{i}"]', c)
    time.sleep(2.5)
    for i in range(14): pg.evaluate("(()=>{const e=document.querySelector('#dlg.on'); if(e) e.click();})()"); time.sleep(0.2)
    pg.evaluate("MM_UI.closeModal()"); time.sleep(0.6)
    pg.evaluate("()=>{MM_SAVE.data.seen.intro=1;MM_SAVE.data.level=12;for(let i=1;i<12;i++)MM_SAVE.data.stars[i]=2+(i%2);MM_SAVE.save();MM_UI.home()}"); time.sleep(1.2)
    pg.screenshot(path='/tmp/claude-0/v3.png'); print("shot", '/tmp/claude-0/v3.png', flush=True)
    for name in ['wheel','missions','leaderboard','profile','daily','shop']:
        pg.evaluate(f"document.querySelector('[data-open=\"{name}\"]').click()"); time.sleep(1)
        if name=='wheel':
            pg.evaluate("(()=>{const b=document.querySelector('[data-spin2]'); if(b) b.click();})()"); time.sleep(2)
        pg.screenshot(path=f'/tmp/claude-0/v_{name}.png')
        if name=='wheel': time.sleep(3)
        pg.evaluate("MM_UI.closeModal()"); time.sleep(0.4)
    print('user', pg.evaluate("JSON.stringify(MM_BACKEND.user && {name:MM_BACKEND.user.name, phone:MM_BACKEND.user.phone})"), 'coins', pg.evaluate("MM_SAVE.data.coins"), 'missions', pg.evaluate("JSON.stringify(MM_SAVE.data.missions.prog)"))
    print('errors', errs[:8]); b.close()
from PIL import Image
fs=['v1','v2','v3','v_wheel','v_missions','v_leaderboard','v_profile','v_daily','v_shop']
ims=[Image.open(f'/tmp/claude-0/{f}.png').resize((260,563)) for f in fs]
for k in range(2):
    row=ims[k*5:(k+1)*5]; W=Image.new('RGB',(260*len(row),563),'white')
    for j,im in enumerate(row): W.paste(im,(260*j,0))
    W.save(f'/tmp/claude-0/vsheet{k}.png')
