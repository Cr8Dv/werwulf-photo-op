import sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
PHOTO = sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    for name, vp, mob in [('mobile', {'width': 390, 'height': 844}, True), ('desktop', {'width': 1440, 'height': 900}, False)]:
        ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1, accept_downloads=True, permissions=['camera'])
        pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_timeout(1500)
        s = lambda n: pg.screenshot(path=f'qa/{name}_{n}.png')
        s('01_landing'); pg.check('#agree'); pg.click('#begin'); pg.wait_for_timeout(600); s('02_choose')
        if mob:
            pg.click('#btnCamera'); pg.wait_for_timeout(2000); s('02b_camera')
            pg.click('[data-go=choose]' if False else '#camera .link'); pg.wait_for_timeout(400)
        pg.set_input_files('#fileUpload', PHOTO); pg.wait_for_selector('#preview.active'); pg.wait_for_timeout(600); s('03_preview')
        pg.click('#usePhoto'); pg.wait_for_timeout(3500); s('04_generating')
        pg.wait_for_selector('#result.active', timeout=60000); pg.wait_for_timeout(800); s('05_result')
        with pg.expect_download() as d: pg.click('#download')
        d.value.save_as(f'qa/{name}_download.jpg'); pg.wait_for_timeout(1500); s('06_cta')
        ctx.close()
    b.close()
print('done')
