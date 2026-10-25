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
    expect(lessonNumberFromContentTitle("Revisão geral")).toBeNull();
    expect(lessonNumberFromContentTitle("Português — Aula 01 - Interpretação")).toBe(1);
    expect(lessonNumberFromContentTitle("Módulo 2 | Aula 45: Revisão")).toBe(45);
    expect(lessonNumberFromContentTitle("Aula 01 e Aula 02")).toBeNull();
    expect(lessonNumberFromContentTitle("PT-M01-A01 — Revisão")).toBeNull();
    expect(lessonNumberFromPdfName("PT_Aula_01.pdf")).toBe(1);
    expect(lessonNumberFromPdfName("PT_Aula_45.PDF")).toBe(45);
  });

  it("reconhece os títulos reais da importação PCMG com partes e menções repetidas", () => {
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 01 - Parte 01 - AULA 01 - INTERPRETAÇÃO")).toBe(1);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 07 - Parte 02 - AULA 07 - Aula 07")).toBe(7);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 45 - Parte 02 - AULA 45 - REGÊNCIA NOMINAL")).toBe(45);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 09 - Parte 02 - Continuação dos estudos")).toBe(9);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 01 - Parte 02 - AULA 02 - Conteúdo incorreto")).toBeNull();
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 01 e Aula 02")).toBeNull();
    const result = mapPdfFilesToContents({
      files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "PT_Aula_45.pdf" }],
      contents: [
        { id: 597, title: "PCMG Português - Aula 01 - Parte 01 - AULA 01 - INTERPRETAÇÃO", materialUrl: null },
        { id: 598, title: "PCMG Português - Aula 01 - Parte 02 - AULA 01 - INTERPRETAÇÃO", materialUrl: null },
        { id: 700, title: "PCMG Português - Aula 45 - Parte 02 - AULA 45 - REGÊNCIA NOMINAL", materialUrl: null },
      ], replaceExisting: false,
    });
    expect(result.unmatched).toEqual([]);
    expect(result.totalAssociations).toBe(3);
    expect(result.availableLessons.map(item => item.lesson)).toEqual([1, 45]);
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
