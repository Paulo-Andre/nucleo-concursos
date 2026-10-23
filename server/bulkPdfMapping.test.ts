import { describe, expect, it } from "vitest";
import { lessonNumberFromContentTitle, lessonNumberFromPdfName, mapPdfFilesToContents } from "./bulkPdfMapping";

const contents = [
  { id: 1, title: "Aula 01 - 01 - Interpretação de texto", materialUrl: null },
  { id: 2, title: "Aula 01 - 02 - Ideia central", materialUrl: null },
  { id: 3, title: "Aula 02 - Texto narrativo - Capítulo 1", materialUrl: "/manus-storage/content-pdfs/1/old.pdf" },
  { id: 4, title: "Aula 03 — 01. O que é descrever?", materialUrl: null },
  { id: 5, title: "Revisão geral", materialUrl: null },
  { id: 6, title: "Aula 45 - 10 - Glossário", materialUrl: null },
];

describe("identificação segura de PDFs para o Excel de Português", () => {
  it("reconhece 45 aulas independentemente do travessão e do formato de capítulo", () => {
    expect(lessonNumberFromContentTitle(contents[0].title)).toBe(1);
    expect(lessonNumberFromContentTitle(contents[2].title)).toBe(2);
    expect(lessonNumberFromContentTitle(contents[3].title)).toBe(3);
    expect(lessonNumberFromContentTitle(contents[5].title)).toBe(45);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 01 - Parte 01 - INTERPRETAÇÃO")).toBe(1);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 45 - Parte 02 - REVISÃO FINAL")).toBe(45);
    expect(lessonNumberFromContentTitle("PCMG Língua Portuguesa - Aula 14 - Parte 01")).toBe(14);
    expect(lessonNumberFromContentTitle("PCMG Literatura - Aula 01 - Parte 01")).toBeNull();
    expect(lessonNumberFromContentTitle("Capítulo 01 da Aula 01")).toBeNull();
    expect(lessonNumberFromContentTitle("Revisão geral")).toBeNull();
    expect(lessonNumberFromPdfName("PT_Aula_01.pdf")).toBe(1);
    expect(lessonNumberFromPdfName("PT_Aula_45.PDF")).toBe(45);
    expect(lessonNumberFromPdfName("PCMG_Aula_01.pdf")).toBe(1);
    expect(lessonNumberFromPdfName("PCMG_Aula_45.pdf")).toBe(45);
  });

  it("reconhece títulos do banco com prefixos e códigos PT-M01-A01 sem aceitar capítulos isolados", () => {
    expect(lessonNumberFromContentTitle("Português PCMG | Aula 01 — Parte 01")).toBe(1);
    expect(lessonNumberFromContentTitle("Língua Portuguesa - Aula 25 - Classe de palavras")).toBe(25);
    expect(lessonNumberFromContentTitle("PT-M01-A07 - Recursos fonológicos")).toBe(7);
    expect(lessonNumberFromContentTitle("PCMG - Aula 44 - Regência verbal")).toBe(44);
    expect(lessonNumberFromContentTitle("PCMG Literatura - Aula 01")).toBeNull();
    expect(lessonNumberFromContentTitle("Capítulo 01 da Aula 01")).toBeNull();
    const mapped=mapPdfFilesToContents({
      files:[{fileName:"PT_Aula_01.pdf"},{fileName:"PT_Aula_07.pdf"}],
      contents:[
        {id:1,title:"Português PCMG | Aula 01 — Parte 01",materialUrl:null},
        {id:7,title:"PT-M01-A07 - Recursos fonológicos",materialUrl:null},
        {id:9,title:"Apostila sem número de aula reconhecível",materialUrl:null},
      ],replaceExisting:false,
    });
    expect(mapped.totalAssociations).toBe(2);
    expect(mapped.identifiedContents).toBe(2);
    expect(mapped.unidentifiedCount).toBe(1);
    expect(mapped.unidentifiedTitleExamples).toEqual(["Apostila sem número de aula reconhecível"]);
  });

  it("reconhece os 104 títulos de partes PCMG como uma das 45 aulas", () => {
    const prefixed = [
      { id: 101, title: "PCMG Português - Aula 01 - Parte 01 - INTERPRETAÇÃO", materialUrl: null },
      { id: 102, title: "PCMG Português - Aula 01 - Parte 02 - INTERPRETAÇÃO", materialUrl: null },
      { id: 103, title: "PCMG Português - Aula 02 - Parte 01 - NARRAÇÃO", materialUrl: null },
    ];
    const result = mapPdfFilesToContents({ files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "PCMG_Aula_02.pdf" }], contents: prefixed, replaceExisting: false });
    expect(result.unmatched).toEqual([]);
    expect(result.totalAssociations).toBe(3);
    expect(result.mappings[0].contentIds).toEqual([101,102]);
    expect(result.mappings[1].contentIds).toEqual([103]);
  });

  it("associa um PDF a todas as subdivisões da aula correspondente", () => {
    const result = mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "PT_Aula_03.pdf" }],
      contents,
      replaceExisting: false,
    });
    expect(result.totalFiles).toBe(2);
    expect(result.totalAssociations).toBe(3);
    expect(result.mappings[0].contentIds).toEqual([1, 2]);
    expect(result.mappings[1].contentIds).toEqual([4]);
  });

  it("não sobrescreve apostilas anteriores sem autorização", () => {
    const locked = mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_02.pdf" }], contents, replaceExisting: false,
    });
    expect(locked.totalAssociations).toBe(0);
    expect(locked.mappings[0].alreadyHasPdf).toBe(1);
    const replace = mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_02.pdf" }], contents, replaceExisting: true,
    });
    expect(replace.totalAssociations).toBe(1);
    expect(replace.mappings[0].contentIds).toEqual([3]);
  });

  it("recusa ambiguidades, formatos incorretos e duplicações", () => {
    for (const name of ["Aula_02_gabarito.pdf", "virus.exe", "../PT_Aula_01.pdf"]) {
      expect(() => mapPdfFilesToContents({
        files: [{ fileName: name }], contents, replaceExisting: true,
      })).toThrow(/nome de PDF/i);
    }
    expect(() => mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "Aula_1.pdf" }], contents, replaceExisting: true,
    })).toThrow(/mais de um pdf/i);
    const miss = mapPdfFilesToContents({ files: [{fileName:"PT_Aula_12.pdf"}], contents, replaceExisting:false });
    expect(miss.unmatched).toEqual(["PT_Aula_12.pdf"]);
  });

  it("permite corrigir manualmente a aula de destino antes de enviar o PDF", () => {
    const result = mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_01.pdf", targetLesson: 3 }],
      contents,
      replaceExisting: false,
    });
    expect(result.mappings[0].lesson).toBe(3);
    expect(result.mappings[0].contentIds).toEqual([4]);
    expect(result.mappings[0].contents).toEqual([
      { id: 4, title: "Aula 03 — 01. O que é descrever?", hasPdf: false },
    ]);
    expect(result.availableLessons.map(item => item.lesson)).toEqual([1, 2, 3, 45]);
    expect(() => mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_01.pdf", targetLesson: 2 }, { fileName: "PT_Aula_03.pdf", targetLesson: 2 }],
      contents, replaceExisting: true,
    })).toThrow(/Mais de um PDF para a Aula 2/);
  });

  it("não anexa por números que aparecem no meio de outros títulos", () => {
    expect(lessonNumberFromContentTitle("Capítulo 01 da Aula 01")).toBeNull();
    expect(lessonNumberFromContentTitle("Aula 0100 - conteúdo")).toBe(100);
    expect(lessonNumberFromPdfName("PT_Aula_100.pdf")).toBe(100);
  });
});
