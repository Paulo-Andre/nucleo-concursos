import { inflateRawSync } from "node:zlib";

const MAX_FILE = 3 * 1024 * 1024;
const MAX_UNPACKED = 16 * 1024 * 1024;
const MAX_ROWS = 1000;
type SheetRow = { line: number; values: Record<string, string> };

function xmlText(raw: string) {
  return raw.replace(/&(#x[\da-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (match, name: string) => {
    if (name === "amp") return "&";
    if (name === "lt") return "<";
    if (name === "gt") return ">";
    if (name === "quot") return '"';
    if (name === "apos") return "'";
    const n = name.startsWith("#x") ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return Number.isInteger(n) && n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
      ? String.fromCodePoint(n) : match;
  });
}

function extractZip(buffer: Buffer): Map<string, string> {
  const files = new Map<string,string>();
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");
  const count = buffer.readUInt16LE(eocd+10);
  let offset = buffer.readUInt32LE(eocd+16);
  if (count > 256 || offset >= buffer.length) throw new Error("Planilha XLSX muito complexa.");
  let uncompressedTotal = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Índice ZIP inválido.");
    const flags=buffer.readUInt16LE(offset+8),method=buffer.readUInt16LE(offset+10);
    const compressed=buffer.readUInt32LE(offset+20),size=buffer.readUInt32LE(offset+24);
    const nameLen=buffer.readUInt16LE(offset+28),extraLen=buffer.readUInt16LE(offset+30),commentLen=buffer.readUInt16LE(offset+32);
    const localOffset=buffer.readUInt32LE(offset+42);
    const name=buffer.subarray(offset+46,offset+46+nameLen).toString("utf8");
    offset+=46+nameLen+extraLen+commentLen;
    if ((flags & 1) || name.includes("..") || name.startsWith("/") || name.includes("\\")) throw new Error("Entrada XLSX não permitida.");
    if (size > MAX_UNPACKED || compressed > MAX_FILE || (compressed && size / compressed > 250)) throw new Error("Planilha compactada acima do limite seguro.");
    uncompressedTotal += size;
    if (uncompressedTotal > MAX_UNPACKED) throw new Error("Conteúdo da planilha acima de 16 MB.");
    if (!name.startsWith("xl/") || !(name.endsWith(".xml") || name.endsWith(".rels"))) continue;
    if (localOffset+30 > buffer.length || buffer.readUInt32LE(localOffset)!==0x04034b50) throw new Error("Arquivo ZIP inválido.");
    const lhName=buffer.readUInt16LE(localOffset+26),lhExtra=buffer.readUInt16LE(localOffset+28);
    const beginning=localOffset+30+lhName+lhExtra;
    if(beginning+compressed>buffer.length) throw new Error("Planilha truncada.");
    const data=buffer.subarray(beginning,beginning+compressed);
    const output=method===8?inflateRawSync(data,{maxOutputLength:Math.max(1,size)}):method===0?data:null;
    if(!output || output.length!==size) throw new Error("Compactação XLSX não suportada.");
    files.set(name,output.toString("utf8"));
  }
  return files;
}

function indexFromLetters(letters: string) {
  let col = 0;
  for (const c of letters.toUpperCase()) col=col*26+c.charCodeAt(0)-64;
  return col-1;
}

function parseWorksheet(xml: string, shared: string[]): string[][] {
 const rows: string[][]=[];
 const rowRe=/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/gi;
 for (const row of xml.matchAll(rowRe)) {
  if (rows.length>=MAX_ROWS+1) throw new Error("Limite de 1000 linhas excedido.");
  const values:string[]=[];
  const cellRe=/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/gi;
  let nextCol=0;
  for (const cell of row[1].matchAll(cellRe)) {
    const attr=cell[1]||"",inner=cell[2]||"";
    const position=/\br=["']([A-Z]+)\d+["']/i.exec(attr)?.[1];
    const col=position?indexFromLetters(position):nextCol;
    if(col<0||col>150)throw new Error("Planilha possui colunas além do limite.");
    nextCol=col+1;
    if(/<(?:\w+:)?f[\s>]/i.test(inner))throw new Error("Células com fórmulas não são permitidas.");
    const type=/\bt=["']([^"']+)["']/i.exec(attr)?.[1];
    const value=/<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/i.exec(inner)?.[1];
    const inline=/<(?:\w+:)?is\b[^>]*>([\s\S]*?)<\/(?:\w+:)?is>/i.exec(inner)?.[1];
    const textValues=inline?Array.from(inline.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi)).map(x=>xmlText(x[1])).join(""):"";
    values[col]=type==="s"?shared[Number(value)]??"":type==="inlineStr"?textValues:xmlText(value??"");
  }
  rows.push(values);
 }
 return rows;
}
function splitCsv(raw: string): string[][] {
 const head=raw.slice(0,4096);const delimiter=(head.match(/;/g)||[]).length>(head.match(/,/g)||[]).length?";":",";
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='"'){if(quoted&&raw[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===delimiter&&!quoted){row.push(value);value="";}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&raw[i+1]==="\n")i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value="";if(rows.length>MAX_ROWS+1)throw new Error("Limite de 1000 linhas excedido.");}
  else value+=c;
 }
 if(quoted)throw new Error("Aspas não fechadas no CSV.");
 row.push(value);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
function normalizeTitle(s:string){return s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[\s -]+/g,"_");}
export function readSpreadsheet(fileName:string,base64:string): SheetRow[] {
 if(!/\.(xlsx|csv)$/i.test(fileName))throw new Error("Use uma planilha .xlsx ou .csv. Arquivos .xls antigos devem ser salvos como .xlsx.");
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new Error("O arquivo não contém base64 válido.");
 const data=Buffer.from(base64,"base64");
 if(data.length===0||data.length>MAX_FILE)throw new Error("Arquivo vazio ou maior que 3 MB.");
 let values:string[][];
 if(/\.xlsx$/i.test(fileName)){
   const entries=extractZip(data);
   const sheet=entries.get("xl/worksheets/sheet1.xml");
   if(!sheet)throw new Error("A primeira aba da planilha não foi encontrada.");
   const sharedXml=entries.get("xl/sharedStrings.xml")||"";
   const shared=Array.from(sharedXml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/gi))
      .map(item=>Array.from(item[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi)).map(x=>xmlText(x[1])).join(""));
   values=parseWorksheet(sheet,shared);
 }else{
   const text=data.toString("utf8").replace(/^\uFEFF/,"");
   if(text.includes("\u0000"))throw new Error("CSV com caracteres inválidos.");
   values=splitCsv(text);
 }
 if(values.length<2)throw new Error("Inclua cabeçalho e pelo menos uma linha preenchida.");
 const headers=values[0].map(normalizeTitle);
 if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw new Error("Existem cabeçalhos duplicados.");
 return values.slice(1).filter(row=>row.some(value=>value?.trim())).map((row,index)=>{
   const fields:Record<string,string>={};
   headers.forEach((key,i)=>{if(key && key!=="index") fields[key]=String(row[i]??"").trim();});
   return {line:index+2,values:fields};
 });
}
