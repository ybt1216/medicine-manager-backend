export const ocrService = {
  async extractOcrText(imageBase64: string): Promise<string> {
    const clovaOcrUrl = Deno.env.get("CLOVA_OCR_URL") ?? ""
    const clovaOcrSecret = Deno.env.get("CLOVA_OCR_SECRET") ?? ""

    if (!clovaOcrUrl || !clovaOcrSecret) {
      throw new Error("CLOVA_OCR_URL or CLOVA_OCR_SECRET is not configured")
    }

    const rawBase64 = imageBase64
      .replace(/^data:image\/[a-zA-Z]+;base64,/, "")
      .trim()

    if (!rawBase64) {
      return ""
    }

    const payload = {
      images: [
        {
          format: "jpg",
          name: "pill_image",
          data: rawBase64,
        },
      ],
      lang: "ko",
      requestId: `request-${Date.now()}`,
      timestamp: Date.now(),
      version: "V2",
    }

    const response = await fetch(clovaOcrUrl, {
      method: "POST",
      headers: {
        "X-OCR-SECRET": clovaOcrSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`CLOVA OCR request failed with status ${response.status}`)
    }

    const result = await response.json()
    const fields = result?.images?.[0]?.fields

    if (!Array.isArray(fields)) {
      return ""
    }

    return fields
      // 💡 field.inferText 대신 field["inferText"] 를 사용하여 TS 에러를 원천 차단합니다.
      .map((field: Record<string, unknown>) => String(field["inferText"] ?? "").trim())
      .filter((text) => text.length > 0)
      .join(" ")
      .trim()
  },
}