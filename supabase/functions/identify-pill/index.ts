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
        medicineNames: [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return new Response(
        JSON.stringify({
          medicineNames: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      )
    }

    const imageBytes = await file.arrayBuffer()
    const color = typeof formData.get("color") === "string" ? String(formData.get("color")) : ""
    const shape = typeof formData.get("shape") === "string" ? String(formData.get("shape")) : ""

    let ocrText = ""
    try {
      ocrText = await ocrService.extractOcrText(imageBytes)
    } catch (error) {
      console.error("OCR extraction failed:", error)
      ocrText = ""
    }

    const matchedPills = await pillService.findMatchingPills(
      ocrText,
      color,
      shape,
    )

    const medicineNames = Array.isArray(matchedPills)
      ? matchedPills
        .map((entry) => String(entry?.ITEM_NAME ?? "").trim())
        .filter((name) => name.length > 0)
      : []

    return new Response(
      JSON.stringify({
        medicineNames,
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
        medicineNames: [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})
