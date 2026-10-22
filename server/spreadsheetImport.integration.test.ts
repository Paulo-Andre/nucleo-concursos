import { and, eq, inArray, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines, questionChangelog, questionContentLinks, questions, reviewQueue } from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import { importSpreadsheet } from "./spreadsheetImport";

describe("importação Excel/CSV na biblioteca ROOT",()=>{
 it("valida arquivo inteiro, faz rollback lógico e importa aulas e questões vinculadas",async()=>{
  const db=await getDb();const root=await getUserByUsername("paulo");
  expect(db).toBeTruthy();expect(root?.role).toBe("admin");
  if(!db||!root)return;
  const token="csv-qa-"+crypto.randomUUID().slice(0,8);
  const ids={contents:[] as number[],questions:[] as number[]};
  let disciplineId=0;
  try{
   const d=await db.insert(disciplines).values({name:token,shortName:token.slice(0,20),status:"published",createdByUserId:root.id,updatedByUserId:root.id});
   disciplineId=Number(d[0].insertId);
   const contentName=token+" texto";
   const row=`titulo;disciplina_ids;status;video_url;material_url\n${contentName};${disciplineId};draft;https://exemplo.invalid/video;https://exemplo.invalid/apostila.pdf\n`;
   const data={kind:"contents" as const,fileName:"conteudos.csv",base64:Buffer.from(row).toString("base64")};
   const valid=await importSpreadsheet(root.id,data,0,true);
   expect(valid).toMatchObject({valid:true,count:1,created:0});
   // A antiga restrição de 250 linhas impedia importar aulas de várias disciplinas.
   const largerCsv = [
     "titulo;disciplina_ids;status",
     ...Array.from({ length: 251 }, (_, index) => `${token} aula expandida ${index + 1};${disciplineId};draft`),
   ].join("\n") + "\n";
   const largerData = { kind: "contents" as const, fileName: "251-aulas.csv", base64: Buffer.from(largerCsv).toString("base64") };
   const largerPreview = await importSpreadsheet(root.id, largerData, 0, true);
   expect(largerPreview).toMatchObject({ valid: true, count: 251, created: 0, errors: [] });
   expect(largerPreview.preview).toHaveLength(30);
   expect((await db.select().from(contents).where(like(contents.title, `${token} aula expandida %`))).length).toBe(0);

   const broken=`titulo;disciplina_ids;status\n${token} válido;${disciplineId};draft\n${token} inválido;999999999;draft\n`;
   const brokenData={kind:"contents" as const,fileName:"conteudos.csv",base64:Buffer.from(broken).toString("base64")};
   const rejected=await importSpreadsheet(root.id,brokenData,2,false);
   expect(rejected).toMatchObject({valid:false,created:0});
   expect((await db.select().from(contents).where(like(contents.title,`%${token}%`))).length).toBe(0);
   const committed=await importSpreadsheet(root.id,data,1,false);
   expect(committed.created).toBe(1);
   const found=(await db.select().from(contents).where(eq(contents.title,contentName)))[0];
   expect(found).toMatchObject({status:"draft",videoUrl:"https://exemplo.invalid/video"});
   ids.contents.push(found.id);
   expect((await db.select().from(disciplineContents).where(eq(disciplineContents.contentId,found.id))).length).toBe(1);
   expect((await importSpreadsheet(root.id,data,0,true)).valid).toBe(false);

   const qData={kind:"questions" as const,fileName:"questoes.csv",base64:Buffer.from(`enunciado;tipo;resposta;conteudo_ids;status;comentario\nEnunciado de simulado ${token} sobre lei;certo_errado;CERTO;${found.id};draft;Explicação de teste.\n`).toString("base64")};
   expect((await importSpreadsheet(root.id,qData,0,true)).valid).toBe(true);
   expect((await importSpreadsheet(root.id,qData,1,false)).created).toBe(1);
   const q=(await db.select().from(questions).where(like(questions.statement,`%${token}%`)))[0];
   ids.questions.push(q.id);
   expect(q.answerJson).toBe("true");
   expect((await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId,q.id))).map(item=>item.contentId)).toEqual([found.id]);
  }finally{
   if(ids.questions.length){
    await db.delete(questionContentLinks).where(inArray(questionContentLinks.questionId,ids.questions));
    await db.delete(questionChangelog).where(inArray(questionChangelog.questionId,ids.questions));
    await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"question"),inArray(reviewQueue.itemId,ids.questions)));
    await db.delete(questions).where(inArray(questions.id,ids.questions));
   }
   if(ids.contents.length){
    await db.delete(disciplineContents).where(inArray(disciplineContents.contentId,ids.contents));
    await db.delete(contentChangelog).where(inArray(contentChangelog.contentId,ids.contents));
    await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"content"),inArray(reviewQueue.itemId,ids.contents)));
    await db.delete(contents).where(inArray(contents.id,ids.contents));
   }
   if(disciplineId)await db.delete(disciplines).where(eq(disciplines.id,disciplineId));
   await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId,root.id),eq(adminAuditLogs.action,"IMPORTACAO_EM_LOTE")));
  }
 },30000);
});
