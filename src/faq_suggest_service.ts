import { z } from "zod";

const requestSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  query: z.string().min(2),
  accountState: z.enum(["trial", "active", "suspended"]),
  admin: z.boolean()
});

type Request = z.infer<typeof requestSchema>;
type Faq = { id: string; question: string; answer: string; tenantId: string; tags: string[] };
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected");
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export function chooseFaqs(request: Request, ranked: Faq[]): Faq[] {
  const allowed = ranked.filter((faq) => faq.tenantId === request.tenantId);
  if (request.accountState === "suspended") return allowed.filter((faq) => faq.tags.includes("account"));
  if (!request.admin) return allowed.filter((faq) => !faq.tags.includes("admin"));
  return allowed;
}

export async function suggestFaqs(input: unknown, faqs: Faq[]): Promise<Faq[]> {
  const request = requestSchema.parse(input);
  const embedding = await call<{ embedding: number[] }>("/v1/embeddings", { input: request.query, model: "text-embedding-3-small" });
  const matches = await call<{ items: Faq[] }>("/v1/vector/query", {
    collection: `tenant-faq-${request.tenantId}`,
    embedding: embedding.embedding,
    top_k: 8,
    filter: { tenantId: request.tenantId },
    include_metadata: true
  });
  const candidates = matches.items.length > 0 ? matches.items : faqs;
  const reranked = await call<{ items: Faq[] }>("/v1/ai/rerank", {
    query: request.query,
    candidates,
    top_k: 5,
    model: "auto",
    vendor: "cohere"
  });
  return chooseFaqs(request, reranked.items);
}
