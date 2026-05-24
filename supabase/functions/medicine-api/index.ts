/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method !== "POST") {
      return json({ success: false, message: "POST만 가능합니다." }, 405);
    }

    if (path.endsWith("/ocr/analyze")) {
      return await analyzeOcr(req);
    }

    if (path.endsWith("/medicine-records")) {
      return await saveMedicineRecord(req);
    }

    return json({ success: false, message: "존재하지 않는 API입니다." }, 404);
  } catch (error) {
    return json(
      {
        success: false,
        message: "서버 오류가 발생했습니다.",
        error: String(error),
      },
      500
    );
  }
});

async function analyzeOcr(req: Request): Promise<Response> {
  const body = await req.json();

  const { imageUrl, imageBase64 } = body;

  if (!imageUrl && !imageBase64) {
    return json(
      {
        success: false,
        message: "imageUrl 또는 imageBase64가 필요합니다.",
      },
      400
    );
  }

  const clovaUrl = Deno.env.get("CLOVA_OCR_URL");
  const clovaSecret = Deno.env.get("CLOVA_OCR_SECRET");

  if (!clovaUrl || !clovaSecret) {
    return json(
      {
        success: false,
        message: "CLOVA OCR 환경변수가 설정되지 않았습니다.",
      },
      500
    );
  }

  const clovaBody = {
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [
      imageUrl
        ? {
            format: "jpg",
            name: "medicine-image",
            url: imageUrl,
          }
        : {
            format: "jpg",
            name: "medicine-image",
            data: imageBase64,
          },
    ],
  };

  const ocrResponse = await fetch(clovaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OCR-SECRET": clovaSecret,
    },
    body: JSON.stringify(clovaBody),
  });

  const ocrResult = await ocrResponse.json();

  if (!ocrResponse.ok) {
    return json(
      {
        success: false,
        message: "OCR 분석 실패",
        error: ocrResult,
      },
      500
    );
  }

  const textList =
    ocrResult.images?.[0]?.fields?.map((field: any) => field.inferText) ?? [];

  return json({
    success: true,
    message: "OCR 분석 성공",
    data: {
      texts: textList,
      raw: ocrResult,
    },
  });
}

async function saveMedicineRecord(req: Request): Promise<Response> {
  const body = await req.json();

  const {
    userId,
    imagePath,
    medicineNames,
    durationDays,
    completedDate,
    medicineCount,
  } = body;

  if (!userId) {
    return json({ success: false, message: "userId가 필요합니다." }, 400);
  }

  if (!medicineNames || !Array.isArray(medicineNames)) {
    return json(
      { success: false, message: "medicineNames 배열이 필요합니다." },
      400
    );
  }

  const { data, error } = await supabase
  .from("medicine_records")
  .insert({
  profile_id: userId,
  image_path: imagePath,
  ocr_name: medicineNames[0],
  official_name: medicineNames[0],
  duration_days: durationDays,
  completed_date: completedDate,
  medicine_count: medicineCount,
  })
  .select()
  .single();

  if (error) {
    return json(
      {
        success: false,
        message: "약 데이터 저장 실패",
        error: error.message,
      },
      500
    );
  }

  return json({
    success: true,
    message: "약 데이터 저장 완료",
    data,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}