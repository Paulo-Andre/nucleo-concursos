import { and, eq, inArray, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
 adminAuditLogs, contents, disciplineContents, disciplines, questionChangelog,
 questionContentLinks, questions,
} from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import { importSpreadsheet } from "./spreadsheetImport";

describe("reaproveitamento de questão com enunciado já cadastrado", () => {
 it("preserva a questão existente e cria apenas o vínculo com a disciplina", async () => {
  const db=await getDb();const user=await getUserByUsername("paulo");
  expect(db).toBeTruthy();expect(user?.role).toBe("admin");
  if(!db||!user)return;
  const token="link-questao-"+crypto.randomUUID().slice(0,8);
  let disciplineId=0,contentId=0,questionId=0;
  try{
   const d=await db.insert(disciplines).values({
    name:token,shortName:token.slice(0,20),status:"published",
    createdByUserId:user.id,updatedByUserId:user.id,
   });
   disciplineId=Number(d[0].insertId);
   const c=await db.insert(contents).values({
    title:token+" aula",status:"published",createdByUserId:user.id,updatedByUserId:user.id,
   });
   contentId=Number(c[0].insertId);
   await db.insert(disciplineContents).values({disciplineId,contentId,linkedByUserId:user.id});
   const statement="Questão previamente cadastrada e ainda não vinculada a "+token;
   const q=await db.insert(questions).values({
    statement,questionType:"certo_errado",passage:null,answerJson:"true",
    status:"published",createdByUserId:user.id,updatedByUserId:user.id,
   });
   questionId=Number(q[0].insertId);
   const csv=["enunciado;tipo;resposta;conteudo_ids;status",
    statement+";certo_errado;CERTO;"+contentId+";published"].join("\n")+"\n";
   const request={kind:"questions" as const,fileName:"questoes.csv",base64:Buffer.from(csv).toString("base64"),
     fallbackDisciplineId:disciplineId,questionDuplicateMode:"link" as const};
   const blocked=await importSpreadsheet(user.id,{...request,questionDuplicateMode:"reject"},0,true);
   expect(blocked.valid).toBe(false);
   expect(blocked.errors).toContain("Linha 2: Registro duplicado no banco. Escolha 'Reutilizar questões existentes' para conferir e vincular sem duplicar.");
   const preview=await importSpreadsheet(user.id,request,0,true);
   expect(preview).toMatchObject({valid:true,toCreate:0,toUpdate:0,toLink:1});
   expect(preview.preview[0]).toMatchObject({action:"link",existingId:questionId});
   const linked=await importSpreadsheet(user.id,request,1,false,"create",0,1);
   expect(linked).toMatchObject({valid:true,created:0,toLink:1,linked:1});
   expect((await db.select().from(questions).where(eq(questions.id,questionId)))[0])
     .toMatchObject({id:questionId,statement,status:"published",answerJson:"true"});
   expect((await db.select().from(questionContentLinks)
     .where(eq(questionContentLinks.questionId,questionId))).map(item=>item.contentId)).toEqual([contentId]);
   const again=await importSpreadsheet(user.id,request,1,false,"create",0,1);
   expect(again).toMatchObject({created:0,linked:0,toLink:1});
   expect(await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId,questionId)))
     .toHaveLength(1);
   const wrong=Buffer.from(csv.replace(";CERTO;",";ERRADO;")).toString("base64");
   const refused=await importSpreadsheet(user.id,{...request,base64:wrong},0,true);
   expect(refused.valid).toBe(false);
   expect(refused.errors.join(" ")).toMatch(/gabarito são diferentes/);
  } finally {
   if(questionId){
    await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId,questionId));
    await db.delete(questionChangelog).where(eq(questionChangelog.questionId,questionId));
    await db.delete(questions).where(eq(questions.id,questionId));
   }
   if(contentId){
    await db.delete(disciplineContents).where(eq(disciplineContents.contentId,contentId));
    await db.delete(contents).where(eq(contents.id,contentId));
   }
   if(disciplineId)await db.delete(disciplines).where(eq(disciplines.id,disciplineId));
   // Apenas registros desta execução: auditoria não é removida.
  }
 },30000);
});
