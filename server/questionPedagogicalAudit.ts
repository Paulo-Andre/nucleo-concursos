export type AuditQuestion = { id:number; statement:string; questionType:"certo_errado"|"multipla_escolha"; options:string[]; answer:boolean|string; explanation:string|null };
export type AuditFlag = { code:string; severity:"review"|"critical"; message:string };
export function auditQuestion(q:AuditQuestion):AuditFlag[] {
 const flags:AuditFlag[]=[];
 const stem=q.statement.replace(/^\[[^\]]+\]\s*/,"").trim();
 if (/aspecto (?:destacado|apresentado|estudado)|situa[cç][aã]o apresentada/i.test(stem) && !/<(?:u|strong|mark)>|\*\*[^*]+\*\*|“[^”]+”/.test(stem)) flags.push({code:"REFERENCE_UNCLEAR",severity:"review",message:"A pergunta menciona um aspecto sem definir claramente o que deve ser analisado."});
 if (/cap[ií]tulo aborda|estudado nesse cap[ií]tulo|conte[uú]do do cap[ií]tulo/i.test(stem)) flags.push({code:"META_CHAPTER",severity:"review",message:"A pergunta fala sobre o capítulo em vez de avaliar diretamente o conhecimento."});
 if (/qual alternativa explica de modo mais preciso/i.test(stem)) flags.push({code:"GENERIC_PROMPT",severity:"review",message:"Comando genérico: especificar qual habilidade ou fenômeno deve ser avaliado."});
 if (q.questionType==="multipla_escolha") {
  if(q.options.length<2 || !q.options.includes(String(q.answer))) flags.push({code:"INVALID_KEY",severity:"critical",message:"O gabarito não corresponde às alternativas cadastradas."});
  if(new Set(q.options.map(x=>x.trim().toLocaleLowerCase("pt-BR"))).size!==q.options.length)flags.push({code:"DUPLICATE_OPTIONS",severity:"critical",message:"Existem alternativas duplicadas."});
 }else if(typeof q.answer!=="boolean")flags.push({code:"INVALID_KEY",severity:"critical",message:"O gabarito de Certo/Errado não é booleano."});
 if(!q.explanation?.trim())flags.push({code:"MISSING_EXPLANATION",severity:"review",message:"Questão sem justificativa do gabarito."});
 return flags;
}
