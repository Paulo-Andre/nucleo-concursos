import { and, eq, inArray } from "drizzle-orm";
import { adminAuditLogs, contents, contentChangelog, disciplineContents, disciplines, questions, questionChangelog, questionContentLinks, reviewQueue } from "../drizzle/schema";
import { getDb } from "./db";
import { readSpreadsheet } from "./spreadsheetReader";

export type ImportKind = "contents" | "questions";
type Status = "draft" | "review" | "approved" | "published" | "inactive";
type ContentRow = {
  line:number;title:string;objective:string;description:string;cardText:string;body:string;existingId?:number;
  disciplineIds:number[];status:Status;requiresReview:boolean;noticeKind:null|"new"|"updated";
  coverImageUrl:string;videoUrl:string;videoLabel:string;materialUrl:string;materialLabel:string;
};
type QuestionRow = {
  line:number;statement:string;questionType:"certo_errado"|"multipla_escolha";options:string[];
  answer:boolean|string;explanation:string;difficulty:"basic"|"intermediate"|"advanced";
  source:string;banca:string;year:number|null;contentIds:number[];status:Status;requiresReview:boolean;
};
type Parsed = {kind:ImportKind;errorMessages:string[];data:(ContentRow|QuestionRow)[];toCreate:number;toUpdate:number;preview:{line:number;label:string;status:Status;action:"create"|"update";existingId?:number}[]};
type Input = {kind:ImportKind;fileName:string;base64:string};
const statuses = new Set(["draft","review","approved","published","inactive"]);
const difficulties = new Set(["basic","intermediate","advanced"]);
export const MAX_SPREADSHEET_IMPORT_ROWS = 1000;
const normalize=(s:string)=>s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
const pieces=(s:string)=>s.split(/[|;,]/).map(x=>x.trim()).filter(Boolean);
const list=(s:string)=>s.split(/[|;]/).map(x=>x.trim()).filter(Boolean);
const boolean=(s:string)=>["sim","s","yes","true","1"].includes(normalize(s));
const text=(row:Record<string,string>,key:string,max:number)=>{const value=String(row[key]??"").trim();if(value.length>max)throw new Error(`Campo ${key} excede ${max} caracteres.`);return value;};
function status(raw:string):Status {
 if(!raw)return "draft";
 if(!statuses.has(raw.toLowerCase()))throw new Error("Status inválido: "+raw);
 return raw.toLowerCase() as Status;
}
function httpUrl(raw:string):string {
 if(!raw)return "";
 if(raw.length>2048)throw new Error("URL muito longa.");
 try {
  const url=new URL(raw);
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error();
  return raw;
 }catch{throw new Error("URLs de vídeo, capa e material devem usar http:// ou https://");}
}
function references(ids:string,names:string,byId:Map<number,unknown>,byName:Map<string,number>,type:string):number[] {
 const out = new Set<number>();
 for(const candidate of pieces(ids)) {
  const number=Number(candidate);
  if(!Number.isInteger(number)||number<1||!byId.has(number))throw new Error(`ID de ${type} não encontrado: ${candidate}`);
  out.add(number);
 }
 for(const candidate of list(names)) {
  const id=byName.get(normalize(candidate));
  if(!id)throw new Error(`${type} não encontrado (nome/sigla exata): ${candidate}`);
  out.add(id);
 }
 if(!out.size)throw new Error(`Vincule pelo menos um(a) ${type} por ID ou nome.`);
 return Array.from(out);
}
function readYear(raw:string):number|null {
 if(!raw)return null;
 const n=Number(raw);
 if(!Number.isInteger(n)||n<1900||n>2100)throw new Error("Ano inválido.");
 return n;
}

