import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { safeEqual } from '@/lib/timingSafeEqual';
import { getSiteSettingsFresh } from '@/lib/settings';

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';

// صفحة الصيانة — تُخدم لغير الإدارة عند تفعيل maintenance_mode من اللوحة.
function maintenanceResponse() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الموقع تحت الصيانة | 4CIMA</title>
<meta name="robots" content="noindex">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#e4e4e5;font-family:Cairo,sans-serif}
.box{text-align:center;padding:2rem}
h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#a1a1aa;font-size:.9rem;margin:0}
</style></head>
<body><div class="box"><h1>🛠 الموقع تحت الصيانة</h1><p>رجعنا قريب جدًا — فريق 4CIMA</p></div></body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300', 'Cache-Control': 'no-store' } },
  );
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
    // وضع الصيانة (كاش 60s على مستوى الـisolate): يمنع كل المسارات عدا الإدارة
    // والدخول والـauth والاستاتيك — فشل القراءة = مفتوح (لن يُقفل الموقع بخطأ إعدادات).
    const path = request.nextUrl.pathname;
    const bypass = isAdminRoute ||
      path.startsWith('/api/auth') ||
      path.startsWith('/login') ||
      path === '/maintenance';
    if (!bypass) {
      try {
        // قراءة حية (بلا كاش الـisolate): بعد purge الكاش في تفعيل الصيانة، isolate
        // عليه قيمة قديمة ممكن يرجّع 200 ويُخزَّن شهر — القراءة المباشرة تقفل الثغرة
        const settings = await getSiteSettingsFresh();
        if (settings.maintenance_mode) {
          const user = await getCurrentUser(request);
          if (!(user && (user.role === 'admin' || user.role === 'supervisor'))) {
            return maintenanceResponse();
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
