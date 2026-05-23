import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 프론트엔드가 보낸 유저 UUID 받기
  const { userId } = await req.json()

  const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // DB 조회: 이 유저의 약이면서 + 지병/루틴 약(is_routine = true)만 필터링!
  const { data: items, error } = await supabaseClient
      .from('PillLogItems')
      .select(`
      id,
      pill_name,
      is_taken,
      routine_time,
      is_routine,
      PillLogs!inner (
        user_id
      )
    `)
      .eq('PillLogs.user_id', userId)
      .eq('is_routine', true) // 💡 기획 내용 반영: 꾸준히 먹는 지병 약만 쏙 골라내기

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    })
  }

  // 프론트엔드가 화면에 아침/점심/저녁 탭별로 바로 뿌릴 수 있게 배열 쪼개기
  const morningList = items.filter(item => item.routine_time === 'morning')
  const lunchList = items.filter(item => item.routine_time === 'lunch')
  const dinnerList = items.filter(item => item.routine_time === 'dinner')

  return new Response(JSON.stringify({
    success: true,
    morning: morningList,
    lunch: lunchList,
    dinner: dinnerList
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  })
})