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
  line:number;statement:string;passage:string;questionType:"certo_errado"|"multipla_escolha";options:string[];existingId?:number;
  answer:boolean|string;explanation:string;difficulty:"basic"|"intermediate"|"advanced";
  source:string;banca:string;year:number|null;contentIds:number[];fallbackDisciplineId?:number;status:Status;requiresReview:boolean;
};
type Parsed = {
 kind:ImportKind;errorMessages:string[];data:(ContentRow|QuestionRow)[];
 toCreate:number;toUpdate:number;toLink:number;
 duplicateAudit:{alreadyInSelected:number;inOtherOnly:number;noDiscipline:number;unpublished:number};
 preview:{line:number;label:string;status:Status;action:"create"|"update"|"link";existingId?:number;existingDisciplines?:string[]}[];
};
type Input = {kind:ImportKind;fileName:string;base64:string;fallbackDisciplineId?:number;questionDuplicateMode?:"reject"|"link"};
const statuses = new Set(["draft","review","approved","published","inactive"]);

export const MAX_SPREADSHEET_IMPORT_ROWS = 1000;
const normalize=(s:string)=>s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
/** Converte apenas sinônimos conhecidos; mantém erro para valores desconhecidos. */
export function normalizeQuestionDifficulty(raw:string):QuestionRow["difficulty"] {
 const value=normalize(raw);
 if(!value)return "intermediate";
 const aliases:Record<string,QuestionRow["difficulty"]>={
  basic:"basic",basico:"basic",basica:"basic",facil:"basic",
  intermediate:"intermediate",medium:"intermediate",intermediario:"intermediate",intermediaria:"intermediate",
  medio:"intermediate",media:"intermediate",
  advanced:"advanced",avancado:"advanced",avancada:"advanced",dificil:"advanced",
 };
 const resolved=aliases[value];
 if(!resolved)throw new Error("Dificuldade inválida: "+raw+". Use Fácil, Média, Difícil ou basic, intermediate, advanced.");
 return resolved;
}

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

type ExistingQuestionForImport = { id:number; statement:string; passage:string|null; questionType:"certo_errado"|"multipla_escolha"; optionsJson:string|null; answerJson:string; status?:Status };
/** O mesmo enunciado não garante identidade: o tipo, texto-base, alternativas e gabarito devem corresponder. */
export function isIdenticalQuestionForLink(existing:ExistingQuestionForImport,candidate:Pick<QuestionRow,"statement"|"passage"|"questionType"|"options"|"answer">):boolean {
 if(normalize(existing.statement)!==normalize(candidate.statement)||existing.questionType!==candidate.questionType)return false;
 if(normalize(existing.passage??"")!==normalize(candidate.passage))return false;
 const existingOptions=existing.optionsJson ? JSON.parse(existing.optionsJson) : [];
 if(!Array.isArray(existingOptions)||JSON.stringify(existingOptions)!==JSON.stringify(candidate.questionType==="multipla_escolha"?candidate.options:[]))return false;
 try{return JSON.stringify(JSON.parse(existing.answerJson))===JSON.stringify(candidate.answer);}catch{return false;}
}

