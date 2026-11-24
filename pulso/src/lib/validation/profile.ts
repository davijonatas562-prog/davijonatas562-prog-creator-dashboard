import { z } from "zod";

export const UF = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"] as const;

const termList = z.array(z.string().trim().min(2, "Termos precisam de ao menos 2 letras.").max(120)).max(40, "No máximo 40 termos por grupo.");

export const profileSchema = z.object({
  id: z.string().uuid().nullable(),
  fullName: z.string().trim().min(3, "Informe o nome completo.").max(160),
  publicName: z.string().trim().min(2, "Informe o nome público.").max(160),
  nicknames: z.array(z.string().trim().min(2).max(60)).max(15),
  office: z.string().trim().min(2, "Informe o cargo.").max(80),
  municipality: z.string().trim().max(120),
  state: z.union([z.enum(UF), z.literal("")]),
  party: z.string().trim().max(40),
  photoPath: z.string().max(300).nullable(),
  primary: termList.min(1, "Inclua ao menos um termo principal."),
  related: termList,
  context: termList,
  exclude: termList,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const manualMentionSchema = z.object({
  profileId: z.string().min(1),
  sourceId: z.enum(["instagram","facebook","x","tiktok","youtube","threads","google_news","news_sites","blogs","reddit","other"]),
  contentType: z.enum(["post","comment","video","article","reply","other"]),
  content: z.string().trim().min(5, "Cole o texto da publicação (mín. 5 caracteres).").max(5000),
  url: z.union([z.literal(""), z.string().trim().url("Link inválido.").regex(/^https?:\/\//, "Use um link http(s).")]),
  author: z.string().trim().max(120),
  publishedAt: z.string().min(1, "Informe a data."),
});

export type ManualMentionInput = z.infer<typeof manualMentionSchema>;
