import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const limit = Number(url.searchParams.get("limit") ?? 10);

    if (!lat || !lng) {
      return json({
        success: false,
        message: "lat, lng가 필요합니다.",
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("disposal_bins")
      .select("*");

    if (error) throw error;

    const nearby = data
      .map((bin) => ({
        id: bin.id,
        binName: bin.bin_name,
        address: bin.address,
        latitude: bin.latitude,
        longitude: bin.longitude,

        distanceKm: calculateDistanceKm(
          lat,
          lng,
          bin.latitude,
          bin.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return json({
      success: true,
      message: "주변 폐의약품 수거함 조회 성공",
      data: nearby,
    });

  } catch (e) {
    return json({
      success: false,
      message: "서버 오류",
      error: String(e),
    }, 500);
  }
});

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(v: number) {
  return v * Math.PI / 180;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}