export async function prepareSpreadsheetImport(input:Input,mode:"create"|"upsert"="create"):Promise<Parsed> {
 if(mode==="upsert"&&input.kind!=="contents")throw new Error("Atualização de registros existentes está disponível somente para conteúdos/aulas.");
 const db=await getDb();if(!db)throw new Error("Banco indisponível.");
 const sheet=readSpreadsheet(input.fileName,input.base64);
 if(sheet.length>MAX_SPREADSHEET_IMPORT_ROWS)throw new Error(`A planilha possui ${sheet.length} registros preenchidos. O máximo é ${MAX_SPREADSHEET_IMPORT_ROWS} por arquivo. Divida em lotes menores.`);
 const [ds,cs,qs]=await Promise.all([
  db.select({id:disciplines.id,name:disciplines.name,shortName:disciplines.shortName}).from(disciplines),
  db.select({id:contents.id,title:contents.title}).from(contents),
  input.kind==="questions"?db.select({id:questions.id,statement:questions.statement,passage:questions.passage,questionType:questions.questionType,optionsJson:questions.optionsJson,answerJson:questions.answerJson,status:questions.status}).from(questions):Promise.resolve([]),
 ]);
 const allowedContentIds=input.kind==="questions"&&input.fallbackDisciplineId!==undefined
  ? new Set((await db.select({contentId:disciplineContents.contentId}).from(disciplineContents)
   .where(eq(disciplineContents.disciplineId,input.fallbackDisciplineId))).map(link=>link.contentId))
  : null;
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
 const questionsByStatement=new Map<string,ExistingQuestionForImport[]>();
 if(input.kind==="questions"){
  for(const question of qs as ExistingQuestionForImport[]){
   const key=normalize(question.statement);
   questionsByStatement.set(key,[...(questionsByStatement.get(key)??[]),question]);
  }
 }
 const inFile=new Set<string>();
 const parsed:Parsed={kind:input.kind,errorMessages:[],data:[],toCreate:0,toUpdate:0,toLink:0,duplicateAudit:{alreadyInSelected:0,inOtherOnly:0,noDiscipline:0,unpublished:0},preview:[]};
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
    const diff=normalizeQuestionDifficulty(row.dificuldade||"");
    const fallbackDisciplineId=input.fallbackDisciplineId;
    if(fallbackDisciplineId!==undefined && !dById.has(fallbackDisciplineId))throw new Error("Disciplina selecionada não encontrada no cadastro.");
    const lessonReference=(row.aula_referencia||row.aula_sugerida_nao_importar||"").trim();
    let contentIds:number[];
    if((row.conteudo_ids||"").trim()||(row.conteudos||"").trim()){
      contentIds=references(row.conteudo_ids||"",row.conteudos||"",cById,cByName,"conteúdo");
    }else if(lessonReference){
      // Uma referência de aula resolve apenas conteúdos com título inequívoco
      // do curso informado, sem inventar IDs nem recorrer à primeira correspondência.
      const courseReference=(row.curso_referencia||"").trim();
      if(!courseReference)throw new Error("Informe curso_referencia ao usar aula_referencia, para evitar vínculo em curso incorreto.");
      const lessonNumber=/^(?:aula\s*)?(\d{1,3})$/i.exec(lessonReference)?.[1];
      if(!lessonNumber)throw new Error("aula_referencia deve conter apenas Aula NN (ex.: Aula 07).");
      const courseTokens=normalize(courseReference).split(/\s+/).filter(Boolean);
      const found=cs.filter(content=>{
        const title=normalize(content.title);
        const parts=title.split(/\s+[-–—]\s+/);
        if(parts.length<2)return false;
        const prefix=parts[0];
        if(!courseTokens.every(token=>prefix.split(/\s+/).includes(token)))return false;
        const actual=/\baula\s*0*(\d{1,3})\b/i.exec(title)?.[1];
        return actual!==undefined && Number(actual)===Number(lessonNumber);
      });
      if(!found.length && fallbackDisciplineId===undefined)throw new Error("Nenhum conteúdo do curso e aula informados foi encontrado. Confira curso_referencia e aula_referencia.");
      contentIds=Array.from(new Set(found.map(content=>content.id)));
    }else{
      if(fallbackDisciplineId===undefined)throw new Error("Vincule um conteúdo por ID/nome ou escolha uma disciplina para questões sem aula.");
      contentIds=[];
    }
    if(allowedContentIds&&contentIds.some(contentId=>!allowedContentIds.has(contentId)))
      throw new Error("O conteúdo escolhido pertence a outra disciplina. Confira a disciplina e os vínculos informados na planilha.");
    item={line:entry.line,statement:label.trim(),passage:text(row,"texto_base",12000),questionType:questionType as QuestionRow["questionType"],
      options,answer,explanation:text(row,"comentario",12000),
      difficulty:diff as QuestionRow["difficulty"],source:text(row,"fonte",240),
      banca:text(row,"banca",120),year:readYear(row.ano||""),contentIds,fallbackDisciplineId:contentIds.length?undefined:fallbackDisciplineId,status:status(row.status||""),
      requiresReview:boolean(row.exigir_revisao||"")};
   }
   const key=normalize(label);
   if(inFile.has(key))throw new Error("Registro duplicado no próprio arquivo.");
   inFile.add(key);
   if(input.kind==="contents"&&mode==="upsert"){
    const matches=contentMatches.get(key)??[];
    if(matches.length>1)throw new Error("Há mais de um conteúdo no banco com este título. Resolva a ambiguidade antes de atualizar.");
    if(matches.length===1)(item as ContentRow).existingId=matches[0];
   }else if(input.kind==="questions"&&existing.has(key)){
    if(input.questionDuplicateMode!=="link")throw new Error("Registro duplicado no banco. Escolha 'Reutilizar questões existentes' para conferir e vincular sem duplicar.");
    const duplicates=questionsByStatement.get(key)??[];
    if(duplicates.length!==1)throw new Error("Há mais de uma questão com este enunciado no banco. Revise manualmente antes de vincular.");
    const candidate=item as QuestionRow;
    let identical=false;
    try{identical=isIdenticalQuestionForLink(duplicates[0],candidate);}
    catch{identical=false;}
    if(!identical)throw new Error("Enunciado duplicado, mas texto-base, tipo, alternativas ou gabarito são diferentes. A associação automática foi bloqueada.");
    candidate.existingId=duplicates[0].id;
   }else if(existing.has(key))throw new Error("Registro duplicado no banco.");
   const existingId=(item as ContentRow|QuestionRow).existingId;
   const action=existingId?(input.kind==="questions"?"link":"update"):"create";
   if(action==="update")parsed.toUpdate++;else if(action==="link")parsed.toLink++;else parsed.toCreate++;
   parsed.data.push(item);
   const recordedStatus=action==="link"?questionsByStatement.get(key)?.[0]?.status:item.status;
   parsed.preview.push({line:entry.line,label:label.slice(0,140),status:recordedStatus??item.status,action,existingId});
   if(action==="link"&&recordedStatus!=="published")parsed.duplicateAudit.unpublished++;
  }catch(error){parsed.errorMessages.push(`Linha ${entry.line}: ${error instanceof Error?error.message:"Dados inválidos"}`);}
 }
 if(parsed.toLink>0){
  const reused=parsed.data.filter((row):row is QuestionRow=>input.kind==="questions"&&"existingId" in row&&row.existingId!==undefined);
  const reusedIds=reused.map(row=>row.existingId!);
  const ownership=await db.select({
    questionId:questionContentLinks.questionId,disciplineId:disciplineContents.disciplineId,name:disciplines.name,
   }).from(questionContentLinks)
   .leftJoin(disciplineContents,eq(disciplineContents.contentId,questionContentLinks.contentId))
   .leftJoin(disciplines,eq(disciplines.id,disciplineContents.disciplineId))
   .where(inArray(questionContentLinks.questionId,reusedIds));
  const byQuestion=new Map<number,Map<number,string>>();
  for(const item of ownership){
    if(item.disciplineId===null||item.name===null)continue;
    if(!byQuestion.has(item.questionId))byQuestion.set(item.questionId,new Map());
    byQuestion.get(item.questionId)!.set(item.disciplineId,item.name);
  }
  for(const line of parsed.preview){
    if(line.action!=="link"||line.existingId===undefined)continue;
    const membership=byQuestion.get(line.existingId);
    line.existingDisciplines=[...(membership?.values()??[])].sort();
    if(!membership?.size)parsed.duplicateAudit.noDiscipline++;
    else if(input.fallbackDisciplineId!==undefined&&membership.has(input.fallbackDisciplineId))
      parsed.duplicateAudit.alreadyInSelected++;
    else parsed.duplicateAudit.inOtherOnly++;
  }
 }
 if(!parsed.data.length&&!parsed.errorMessages.length)parsed.errorMessages.push("Nenhuma linha válida encontrada.");
 return parsed;
}

