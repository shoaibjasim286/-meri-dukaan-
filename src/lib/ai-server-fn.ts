import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { checkRateLimit } from "./rate-limit";

interface AskAIInput {
  question: string;
  shopData: {
    products: Array<{ name: string; stock: number; price: number }>;
    recentSales: Array<{ date: string; total: number; mode: string }>;
    salesRecordCount?: number;
    topSellingProducts?: Array<{
      name: string;
      quantitySold: number;
      revenue: number;
      billCount: number;
    }>;
    customers: Array<{ name: string; balance: number }>;
    lowStock: Array<{ name: string; stock: number }>;
    todaySales: number;
    todayProfit: number;
    totalUdhaar: number;
  };
}

export const askAI = createServerFn({ method: "POST" })
  .validator((input: AskAIInput) => {
    if (typeof input.question !== "string") {
      throw new Error("Sawal valid nahi");
    }
    if (input.question.length === 0 || input.question.length > 500) {
      throw new Error("Sawal 1-500 characters ka hona chahiye");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("AI abhi configure nahi hua. Admin se rabta karein.");
    }

    const request = getRequest();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { allowed } = checkRateLimit(ip, 10, 60000);
    if (!allowed) {
      throw new Error("Bahut zyada requests. 1 minute baad try karein.");
    }

    const systemPrompt = `Tum "Meri Dukaan" app ke AI assistant ho.

User Pakistani dukaan-daar hai. Short, helpful jawab do Roman Urdu mein.

USER KE DUKAAN KA DATA:

Products (${data.shopData.products.length} total):
${JSON.stringify(data.shopData.products.slice(0, 30))}

Recent Sales (${data.shopData.recentSales.length}):
${JSON.stringify(data.shopData.recentSales.slice(0, 20))}

TOTAL RECORDED SALES BILLS: ${data.shopData.salesRecordCount ?? data.shopData.recentSales.length}

TOP SELLING PRODUCTS — ALL RECORDED SALES, RANKED BY NET QUANTITY SOLD:
${JSON.stringify(data.shopData.topSellingProducts ?? [])}

Customers (${data.shopData.customers.length}):
${JSON.stringify(data.shopData.customers.slice(0, 30))}

Low Stock Items:
${JSON.stringify(data.shopData.lowStock)}

Aaj ka data:
- Bikri: Rs ${data.shopData.todaySales}
- Munafa: Rs ${data.shopData.todayProfit}
- Udhaar: Rs ${data.shopData.totalUdhaar}

RULES:
- Har jawab user ke bheje hue dukaan data par based ho; apni taraf se numbers ya products mat banana.
- Numbers accurately batao.
- Agar sawal sab se zyada bikne wale samaan ka ho, to TOP SELLING PRODUCTS list use karo; inventory stock ya sirf recent sales se andaza mat lagao.
- TOP SELLING PRODUCTS mein data ho to "data available nahi" kabhi mat kehna; highest quantitySold wala item, quantity, sales value aur billCount batao.
- Agar TOP SELLING PRODUCTS list khaali ho, to saaf batao ke bheje gaye sales records mein item-wise bikri ka data nahi mila; unavailable ko zero sales keh kar confuse mat karo.
- "ALL RECORDED SALES" wali list ko all-time samjho; "aaj", "7 din" ya "30 din" poocha jaye aur period-wise item data na bheja gaya ho to is limitation ko saaf batao.
- Inventory mein maujood hona bikne ka saboot nahi hai.
- Urdu/Roman Urdu mein jawab do.
- Max 3-4 lines ka jawab.`;

    const model = "openai/gpt-oss-120b";
    console.log(`[AI] Trying model: ${model}`);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.question },
          ],
          temperature: 0.7,
          max_tokens: 300,
          top_p: 0.9,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      if (response.status === 404) console.warn(`[AI] Model ${model} not found (404)`);
      console.error("[AI] All models failed", [{ model, status: response.status, error: errorText }]);

      if (response.status === 429) {
        throw new Error("Bahut zyada sawal. 1 minute baad try karein.");
      }
      if (response.status === 401) {
        throw new Error("AI configuration mein masla hai.");
      }
      throw new Error("AI response nahi de saka. Dobara try karein.");
    }

    console.log(`[AI] Success with ${model}`);

    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content;

    if (!answer || typeof answer !== "string") {
      throw new Error("AI ne khali jawab diya");
    }

    return { answer };
  });
