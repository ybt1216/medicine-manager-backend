import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. 프론트엔드가 보낸 약 ID, 루틴 여부, 시간대 데이터 받기
  const { id, isRoutine, routineTime } = await req.json()

  const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // 2. DB 업데이트: 프론트가 준 값으로 약의 루틴 상태와 시간대를 바꿈
  const { data, error } = await supabaseClient
      .from('PillLogItems')
      .update({
        is_routine: isRoutine,
        routine_time: isRoutine ? routineTime : null // 루틴 해제 시 시간대도 null 처리
      })
      .eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    })
  }

  // 3. 성공 결과 반환
  return new Response(JSON.stringify({ success: true, message: "루틴 설정 변경 완료" }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  })
})
