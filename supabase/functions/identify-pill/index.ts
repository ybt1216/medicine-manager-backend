import { corsHeaders } from "./cors.ts"
import { ocrService } from "./ocrService.ts"
import { pillService } from "./pillService.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      },
    )
  }

  try {
    const body = await req.json()
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : ""
    const color = typeof body.color === "string" ? body.color : ""
    const shape = typeof body.shape === "string" ? body.shape : ""

    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing imageBase64 payload.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      )
    }

    let ocrText = ""
    try {
      ocrText = await ocrService.extractOcrText(imageBase64)
    } catch (error) {
      console.error("OCR extraction failed:", error)
      ocrText = ""
    }

    const matchedPills = await pillService.findMatchingPills(
      ocrText,
      color,
      shape,
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: matchedPills,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Server error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})
