import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. 프론트엔드가 보낸 ID값 가져오기 (POST나 DELETE 요청의 Body 데이터)
  const { id } = await req.json()

  // 2. 수파베이스 내부 DB 내부 연동을 위한 클라이언트 생성
  const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // 3. 자바 JPA 대신 사용하는 수파베이스 DB 삭제 명령어!
  const { data, error } = await supabaseClient
      .from('PillLogItems')
      .delete()
      .eq('id', id)

  // 에러 발생 시 처리
  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    })
  }

  // 4. 프론트엔드에 성공 결과 돌려주기
  return new Response(JSON.stringify({ success: true, message: "삭제 완료!" }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  })
})