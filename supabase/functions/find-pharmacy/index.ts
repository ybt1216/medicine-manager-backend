import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1. 프론트엔드에서 보낸 현재 유저의 위도(latitude)와 경도(longitude) 받기
  const { latitude, longitude } = await req.json()

  // 2. 수파베이스 비밀 금고에 저장해둔 구글 API 키 가져오기
  const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')

  // 3. 구글 플레이스 (가까운 약국 검색) API URL 빌드
  // keyword=pharmacy(약국), radius=2000(반경 2km 이내)
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&keyword=pharmacy&key=${googleApiKey}&language=ko`

  try {
    // 4. 구글 지도 서버 호출
    const response = await fetch(url)
    const result = await response.json()

    // 구글 결과물에서 필요한 약국 리스트 추출
    const pharmacies = result.results || []

    // 5. 프론트엔드가 지도에 핀을 꽂을 수 있게 약국 이름, 주소, 위경도 좌표 반환
    const formattedData = pharmacies.map((p: any) => ({
      name: p.name,
      address: p.vicinity,
      latitude: p.geometry.location.lat,
      longitude: p.geometry.location.lng,
      rating: p.rating || 0
    }))

    return new Response(JSON.stringify({
      success: true,
      data: formattedData
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