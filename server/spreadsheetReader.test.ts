import { describe, expect, it } from "vitest";
import { readSpreadsheet } from "./spreadsheetReader";

function makeZip(name:string,source:string) {
 const file=Buffer.from(name), bytes=Buffer.from(source,"utf8");
 const local=Buffer.alloc(30);
 local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4);
 local.writeUInt32LE(bytes.length,18); local.writeUInt32LE(bytes.length,22);
 local.writeUInt16LE(file.length,26);
 const central=Buffer.alloc(46);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
 central.writeUInt32LE(bytes.length,20);central.writeUInt32LE(bytes.length,24);
 central.writeUInt16LE(file.length,28);
 const position=30+file.length+bytes.length;
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
 end.writeUInt32LE(46+file.length,12);end.writeUInt32LE(position,16);
 return Buffer.concat([local,file,bytes,central,file,end]).toString("base64");
}
describe("leitor de importação Excel",()=>{
 it("lê cabeçalho e linhas CSV de Excel brasileiro com ponto e vírgula",()=>{
  const data=Buffer.from("titulo;objetivo;corpo\r\nAula válida;Estudar direitos;\"Texto; interno\"\r\n").toString("base64");
  expect(readSpreadsheet("aula.csv",data)).toEqual([{line:2,values:{titulo:"Aula válida",objetivo:"Estudar direitos",corpo:"Texto; interno"}}]);
 });
 it("lê XLSX com primeira aba e texto inline",()=>{
  const xml=`<worksheet><sheetData>
  <row r="1"><c r="A1" t="inlineStr"><is><t>titulo</t></is></c><c r="B1" t="inlineStr"><is><t>corpo</t></is></c></row>
  <row r="2"><c r="A2" t="inlineStr"><is><t>Leitura &amp; escrita</t></is></c><c r="B2" t="inlineStr"><is><t>Exemplo</t></is></c></row>
  </sheetData></worksheet>`;
  expect(readSpreadsheet("modelo.xlsx",makeZip("xl/worksheets/sheet1.xml",xml))).toEqual([{line:2,values:{titulo:"Leitura & escrita",corpo:"Exemplo"}}]);
 });
 it("rejeita fórmulas, arquivos antigos e payloads inválidos",()=>{
  const xml='<worksheet><row><c r="A1" t="inlineStr"><is><t>titulo</t></is></c></row><row><c r="A2"><f>1+1</f><v>2</v></c></row></worksheet>';
  expect(()=>readSpreadsheet("x.xlsx",makeZip("xl/worksheets/sheet1.xml",xml))).toThrow(/fórmulas/i);
  expect(()=>readSpreadsheet("x.xls","YWJj")).toThrow(/xls/i);
  expect(()=>readSpreadsheet("x.csv","*")).toThrow(/base64/i);
 });
});
