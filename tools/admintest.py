from playwright.sync_api import sync_playwright
import time
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':860})
    pg.set_default_timeout(60000); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8773/www/admin/index.html'); time.sleep(1.5)
    pg.screenshot(path='/tmp/claude-0/a0.png')
    pg.fill('#adEmail','admin@deificdigital.com'); pg.fill('#adPass','mela@2026'); pg.click('#adLogin button'); time.sleep(1.5)
    pg.click('[data-seed]'); time.sleep(1.5)
    pg.mouse.move(500, 470); time.sleep(0.3)
    pg.screenshot(path='/tmp/claude-0/a1.png', full_page=False)
    for k in ['players','config','events','levels','messages','setup']:
        pg.click(f'[data-p="{k}"]'); time.sleep(1.2)
        if k=='players':
            pg.click('tr.click'); time.sleep(0.6); pg.screenshot(path='/tmp/claude-0/a_players_drawer.png'); pg.click('[data-close]'); time.sleep(0.4)
        pg.screenshot(path=f'/tmp/claude-0/a_{k}.png')
    # config change round trip
    pg.click('[data-p="config"]'); time.sleep(1)
    pg.fill('[data-f="ads.interstitialEveryWins"]','4'); pg.dispatch_event('[data-f="ads.interstitialEveryWins"]','change')
    pg.click('.savebar [data-save]'); time.sleep(1)
    print('saved cfg', pg.evaluate("MM_CONFIG.get().ads.interstitialEveryWins"))
    # phone width
    pg.set_viewport_size({'width':390,'height':844}); pg.click('[data-p="dash"]'); time.sleep(1.2); pg.screenshot(path='/tmp/claude-0/a_phone.png')
    print('errors', errs[:6]); b.close()
