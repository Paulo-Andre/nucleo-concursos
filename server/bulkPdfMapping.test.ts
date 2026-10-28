import { describe, expect, it } from "vitest";
import {
  groupKeyFromContentTitle, lessonNumberFromContentTitle,
  lessonNumberFromPdfName, mapPdfFilesToContents,
} from "./bulkPdfMapping";

const pt = [
  { id: 1, title: "Aula 01 - 01 - Interpretação de texto", materialUrl: null },
  { id: 2, title: "Aula 01 - 02 - Ideia central", materialUrl: null },
  { id: 3, title: "Aula 02 - Texto narrativo", materialUrl: "/manus-storage/content-pdfs/1/existing.pdf" },
  { id: 4, title: "Aula 03 — 01. O que é descrever?", materialUrl: null },
];
const rlm = [
  { id: 11, title: "RLM 2.1 · 01 — Proposição", materialUrl: null },
  { id: 12, title: "RLM 2.1 · 02 — Conectivos", materialUrl: null },
  { id: 13, title: "RLM 2.2 · 01 — Conjuntos", materialUrl: null },
  { id: 14, title: "RLM 2.10 · 08 — Matrizes", materialUrl: null },
];
const future = [
  { id: 21, title: "Geometria Plana", materialUrl: null },
  { id: 22, title: "História do Brasil", materialUrl: null },
  { id: 23, title: "Lei Orgânica", materialUrl: null },
];
const ptParams = { contents: pt, replaceExisting: false, disciplineShortName: "PT", disciplineName: "Língua Portuguesa" };
const rlmParams = { contents: rlm, replaceExisting: false, disciplineShortName: "RL-MT", disciplineName: "Raciocínio Lógico-Matemático" };