export async function prepareSpreadsheetImport(input:Input,mode:"create"|"upsert"="create"):Promise<Parsed> {
 if(mode==="upsert"&&input.kind!=="contents")throw new Error("Atualização de registros existentes está disponível somente para conteúdos/aulas.");
 const db=await getDb();if(!db)throw new Error("Banco indisponível.");
 const sheet=readSpreadsheet(input.fileName,input.base64);
 if(sheet.length>MAX_SPREADSHEET_IMPORT_ROWS)throw new Error(`A planilha possui ${sheet.length} registros preenchidos. O máximo é ${MAX_SPREADSHEET_IMPORT_ROWS} por arquivo. Divida em lotes menores.`);
 const [ds,cs,qs]=await Promise.all([
  db.select({id:disciplines.id,name:disciplines.name,shortName:disciplines.shortName}).from(disciplines),
  db.select({id:contents.id,title:contents.title}).from(contents),
  input.kind==="questions"?db.select({statement:questions.statement}).from(questions):Promise.resolve([]),
 ]);
 const dById=new Map(ds.map(x=>[x.id,x]));
 const dByName=new Map(ds.flatMap(x=>[[normalize(x.name),x.id],[normalize(x.shortName),x.id]] as [string,number][]));
 const cById=new Map(cs.map(x=>[x.id,x]));
 const cByName=new Map(cs.map(x=>[normalize(x.title),x.id]));
 const contentMatches=new Map<string,number[]>();
 for(const content of cs){
  const key=normalize(content.title);
  contentMatches.set(key,[...(contentMatches.get(key)||[]),content.id]);
 }
 const existing=new Set(input.kind==="contents"?cs.map(x=>normalize(x.title)):qs.map(x=>normalize(x.statement)));
 const inFile=new Set<string>();
 const parsed:Parsed={kind:input.kind,errorMessages:[],data:[],toCreate:0,toUpdate:0,preview:[]};
 for(const entry of sheet){
  const row=entry.values;
  const label=input.kind==="contents"?row.titulo:row.enunciado;
  if(!label?.trim()){parsed.errorMessages.push(`Linha ${entry.line}: campo obrigatório em branco.`);continue;}
  try {
   let item:ContentRow|QuestionRow;
   if(input.kind==="contents"){
    if(label.length<4||label.length>220)throw new Error("Título deve conter entre 4 e 220 caracteres.");
    const disciplineIds=references(row.disciplina_ids||"",row.disciplinas||"",dById,dByName,"disciplina");
    const rawNotice=normalize(row.aviso||"");
    if(rawNotice&&!["nenhum","novo","atualizado"].includes(rawNotice))throw new Error("Aviso inválido.");
    item={line:entry.line,title:label.trim(),objective:text(row,"objetivo",4000),
     description:text(row,"descricao",4000),cardText:text(row,"resumo_card",1200),
     body:text(row,"corpo",30000),disciplineIds,status:status(row.status||""),
     requiresReview:boolean(row.exigir_revisao||""),
     noticeKind:rawNotice==="novo"?"new":rawNotice==="atualizado"?"updated":null,
     coverImageUrl:httpUrl(row.capa_url||""),videoUrl:httpUrl(row.video_url||""),
     videoLabel:text(row,"video_rotulo",160),materialUrl:httpUrl(row.material_url||""),
     materialLabel:text(row,"material_rotulo",160)};
    for(const [key,value,max] of [["objetivo",item.objective,4000],["descricao",item.description,4000],["resumo_card",item.cardText,1200],["corpo",item.body,30000]] as const){
      if(value.length>max)throw new Error(`Texto no campo ${key} excede ${max} caracteres.`);
    }
   }else{
    if(label.length<12||label.length>20000)throw new Error("Enunciado deve conter entre 12 e 20000 caracteres.");
    const questionType=normalize(row.tipo||"certo_errado");
    if(!["certo_errado","multipla_escolha"].includes(questionType))throw new Error("Tipo deve ser certo_errado ou multipla_escolha.");
    const optionColumns=["a","b","c","d","e"].map(k=>row[`alternativa_${k}`]?.trim()||"");
    const options=optionColumns.filter(Boolean);
    if(optionColumns.some((value,index)=>Boolean(value)&&optionColumns.slice(0,index).some(previous=>!previous)))throw new Error("Preencha as alternativas em ordem, sem pular letras.");
    const letter=normalize(row.resposta||"");
    let answer:boolean|string;
    if(questionType==="certo_errado"){
      if(!["certo","errado","true","false","sim","nao"].includes(letter))throw new Error("Resposta deve ser CERTO ou ERRADO.");
      answer=["certo","true","sim"].includes(letter);
    }else{
      if(options.length<2)throw new Error("Inclua no mínimo 2 alternativas.");
      const index="abcde".indexOf(letter);
      if(index<0||index>=options.length)throw new Error("Resposta deve ser a letra de uma alternativa cadastrada.");
      answer=options[index];
    }
    const diff=normalize(row.dificuldade||"intermediate");
    if(!difficulties.has(diff))throw new Error("Dificuldade inválida.");
    const contentIds=references(row.conteudo_ids||"",row.conteudos||"",cById,cByName,"conteúdo");
    item={line:entry.line,statement:label.trim(),questionType:questionType as QuestionRow["questionType"],
      options,answer,explanation:text(row,"comentario",12000),
      difficulty:diff as QuestionRow["difficulty"],source:text(row,"fonte",240),
      banca:text(row,"banca",120),year:readYear(row.ano||""),contentIds,status:status(row.status||""),
      requiresReview:boolean(row.exigir_revisao||"")};
   }
   const key=normalize(label);
   if(inFile.has(key))throw new Error("Registro duplicado no próprio arquivo.");
   inFile.add(key);
   if(input.kind==="contents"&&mode==="upsert"){
    const matches=contentMatches.get(key)??[];
    if(matches.length>1)throw new Error("Há mais de um conteúdo no banco com este título. Resolva a ambiguidade antes de atualizar.");
    if(matches.length===1)(item as ContentRow).existingId=matches[0];
   }else if(existing.has(key))throw new Error("Registro duplicado no banco.");
   const existingId=input.kind==="contents"?(item as ContentRow).existingId:undefined;
   if(existingId)parsed.toUpdate++;else parsed.toCreate++;
   parsed.data.push(item);
   parsed.preview.push({line:entry.line,label:label.slice(0,140),status:item.status,action:existingId?"update":"create",existingId});
  }catch(error){parsed.errorMessages.push(`Linha ${entry.line}: ${error instanceof Error?error.message:"Dados inválidos"}`);}
 }
 if(!parsed.data.length&&!parsed.errorMessages.length)parsed.errorMessages.push("Nenhuma linha válida encontrada.");
 return parsed;
}