export async function importSpreadsheet(actorUserId:number,input:Input,expectedCount:number,checkOnly:boolean,mode:"create"|"upsert"="create",expectedUpdates?:number,expectedLinks?:number) {
 const prepared=await prepareSpreadsheetImport(input,mode);
 if(checkOnly||prepared.errorMessages.length) return {valid:!prepared.errorMessages.length,count:prepared.data.length,errors:prepared.errorMessages,preview:prepared.preview.slice(0,30),toCreate:prepared.toCreate,toUpdate:prepared.toUpdate,toLink:prepared.toLink,duplicateAudit:prepared.duplicateAudit,created:0,updated:0,linked:0};
 if(prepared.data.length!==expectedCount||(expectedUpdates!==undefined&&prepared.toUpdate!==expectedUpdates)||(expectedLinks!==undefined&&prepared.toLink!==expectedLinks))throw new Error("Os registros ou vínculos mudaram desde a prévia. Revise e confirme novamente.");
 const db=await getDb();if(!db)throw new Error("Banco indisponível.");
 // Todas as criações, relações e logs são uma operação ACID. Uma falha cancela todo o lote.
 let linked=0;
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
    // O modo de reaproveitamento somente adiciona vínculos, sem sobrescrever
    // o enunciado, gabarito, status ou o histórico da questão original.
    const inserted=r.existingId ? null : await tx.insert(questions).values({
      statement:r.statement,passage:r.passage||null,questionType:r.questionType,
      optionsJson:r.questionType==="multipla_escolha"?JSON.stringify(r.options):null,
      answerJson:JSON.stringify(r.answer),explanation:r.explanation||null,difficulty:r.difficulty,
      source:r.source||null,banca:r.banca||null,year:r.year,requiresReview:r.requiresReview,status:r.status,
      createdByUserId:actorUserId,updatedByUserId:actorUserId,
    });
    const id=r.existingId??Number(inserted![0].insertId);
    let resolvedContentIds=r.contentIds;
    if(!resolvedContentIds.length){
      if(!r.fallbackDisciplineId)throw new Error("Disciplina obrigatória para questão avulsa.");
      const disc=(await tx.select().from(disciplines).where(eq(disciplines.id,r.fallbackDisciplineId)).limit(1))[0];
      if(!disc)throw new Error("Disciplina não encontrada durante a importação.");
      // O esquema atual utiliza vínculos questão -> conteúdo -> disciplina.
      // Mantém uma seção única por disciplina, sem inventar associação pedagógica à aula.
      const bucketTitle=`Questões avulsas — ${disc.name}`;
      const existingBuckets=await tx.select({id:contents.id}).from(contents)
        .innerJoin(disciplineContents,eq(disciplineContents.contentId,contents.id))
        .where(and(eq(contents.title,bucketTitle),eq(disciplineContents.disciplineId,disc.id))).limit(1);
      let bucketId=existingBuckets[0]?.id;
      if(!bucketId){
        const created=await tx.insert(contents).values({
          title:bucketTitle,description:"Agrupamento de questões importadas sem aula específica.",
          status:"published",requiresReview:false,createdByUserId:actorUserId,updatedByUserId:actorUserId,
        });
        bucketId=Number(created[0].insertId);
        await tx.insert(disciplineContents).values({disciplineId:disc.id,contentId:bucketId,linkedByUserId:actorUserId});
      }
      resolvedContentIds=[bucketId];
    }
    if(r.existingId){
      const [canonical]=await tx.select({
       id:questions.id,statement:questions.statement,passage:questions.passage,questionType:questions.questionType,
       optionsJson:questions.optionsJson,answerJson:questions.answerJson,
      }).from(questions).where(eq(questions.id,id)).limit(1);
      if(!canonical||!isIdenticalQuestionForLink(canonical,r))
       throw new Error("Questão #"+id+" mudou após a conferência. Nenhum vínculo foi gravado.");
    }
    for(const contentId of resolvedContentIds){
      const found=await tx.select({id:questionContentLinks.id}).from(questionContentLinks)
       .where(and(eq(questionContentLinks.questionId,id),eq(questionContentLinks.contentId,contentId))).limit(1);
      if(found.length)continue;
      await tx.insert(questionContentLinks).values({questionId:id,contentId,linkedByUserId:actorUserId});
      if(r.existingId)linked++;
    }
    await tx.insert(questionChangelog).values({questionId:id,actorUserId,
      changedField:r.existingId?"spreadsheet_link":"created",
      newValue:JSON.stringify({statement:r.statement,contentIds:resolvedContentIds})});
    if(!r.existingId&&r.status==="review")await tx.insert(reviewQueue).values({itemType:"question",itemId:id,status:"pending",submittedByUserId:actorUserId});
   }
  }
  await tx.insert(adminAuditLogs).values({actorUserId,action:"IMPORTACAO_EM_LOTE",detail:`Planilha ${input.kind}: ${prepared.toCreate} novos, ${prepared.toUpdate} conteúdos atualizados, ${prepared.toLink} questões existentes reaproveitadas (${linked} novos vínculos). IDs canônicos preservados.`});
 });
 return {valid:true,count:prepared.data.length,errors:[],preview:prepared.preview.slice(0,30),toCreate:prepared.toCreate,toUpdate:prepared.toUpdate,toLink:prepared.toLink,duplicateAudit:prepared.duplicateAudit,created:prepared.toCreate,updated:prepared.toUpdate,linked};
}
