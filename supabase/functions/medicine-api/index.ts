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

    if (path.endsWith("/medicine-info")) {
      return await getMedicineInfo(req);
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
  const formData = await req.formData();

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return json(
      {
        success: false,
        message: "file 이미지가 필요합니다.",
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

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const imageBase64 = btoa(binary);

  const fileName = file.name || "medicine-image.jpg";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";

  const format = extension === "jpeg" ? "jpg" : extension;

  const clovaBody = {
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format,
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

  const medicineNames = extractMedicineNames(textList);

  return json({
    success: true,
    message: "OCR 분석 성공",
    data: {
      medicineNames,
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
  .from("medicine_record")
  .insert({
    profile_id: userId,
    image_path: imagePath,
    ocr_name: medicineNames?.[0],
    official_name: medicineNames?.[0],
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

function extractMedicineNames(textList: string[]): string[] {

  const result: string[] = [];

  for (const text of textList) {

    const name = text.trim();

    if (!name) continue;

    const looksLikeMedicine =
      name.includes("정") ||
      name.includes("캡슐") ||
      name.includes("시럽") ||
      name.includes("mg");

    if (!looksLikeMedicine) continue;

    if (name.includes("1정씩")) continue;
    if (name.includes("일분")) continue;
    if (name.includes("주의")) continue;
    if (name.includes("보관")) continue;
    if (name.includes("필름코팅정")) continue;
    if (name.includes("정제")) continue;

    if (!result.includes(name)) {
      result.push(name);
    }
  }

  return result;
}

async function getMedicineInfo(req: Request): Promise<Response> {

  const body = await req.json();

  const { medicineNames } = body;

  if (!medicineNames || !Array.isArray(medicineNames)) {
    return json(
      {
        success: false,
        message: "medicineNames 배열이 필요합니다.",
      },
      400
    );
  }

  const medicines = await Promise.all(
    medicineNames.map(async (medicineName: string) => {

      const drugInfo = await searchEasyDrug(medicineName);

      return {
        medicineName,
        officialName: drugInfo?.officialName ?? null,
        effect: drugInfo?.effect ?? null,
        caution: drugInfo?.caution ?? null,
      };
    })
  );

  return json({
    success: true,
    message: "약 정보 조회 성공",
    data: {
      medicines,
    },
  });
}

async function searchEasyDrug(medicineName: string) {

  const serviceKey = Deno.env.get("DRUG_API_SERVICE_KEY");

  if (!serviceKey) {
    return null;
  }

  const normalizedName = medicineName
    .replaceAll("mg", "밀리그램")
    .replaceAll("MG", "밀리그램")
    .replaceAll(" ", "");

  const url =
    "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList" +
    `?serviceKey=${serviceKey}` +
    `&type=json` +
    `&itemName=${encodeURIComponent(normalizedName)}` +
    `&numOfRows=1` +
    `&pageNo=1`;

  const response = await fetch(url);

  const result = await response.json();

  const item = result?.body?.items?.[0];

  if (!item) {
    return null;
  }

  return {
    officialName: item.itemName ?? null,
    effect: summarizeEffect(item.efcyQesitm),
    caution: summarizeCaution(item.atpnQesitm),
  };
}

function summarizeEffect(effect: string | null): string | null {

  if (!effect) return null;

  if (effect.includes("위산")) return "위산 억제";
  if (effect.includes("염증")) return "염증·통증 완화";
  if (effect.includes("해열")) return "해열·진통";

  return effect.length > 40
    ? effect.slice(0, 40) + "..."
    : effect;
}

function summarizeCaution(caution: string | null): string | null {

  if (!caution) return null;

  const result: string[] = [];

  if (caution.includes("위장출혈")) {
    result.push("위장출혈 주의");
  }

  if (caution.includes("임부")) {
    result.push("임부 복용 주의");
  }

  if (caution.includes("운전")) {
    result.push("운전 주의");
  }

  if (caution.includes("알코올")) {
    result.push("음주 주의");
  }

  return result.join(", ");
}



function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}