describe("associação universal de apostilas PDF", () => {
  it("preserva as 45 aulas de Português e seus capítulos", () => {
    expect(lessonNumberFromContentTitle(pt[0].title)).toBe(1);
    expect(lessonNumberFromContentTitle("Português — Aula 01 - Interpretação")).toBe(1);
    expect(lessonNumberFromContentTitle("PCMG Português - Aula 01 - Parte 01 - AULA 01")).toBe(1);
    expect(lessonNumberFromContentTitle("Aula 01 e Aula 02")).toBeNull();
    expect(lessonNumberFromContentTitle("Capítulo 01 da Aula 01")).toBeNull();
    expect(lessonNumberFromPdfName("PT_Aula_01.pdf")).toBe(1);
    expect(lessonNumberFromPdfName("PT_Aula_45.PDF")).toBe(45);
    const preview = mapPdfFilesToContents({
      ...ptParams,
      files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "PT_Aula_03.pdf" }],
    });
    expect(preview.unmatched).toEqual([]);
    expect(preview.mappings[0].contentIds).toEqual([1, 2]);
    expect(preview.mappings[1].contentIds).toEqual([4]);
  });

  it("mantém PDFs existentes salvo substituição explícita", () => {
    const locked = mapPdfFilesToContents({ ...ptParams, files: [{ fileName: "PT_Aula_02.pdf" }] });
    expect(locked.mappings[0].alreadyHasPdf).toBe(1);
    expect(locked.totalAssociations).toBe(0);
    const replacing = mapPdfFilesToContents({ ...ptParams, replaceExisting: true, files: [{ fileName: "PT_Aula_02.pdf" }] });
    expect(replacing.mappings[0].contentIds).toEqual([3]);
  });

  it("associa RLM pelo tópico completo e não mistura 2.1 com 2.10", () => {
    expect(groupKeyFromContentTitle(rlm[0].title)).toBe("tema:rlm:2.1");
    expect(groupKeyFromContentTitle(rlm[3].title)).toBe("tema:rlm:2.10");
    const preview = mapPdfFilesToContents({ ...rlmParams,
      files: [{ fileName: "RLM_Aula_01.pdf" }, { fileName: "RLM_Aula_10.pdf" }] });
    expect(preview.mappings[0].contentIds).toEqual([11, 12]);
    expect(preview.mappings[1].contentIds).toEqual([14]);
  });

  it("funciona com disciplina futura e nome de PDF sem nenhuma sigla", () => {
    const preview = mapPdfFilesToContents({
      contents: future, replaceExisting: false,
      disciplineShortName: "GEO-2027", disciplineName: "Geografia e História",
      files: [{ fileName: "Geometria Plana.pdf" }, { fileName: "apostila especial.pdf" }],
    });
    expect(preview.mappings[0].contentIds).toEqual([21]);
    expect(preview.mappings[1].matchedContents).toBe(0);
    expect(preview.unmatched).toEqual(["apostila especial.pdf"]);
    expect(preview.availableTargets.some(target => target.key === "content:22")).toBe(true);
    const manuallySelected = mapPdfFilesToContents({
      contents: future, replaceExisting: false, disciplineShortName: "GEO-2027",
      files: [{ fileName: "apostila especial.pdf", targetKey: "content:22" }],
    });
    expect(manuallySelected.mappings[0].contentIds).toEqual([22]);
    expect(manuallySelected.mappings[0].matchMode).toBe("manual");
  });

  it("permite selecionar vários conteúdos avulsos sem padrão de título", () => {
    const preview = mapPdfFilesToContents({
      contents: future, replaceExisting: false,
      files: [{ fileName: "material2027.pdf", targetContentIds: [21, 23] }],
    });
    expect(preview.mappings[0].contentIds).toEqual([21, 23]);
    expect(preview.totalAssociations).toBe(2);
  });

  it("evita associação automática quando prefixo pertence a outra disciplina", () => {
    const preview = mapPdfFilesToContents({ ...rlmParams,
      files: [{ fileName: "PT_Aula_01.pdf" }] });
    expect(preview.unmatched).toEqual(["PT_Aula_01.pdf"]);
    expect(preview.mappings[0].reason).toMatch(/prefixo/i);
    // Confirmação explícita continua possível, sem depender do nome do arquivo.
    const manual = mapPdfFilesToContents({ ...rlmParams,
      files: [{ fileName: "PT_Aula_01.pdf", targetKey: "tema:rlm:2.1" }] });
    expect(manual.mappings[0].contentIds).toEqual([11, 12]);
  });

  it("distingue dois módulos com a mesma numeração de aula", () => {
    const contents = [
      { id: 31, title: "HIS 2.1 - Tema X", materialUrl: null },
      { id: 32, title: "HIS 3.1 - Tema Y", materialUrl: null },
    ];
    const ambiguous = mapPdfFilesToContents({ files: [{ fileName: "Aula_01.pdf" }], contents, replaceExisting: false });
    expect(ambiguous.unmatched).toEqual(["Aula_01.pdf"]);
    const explicit = mapPdfFilesToContents({ files: [{ fileName: "Aula_01.pdf", targetKey: "tema:his:3.1" }], contents, replaceExisting: false });
    expect(explicit.mappings[0].contentIds).toEqual([32]);
  });

  it("não tenta associar automaticamente arquivos de gabarito", () => {
    const preview = mapPdfFilesToContents({ ...ptParams, files: [{ fileName: "Aula 01 - gabarito.pdf" }] });
    expect(preview.unmatched).toEqual(["Aula 01 - gabarito.pdf"]);
  });

  it("bloqueia colisões, arquivos duplicados, caminhos e IDs de outra disciplina", () => {
    expect(() => mapPdfFilesToContents({ ...ptParams,
      files: [{ fileName: "PT_Aula_01.pdf" }, { fileName: "Aula_01.pdf" }],
    })).toThrow(/mesmo conteúdo/i);
    expect(() => mapPdfFilesToContents({ ...ptParams,
      files: [{ fileName: "Aula_01.pdf" }, { fileName: "aula_01.PDF" }],
    })).toThrow(/duplicado/i);
    expect(() => mapPdfFilesToContents({ ...ptParams,
      files: [{ fileName: "../Aula_01.pdf" }],
    })).toThrow(/inválido/i);
    expect(() => mapPdfFilesToContents({ ...ptParams,
      files: [{ fileName: "qualquer.pdf", targetContentIds: [9999] }],
    })).toThrow(/fora da disciplina/i);
    expect(() => mapPdfFilesToContents({ ...ptParams,
      files: [{ fileName: "qualquer.pdf", targetKey: "content:9999" }],
    })).toThrow(/não encontrado/i);
  });
});
