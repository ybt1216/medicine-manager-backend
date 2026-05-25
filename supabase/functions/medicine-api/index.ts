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
    const path = new URL(req.url).pathname;

    if (req.method !== "POST") {
      return json({ message: "POST만 가능합니다." }, 405);
    }

    if (path.endsWith("/ocr/analyze")) {
      return await analyzeOcr(req);
    }

    if (path.endsWith("/medicine-info")) {
      return await getMedicineInfo(req);
    }

    if (path.endsWith("/medicine-records")) {
      return await saveMedicineRecord(req);
    }

    return json({ message: "존재하지 않는 API입니다." }, 404);
  } catch (error) {
    return json(
      {
        message: "서버 오류가 발생했습니다.",
        error: String(error),
      },
      500
    );
  }
});

async function analyzeOcr(req: Request): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return json({ message: "image 이미지가 필요합니다." }, 400);
  }

  const clovaUrl = Deno.env.get("CLOVA_OCR_URL");
  const clovaSecret = Deno.env.get("CLOVA_OCR_SECRET");

  if (!clovaUrl || !clovaSecret) {
    return json({ message: "CLOVA OCR 환경변수가 없습니다." }, 500);
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
    medicineNames,
  });
}

async function getMedicineInfo(req: Request): Promise<Response> {
  const body = await req.json();
  const { medicineNames } = body;

  if (!medicineNames || !Array.isArray(medicineNames)) {
    return json({ message: "medicineNames 배열이 필요합니다." }, 400);
  }

  const medicines = await Promise.all(
  medicineNames.map(async (medicineName: string) => {

    const drugInfo = await searchEasyDrug(medicineName);

    const officialName =
      drugInfo?.officialName ?? medicineName;

    return {
      type: detectMedicineType(officialName),
      symptoms: officialName,
      extraInfo: drugInfo?.effect ?? "",
      warningInfo: drugInfo?.caution ?? "",
      expirationDate: "",
    };
  })
);

  return json({
    medicines,
  });
}

async function saveMedicineRecord(req: Request): Promise<Response> {
  const body = await req.json();

  const { profileId, userId, imagePath, medicines } = body;

  const profile_id = profileId ?? userId;

  if (!profile_id) {
    return json({ message: "profileId가 필요합니다." }, 400);
  }

  if (!medicines || !Array.isArray(medicines)) {
    return json({ message: "medicines 배열이 필요합니다." }, 400);
  }

  const rows = medicines.map((medicine: any) => ({
    profile_id,
    image_path: imagePath ?? null,
    medicine_name: medicine.symptoms ?? null,
    effect: medicine.extraInfo ?? null,
    caution: medicine.warningInfo ?? null,
    expiration_date: medicine.expirationDate || null,
  }));

  const { data, error } = await supabase
    .from("medicine_record")
    .insert(rows)
    .select();

  if (error) {
    return json(
      {
        message: "약 데이터 저장 실패",
        error: error.message,
      },
      500
    );
  }

  return json({
    message: "약 데이터 저장 완료",
    data,
  });
}

function extractMedicineNames(textList: string[]): string[] {
  const result: string[] = [];

  const bannedWords = [
    "정보", "환자", "병원", "약품명", "약품사진", "복약안내",
    "주의", "주의사항", "보관", "용기", "실온",
    "위원회", "협회", "공정거래", "소비자중심",
    "일반의약품", "효과빠른", "하루", "간편", "복용",
    "알레르기", "코염", "결막염", "두드러기", "가려움",
    "필름코팅정", "원형", "장방형", "흰색", "분홍색", "연녹색",
    "구충제", "후의병", "병", "용"
  ];

  const cleaned = textList
    .map((text) =>
      text
        .trim()
        .replace(/^[-·•*.\s]+/, "")
        .replace(/[()[\]{}]/g, "")
        .replace("®", "")
        .trim()
    )
    .filter(Boolean);

  for (let i = 0; i < cleaned.length; i++) {
    const word = cleaned[i];

    if (!word) continue;
    if (bannedWords.some((b) => word.includes(b))) continue;
    if (/^\d/.test(word)) continue;

    if (isMedicineName(word)) {
      result.push(word);
    }

    if (cleaned[i + 1] === "정") {
      const combined = word + "정";

      if (isMedicineName(combined)) {
        result.push(combined);
      }
    }
  }

  return normalizeMedicineNames(result);
}