export async function importSpreadsheet(actorUserId:number,input:Input,expectedCount:number,checkOnly:boolean,mode:"create"|"upsert"="create",expectedUpdates?:number) {
 const prepared=await prepareSpreadsheetImport(input,mode);
 if(checkOnly||prepared.errorMessages.length) return {valid:!prepared.errorMessages.length,count:prepared.data.length,errors:prepared.errorMessages,preview:prepared.preview.slice(0,30),toCreate:prepared.toCreate,toUpdate:prepared.toUpdate,created:0,updated:0};
 if(prepared.data.length!==expectedCount||(expectedUpdates!==undefined&&prepared.toUpdate!==expectedUpdates))throw new Error("Os registros mudaram desde a prévia. Revise e confirme novamente.");
 const db=await getDb();if(!db)throw new Error("Banco indisponível.");
 // Todas as criações, relações e logs são uma operação ACID. Uma falha cancela todo o lote.
 await db.transaction(async tx=>{
  for(const row of prepared.data){
   if(prepared.kind==="contents"){
    const r=row as ContentRow;
    if(r.existingId){
     const previous=(await tx.select().from(contents).where(eq(contents.id,r.existingId)).limit(1))[0];
     if(!previous)throw new Error("Aula existente desapareceu durante a importação. Nenhuma alteração será gravada.");
     // Atualizar preservando ID, progresso, vínculos de questões e mídias que não foram fornecidas na planilha.
     await tx.update(contents).set({
      title:r.title,objective:r.objective||previous.objective,description:r.description||previous.description,cardText:r.cardText||previous.cardText,
      body:r.body||previous.body,coverImageUrl:r.coverImageUrl||previous.coverImageUrl,
      videoUrl:r.videoUrl||previous.videoUrl,videoLabel:r.videoLabel||previous.videoLabel,
      materialUrl:r.materialUrl||previous.materialUrl,materialLabel:r.materialLabel||previous.materialLabel,
      noticeKind:r.noticeKind,noticeActivatedAt:r.noticeKind?new Date():null,
      requiresReview:r.requiresReview,status:r.status,updatedByUserId:actorUserId,
     }).where(eq(contents.id,r.existingId));
     const priorLinks=await tx.select().from(disciplineContents).where(eq(disciplineContents.contentId,r.existingId));
     for(const link of priorLinks){
      if(!r.disciplineIds.includes(link.disciplineId))await tx.delete(disciplineContents).where(eq(disciplineContents.id,link.id));
     }
     for(const disciplineId of r.disciplineIds){
      if(!priorLinks.some(link=>link.disciplineId===disciplineId))
       await tx.insert(disciplineContents).values({disciplineId,contentId:r.existingId,linkedByUserId:actorUserId});
     }
     await tx.insert(contentChangelog).values({
      contentId:r.existingId,actorUserId,changedField:"spreadsheet_update",
      oldValue:JSON.stringify({title:previous.title,status:previous.status,disciplineIds:priorLinks.map(link=>link.disciplineId)}),
      newValue:JSON.stringify({title:r.title,status:r.status,disciplineIds:r.disciplineIds}),
     });
     continue;
    }
    const inserted=await tx.insert(contents).values({
      title:r.title,objective:r.objective||null,description:r.description||null,cardText:r.cardText||null,
      body:r.body||null,coverImageUrl:r.coverImageUrl||null,videoUrl:r.videoUrl||null,videoLabel:r.videoLabel||null,
      materialUrl:r.materialUrl||null,materialLabel:r.materialLabel||null,noticeKind:r.noticeKind,
      noticeActivatedAt:r.noticeKind?new Date():null,requiresReview:r.requiresReview,status:r.status,
      createdByUserId:actorUserId,updatedByUserId:actorUserId,
    });
    const id=Number(inserted[0].insertId);
    await tx.insert(disciplineContents).values(r.disciplineIds.map(disciplineId=>({disciplineId,contentId:id,linkedByUserId:actorUserId})));
    await tx.insert(contentChangelog).values({contentId:id,actorUserId,changedField:"created",newValue:JSON.stringify({title:r.title})});
    if(r.status==="review")await tx.insert(reviewQueue).values({itemType:"content",itemId:id,status:"pending",submittedByUserId:actorUserId});
   }else{
    const r=row as QuestionRow;
    const inserted=await tx.insert(questions).values({
      statement:r.statement,questionType:r.questionType,
      optionsJson:r.questionType==="multipla_escolha"?JSON.stringify(r.options):null,
      answerJson:JSON.stringify(r.answer),explanation:r.explanation||null,difficulty:r.difficulty,
      source:r.source||null,banca:r.banca||null,year:r.year,requiresReview:r.requiresReview,status:r.status,
      createdByUserId:actorUserId,updatedByUserId:actorUserId,
    });
    const id=Number(inserted[0].insertId);
    await tx.insert(questionContentLinks).values(r.contentIds.map(contentId=>({questionId:id,contentId,linkedByUserId:actorUserId})));
    await tx.insert(questionChangelog).values({questionId:id,actorUserId,changedField:"created",newValue:JSON.stringify({statement:r.statement})});
    if(r.status==="review")await tx.insert(reviewQueue).values({itemType:"question",itemId:id,status:"pending",submittedByUserId:actorUserId});
   }
  }
  await tx.insert(adminAuditLogs).values({actorUserId,action:"IMPORTACAO_EM_LOTE",detail:`Planilha ${input.kind}: ${prepared.toCreate} novos e ${prepared.toUpdate} conteúdos atualizados sem alteração dos IDs.`});
 });
 return {valid:true,count:prepared.data.length,errors:[],preview:prepared.preview.slice(0,30),toCreate:prepared.toCreate,toUpdate:prepared.toUpdate,created:prepared.toCreate,updated:prepared.toUpdate};
}
