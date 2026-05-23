import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1. 프론트엔드에서 보낸 각인, 색상, 모양 데이터 받기
  const { ocrText, color, shape } = await req.json()

  // 2. 수파베이스 클라우드에 저장해둔 공공데이터포털 서비스키 가져오기
  const serviceKey = Deno.env.get('DATA_GO_KR_SERVICE_KEY')

  // 3. 식약처 의약품 낱알식별정보 Open API URL 빌드
  const baseUrl = 'http://apis.data.go.kr/1471000/MdcinGrnIdntInfoService01/getMdcinGrnIdntInfoList01'
  const url = new URL(baseUrl)

  url.searchParams.append('serviceKey', serviceKey ?? '')
  url.searchParams.append('_type', 'json') // JSON 형식으로 결과 받기
  url.searchParams.append('numOfRows', '10') // 최대 10개까지만 검색

  // 프론트에서 값이 넘어온 경우에만 파라미터에 추가 (파라미터명은 식약처 표준 규격 코드)
  if (ocrText) url.searchParams.append('print_front', ocrText) // 알약 앞면 각인
  if (color) url.searchParams.append('color_class1', color)   // 알약 색상
  if (shape) url.searchParams.append('drug_shape', shape)     // 알약 모양

  try {
    // 4. 식약처 공공 API 호출
    const response = await fetch(url.toString())
    const result = await response.json()

    // 식약처 API의 특이한 결과 구조 파싱 (body.items 안에 데이터가 들어있음)
    const items = result.body?.items || []

    // 5. 정제된 알약 후보 리스트를 프론트엔드로 반환
    return new Response(JSON.stringify({
      success: true,
      data: items
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})