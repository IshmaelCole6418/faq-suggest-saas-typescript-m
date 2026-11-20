import assert from "node:assert/strict";
import { chooseFaqs } from "../src/faq_suggest_service.ts";

const rows = [
  { id: "a", question: "Resume", answer: "Review checks", tenantId: "acme", tags: ["account"] },
  { id: "b", question: "Invite", answer: "Invite a member", tenantId: "acme", tags: ["admin"] },
  { id: "c", question: "Other tenant", answer: "No", tenantId: "beta", tags: ["account"] }
];

const result = chooseFaqs({ tenantId: "acme", userId: "u", query: "suspended", accountState: "suspended", admin: false }, rows);
assert.deepEqual(result.map((item) => item.id), ["a"]);
console.log("suspended users receive account guidance for their tenant");
