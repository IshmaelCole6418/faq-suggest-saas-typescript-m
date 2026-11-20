import { suggestFaqs } from "./faq_suggest_service.ts";

const faq = [
  { id: "invite-admin", question: "How do I invite an administrator?", answer: "Open Settings, then Members, then Invite.", tenantId: "acme", tags: ["admin"] },
  { id: "resume-account", question: "How can I resume a suspended account?", answer: "An administrator can review the billing and security checks.", tenantId: "acme", tags: ["account"] },
  { id: "start-trial", question: "How does tenant onboarding begin?", answer: "Create the workspace, then invite the first member.", tenantId: "acme", tags: ["onboarding"] }
];

const input = { tenantId: "acme", userId: "u-17", query: "my account is suspended", accountState: "suspended", admin: false } as const;
console.log(await suggestFaqs(input, faq));
