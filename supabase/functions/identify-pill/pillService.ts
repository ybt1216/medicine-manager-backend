export const pillService = {
  async findMatchingPills(
    ocrText?: string,  // 💡 값이 비어올 수 있으므로 optional 처리
    color?: string,
    shape?: string,
  ): Promise<any[]> {
    const apiKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY") ?? ""
    if (!apiKey) {
      throw new Error("DATA_GO_KR_SERVICE_KEY is not configured")
    }

    const endpoint =
      "http://apis.data.go.kr/1471000/MdcinGrnIdntInfoService01/getMdcinGrnIdntInfoList01"
    const params = new URLSearchParams({
      serviceKey: apiKey,
      _type: "json",
      pageNo: "1",
      numOfRows: "20",
    })

    if (ocrText?.trim()) {
      params.append("print_front", ocrText.trim())
    }

    if (color?.trim()) {
      params.append("color_class1", color.trim())
    }

    if (shape?.trim()) {
      params.append("drug_shape", shape.trim())
    }

    const url = `${endpoint}?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Pill service request failed with status ${response.status}`)
    }

    const result = await response.json()
    
    // 💡 핵심 수정: result 뒤에 반드시 .response 가 들어가야 공공데이터 규격과 일치합니다!
    const item = result?.response?.body?.items?.item
    const normalizedItems = Array.isArray(item) ? item : item ? [item] : []

    return normalizedItems.map((entry: Record<string, any>) => ({
      // 💡 대괄호 표기법 또는 any 매핑을 통해 TS 에러를 방지합니다.
      ITEM_SEQ: entry["ITEM_SEQ"] ?? "",
      ITEM_NAME: entry["ITEM_NAME"] ?? "",
      ENTP_NAME: entry["ENTP_NAME"] ?? "",
      CHART: entry["CHART"] ?? "",
      ITEM_IMAGE: entry["ITEM_IMAGE"] ?? "",
    }))
  },
}