import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { safeEqual } from '@/lib/timingSafeEqual';
import { getSiteSettingsFresh, getMaintenanceUntil } from '@/lib/settings';

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';

/**
 * لاند بيدج الصيانة — HTML مستقل بلا أي طلبات خارجية حرجة (الخط وحده optional):
 * أورورا متحركة + حلقات 3D + نجوم + عداد تنازلي حي (Flip) + فتح تلقائي عند الانتهاء.
 * الحالة 503 مقصودة (إشارة SEO صحيحة للزواحف) — والصفحة مش بتتخزن في كاش الحافة.
 */
function maintenanceResponse(untilMs: number, nowMs: number): Response {
  const until = Number.isFinite(untilMs) && untilMs > 0 ? Math.floor(untilMs) : 0;
  const now = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>4CIMA — سوف نعود قريبًا جدًا</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{background:#05060a;color:#e8eaf2;font-family:'Cairo',system-ui,-apple-system,'Segoe UI',sans-serif;overflow:hidden}
/* ── خلفية: أورورا + شبكة أرضية + نجوم ── */
.bg{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 120%,#0b1224 0%,#05060a 60%);z-index:0}
.orb{position:fixed;border-radius:50%;filter:blur(90px);opacity:.55;z-index:1;will-change:transform}
.o1{width:46vmax;height:46vmax;background:radial-gradient(circle,#0891b2 0%,transparent 65%);top:-18vmax;right:-10vmax;animation:drift1 26s ease-in-out infinite alternate}
.o2{width:40vmax;height:40vmax;background:radial-gradient(circle,#7c3aed 0%,transparent 65%);bottom:-16vmax;left:-12vmax;animation:drift2 32s ease-in-out infinite alternate}
.o3{width:30vmax;height:30vmax;background:radial-gradient(circle,#dc2626 0%,transparent 60%);top:55%;right:20%;opacity:.28;animation:drift1 40s ease-in-out infinite alternate-reverse}
@keyframes drift1{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(-8vmax,6vmax,0) scale(1.15)}}
@keyframes drift2{from{transform:translate3d(0,0,0) scale(1.1)}to{transform:translate3d(9vmax,-7vmax,0) scale(.95)}}
.floor{position:fixed;left:-50%;right:-50%;bottom:-12%;height:55%;z-index:1;opacity:.25;
  background-image:linear-gradient(rgba(56,189,248,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.35) 1px,transparent 1px);
  background-size:60px 60px;transform:perspective(420px) rotateX(62deg);animation:floor 6s linear infinite}
@keyframes floor{from{background-position:0 0}to{background-position:0 60px}}
.star{position:fixed;border-radius:50%;background:#fff;z-index:1;animation:tw linear infinite}
@keyframes tw{0%,100%{opacity:.1}50%{opacity:.9}}
/* ── الحلقات ثلاثية الأبعاد حوالين البطاقة ── */
.scene{position:fixed;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;perspective:1100px}
.ring{position:absolute;width:min(78vmin,620px);height:min(78vmin,620px);border-radius:50%;
  border:1.5px solid rgba(56,189,248,.35);box-shadow:0 0 24px rgba(56,189,248,.12) inset;transform-style:preserve-3d}
.r1{animation:spin1 14s linear infinite}
.r2{width:min(92vmin,740px);height:min(92vmin,740px);border-color:rgba(124,58,237,.28);animation:spin2 22s linear infinite reverse}
.r3{width:min(64vmin,500px);height:min(64vmin,500px);border-color:rgba(248,113,113,.22);border-style:dashed;animation:spin1 9s linear infinite}
.ring::after{content:'';position:absolute;top:-4px;right:12%;width:9px;height:9px;border-radius:50%;background:#38bdf8;box-shadow:0 0 14px 3px rgba(56,189,248,.8)}
.r2::after{background:#a78bfa;box-shadow:0 0 14px 3px rgba(167,139,250,.8)}
.r3::after{background:#f87171;box-shadow:0 0 12px 3px rgba(248,113,113,.7)}
@keyframes spin1{from{transform:rotateX(72deg) rotateZ(0)}to{transform:rotateX(72deg) rotateZ(360deg)}}
@keyframes spin2{from{transform:rotateX(75deg) rotateZ(0)}to{transform:rotateX(75deg) rotateZ(360deg)}}
/* ── البطاقة ── */
.card{position:relative;z-index:3;width:min(92vw,560px);text-align:center;padding:clamp(24px,5vw,48px);
  background:rgba(10,14,26,.55);border:1px solid rgba(148,163,184,.18);border-radius:28px;
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(56,189,248,.06) inset;
  animation:up .9s cubic-bezier(.2,.9,.25,1) both}
@keyframes up{from{opacity:0;transform:translateY(34px) scale(.96)}to{opacity:1;transform:none}}
.logo{font-weight:900;font-size:clamp(28px,6vw,40px);letter-spacing:-1px;margin-bottom:6px;
  background:linear-gradient(90deg,#f87171,#38bdf8,#a78bfa,#f87171);background-size:300% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 6s linear infinite}
@keyframes shine{to{background-position:300% 0}}
.badge{display:inline-flex;align-items:center;gap:8px;margin:10px 0 18px;padding:7px 16px;border-radius:999px;
  background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.25);color:#7dd3fc;font-size:13px;font-weight:700}
.badge i{width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 10px 2px rgba(251,191,36,.6);animation:blink 1.6s ease-in-out infinite}
@keyframes blink{50%{opacity:.25}}
h1{font-size:clamp(24px,5.4vw,36px);font-weight:900;line-height:1.35}
.sub{color:#94a3b8;font-size:clamp(13px,2.6vw,15px);line-height:1.9;margin-top:10px}
/* ── العداد ── */
.cd{display:flex;justify-content:center;align-items:stretch;gap:10px;margin:26px 0 6px;direction:ltr}
.u{position:relative;min-width:clamp(76px,20vw,104px);padding:14px 8px 10px;border-radius:18px;
  background:linear-gradient(180deg,rgba(30,41,59,.75),rgba(15,23,42,.75));
  border:1px solid rgba(148,163,184,.16);box-shadow:0 14px 34px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.06) inset}
.u b{display:block;font-size:clamp(30px,8vw,48px);font-weight:900;line-height:1.1;
  background:linear-gradient(180deg,#fff,#7dd3fc);-webkit-background-clip:text;background-clip:text;color:transparent;
  font-variant-numeric:tabular-nums}
.u b.tick{animation:flip .45s cubic-bezier(.3,1.4,.5,1)}
@keyframes flip{0%{transform:rotateX(70deg);opacity:.15;filter:blur(2px)}100%{transform:none;opacity:1;filter:none}}
.u i{display:block;margin-top:5px;font-style:normal;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px}
.sep{display:flex;align-items:center;font-size:clamp(20px,5vw,30px);font-weight:900;color:#334155;padding-bottom:22px;animation:blink 1s steps(2) infinite}
.done{display:none;margin:22px 0 4px;padding:12px 18px;border-radius:14px;font-weight:900;font-size:16px;
  background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.4);color:#34d399;animation:up .5s both}
.done.show{display:block}
/* ── شريط تقدم غير محدد ── */
.bar{position:relative;height:5px;border-radius:99px;background:rgba(148,163,184,.12);overflow:hidden;margin:18px 8px 22px}
.bar i{position:absolute;top:0;bottom:0;width:38%;border-radius:99px;
  background:linear-gradient(90deg,transparent,#38bdf8,#a78bfa,transparent);animation:slide 1.8s ease-in-out infinite}
@keyframes slide{0%{right:-38%}100%{right:100%}}
button{cursor:pointer;font-family:inherit;font-weight:900;font-size:15px;color:#fff;padding:13px 34px;border:0;border-radius:14px;
  background:linear-gradient(135deg,#0891b2,#7c3aed);box-shadow:0 10px 30px rgba(8,145,178,.35);
  transition:transform .2s,box-shadow .2s}
button:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(124,58,237,.45)}
button:active{transform:translateY(0)}
.foot{margin-top:22px;font-size:11.5px;color:#475569}
.foot b{color:#64748b}
@media (prefers-reduced-motion:reduce){.orb,.floor,.ring,.ring::after,.bar i,.logo,.sep,.badge i{animation:none!important}}
@media (max-width:480px){.cd{gap:6px}.u{min-width:72px;padding:11px 6px 8px;border-radius:14px}}
</style>
</head>
<body>
<div class="bg"></div>
<div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
<div class="floor"></div>
<div class="scene">
  <div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>
  <div class="card">
    <div class="logo">4CIMA</div>
    <div class="badge"><i></i> نعتذر لكم عن هذا التوقف المؤقت</div>
    <h1>سوف نعود قريبًا جدًا</h1>
    <p class="sub">هذه صيانة مجدولة — نعمل حاليًا على تحديث سريع للمنصة لتقديم تجربة مشاهدة أفضل وأسرع.<br>العداد بالأسفل يوضّح الوقت المتبقي لعودة الموقع.</p>
    <div class="cd" id="cd">
      <div class="u"><b id="dh">00</b><i>ساعة</i></div><div class="sep">:</div>
      <div class="u"><b id="dm">00</b><i>دقيقة</i></div><div class="sep">:</div>
      <div class="u"><b id="ds">00</b><i>ثانية</i></div>
    </div>
    <div class="done" id="done">✅ اكتملت الصيانة — جارٍ فتح الموقع تلقائيًا…</div>
    <div class="bar"><i></i></div>
    <button onclick="location.reload()">إعادة المحاولة الآن</button>
    <p class="foot">فريق <b>فور سيما 4CIMA</b> يعمل الآن لعودة الموقع بأسرع وقت ممكن — عند انتهاء العداد سوف تُفتح الصفحة تلقائيًا. شكرًا لتفهّمكم، ونتمنى لكم قضاء وقتًا ممتعًا.</p>
  </div>
</div>
<script>
(function(){
  var UNTIL=${until},NOW=${now};
  var off=NOW?Date.now()-NOW:0;
  var stars=document.createElement('div');
  for(var i=0;i<70;i++){
    var s=document.createElement('i');s.className='star';
    var sz=(Math.random()*2+.6).toFixed(1);
    s.style.cssText='width:'+sz+'px;height:'+sz+'px;top:'+(Math.random()*100).toFixed(1)+'%;left:'+(Math.random()*100).toFixed(1)+'%;animation-duration:'+(2+Math.random()*4).toFixed(2)+'s;animation-delay:'+(Math.random()*4).toFixed(2)+'s';
    document.body.appendChild(s);
  }
  function p2(n){return (n<10?'0':'')+n}
  function set(id,v){var el=document.getElementById(id);if(el&&el.textContent!==v){el.textContent=v;el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick')}}
  var stopped=false;
  function tick(){
    if(stopped)return;
    var left=UNTIL?UNTIL-Date.now()+off:1;
    if(left<=0){
      stopped=true;
      document.getElementById('cd').style.display='none';
      document.getElementById('done').className='done show';
      setTimeout(function(){location.reload()},3000);
      return;
    }
    var s=Math.floor(left/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    set('dh',p2(h));set('dm',p2(m));set('ds',p2(sec));
  }
  if(!UNTIL){
    document.getElementById('cd').style.display='none';
  }else{
    setInterval(tick,250);tick();
  }
})();
</script>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set('x-build-sha', BUILD_SHA);

  // Ad endpoints must never be cached — kill switch must be instant.
  if (request.nextUrl.pathname.startsWith('/api/ads')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') ||
                       request.nextUrl.pathname.startsWith('/api/admin');
  if (!isAdminRoute) {
    // وضع الصيانة: قراءة حية من D1 (بلا كاش الـisolate) + موعد النهاية من site_config.
    // العداد خلص ⇒ الموقع بيفتح تلقائيًا (الوضع يفضل ON والعداد هو المتحكم).
    // فشل القراءة = مفتوح (لن يُقفل الموقع بخطأ إعدادات).
    const path = request.nextUrl.pathname;
    const bypass = isAdminRoute ||
      path.startsWith('/api/auth') ||
      path.startsWith('/login') ||
      path === '/maintenance';
    if (!bypass) {
      try {
        const settings = await getSiteSettingsFresh();
        if (settings.maintenance_mode) {
          const until = await getMaintenanceUntil();
          const stillActive = !until || Date.now() < until;
          if (stillActive) {
            const user = await getCurrentUser(request);
            if (!(user && (user.role === 'admin' || user.role === 'supervisor'))) {
              return maintenanceResponse(until, Date.now());
            }
          }
        }
      } catch {
        // أي خطأ في فحص الإعدادات = اسمح بالمرور
      }
    }
    return response;
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64 = authHeader.slice('Basic '.length);
      const decoded = atob(base64);
      const colonIndex = decoded.indexOf(':');
      if (colonIndex !== -1) {
        const userOk = await safeEqual(decoded.slice(0, colonIndex), username);
        const passOk = await safeEqual(decoded.slice(colonIndex + 1), password);
        if (userOk && passOk) {
          return response;
        }
      }
    }
  }

  try {
    const user = await getCurrentUser(request);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) {
      return response;
    }
  } catch (error) {
    console.error('D1 auth check failed:', error);
  }

  return NextResponse.redirect(
    new URL('/login?redirect=' + encodeURIComponent(request.nextUrl.pathname), request.url)
  );
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};