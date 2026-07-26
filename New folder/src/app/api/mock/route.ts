import { NextResponse } from "next/server";
import { generateMockData } from "@/services/mock-generator";

export async function POST() {
  try {
    const result = await generateMockData();
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "تم ملء قاعدة البيانات بنجاح بـ " + result.count + " من الأفلام والمسلسلات عالية الجودة والآمنة 100%!",
        count: result.count
      });
    } else {
      return NextResponse.json({ success: false, error: "فشل في ملء قاعدة البيانات" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