function isMedicineName(name: string): boolean {
  if (!name) return false;

  const bannedWords = [
    "정보", "환자", "병원", "약품명", "약품사진", "복약안내",
    "주의", "보관", "용기", "실온", "위원회", "협회",
    "공정거래", "소비자중심", "일반의약품",
    "효과빠른", "하루", "간편", "복용",
    "알레르기", "코염", "결막염", "두드러기", "가려움",
    "필름코팅정", "원형", "장방형", "흰색", "분홍색", "연녹색",
    "구충제", "후의병", "병"
  ];

  if (bannedWords.some((b) => name.includes(b))) return false;
  if (/^\d/.test(name)) return false;
  if (name.length < 3) return false;

  return (
    /^[가-힣A-Za-z0-9-]+정[0-9]*(mg|MG|밀리그램)?$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+캡슐$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+연질캡슐$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+경질캡슐$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+시럽$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+산$/.test(name) ||
    /^[가-힣A-Za-z0-9-]+과립$/.test(name)
  );
}

function normalizeMedicineNames(names: string[]): string[] {
  const unique = Array.from(new Set(names));

  return unique.filter((name) => {
    if (
      name === "캡슐" ||
      name === "연질캡슐" ||
      name === "경질캡슐"
    ) {
      return false;
    }

    return !unique.some((other) => {
      if (name === other) return false;
      return name.includes(other) && other.length >= 3;
    });
  });
}

//글자보정
function correctOcrMedicineName(name: string): string {
  const correctionMap: Record<string, string> = {
    "펙수클루정4Omg": "펙수클루정40mg",
    "펙수클루정40rng": "펙수클루정40mg",
  };

  return correctionMap[name] ?? name;
}

async function searchEasyDrug(medicineName: string) {
  const serviceKey = Deno.env.get("DRUG_API_SERVICE_KEY");

  if (!serviceKey) {
    return null;
  }

  const normalizedName = medicineName
    .replaceAll("mg", "밀리그램")
    .replaceAll("MG", "밀리그램")
    .replaceAll("밀리그람", "밀리그램")
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
  if (effect.includes("염증") || effect.includes("통증")) return "염증·통증 완화";
  if (effect.includes("발열") || effect.includes("해열")) return "해열·진통";

  return effect.length > 40 ? effect.slice(0, 40) + "..." : effect;
}

function summarizeCaution(caution: string | null): string | null {
  if (!caution) return null;

  const result: string[] = [];

  if (caution.includes("위장출혈")) result.push("위장출혈 주의");
  if (caution.includes("임부")) result.push("임부 복용 주의");
  if (caution.includes("수유")) result.push("수유 중 복용 주의");
  if (caution.includes("운전")) result.push("운전 주의");
  if (caution.includes("알코올")) result.push("음주 주의");
  if (caution.includes("천식")) result.push("천식 환자 주의");

  return result.length > 0 ? result.join(", ") : "복용 전 주의사항 확인";
}

function detectMedicineType(
  name: string
): "pill" | "powder" | "bottle" {

  if (!name) return "pill";

  // 액상약
  if (
    name.includes("시럽") ||
    name.includes("현탁액") ||
    name.includes("액")
  ) {
    return "bottle";
  }

  // 알약 우선
  if (
    name.includes("정") ||
    name.includes("캡슐") ||
    name.includes("필름코팅정") ||
    name.includes("서방정")
  ) {
    return "pill";
  }

  // 가루약
  if (
    name.includes("산") ||
    name.includes("과립") ||
    name.includes("세립")
  ) {
    return "powder";
  }

  return "pill";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}