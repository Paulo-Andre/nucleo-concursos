import { test, expect } from "@playwright/test";
const timeout=20_000;

test("B01 vitrine e cursos são renderizados com responsividade",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page.locator("body")).toContainText(/Núcleo|Concursos/i,{timeout});
 await expect(page.locator("body")).not.toContainText("Internal Server Error");
 await page.goto("/cursos");
 await expect(page.locator("body")).toContainText(/cursos|planos|pacotes/i,{timeout});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
});

test("B02 valida CPF antes do cadastro e oferece retorno acessível",async({page})=>{
 await page.goto("/");
 const loginButton=page.getByRole("button",{name:/entrar|acessar/i}).first();
 await expect(loginButton).toBeVisible({timeout});
 await loginButton.click();
 await page.getByRole("button",{name:/criar conta/i}).click();
 const cpf=page.getByPlaceholder("000.000.000-00");
 await expect(cpf).toBeVisible();
 await cpf.fill("11111111111");
 await page.getByRole("textbox",{name:/nome completo/i}).fill("Aluno QA de Navegador");
 await page.getByRole("textbox",{name:/nome de usuário/i}).fill("qa-navegador");
 await page.getByRole("textbox",{name:/e-mail/i}).fill("qa-navegador@example.invalid");
 await page.locator('input[type="password"]').first().fill("SenhaForte1234");
 await page.locator('input[type="password"]').last().fill("SenhaForte1234");
 await page.getByRole("button",{name:/criar conta e entrar/i}).click();
 await expect(page.getByRole("alert")).toContainText(/CPF válido/i);
});

test("B03 login ROOT, navegação do aluno e painel de administração",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:/entrar|acessar/i}).first().click();
 await page.getByRole("textbox",{name:/Usuário ou e-mail/i}).fill("paulo");
 await page.locator('input[type="password"]').fill(process.env.ROOT_INITIAL_PASSWORD??"");
 await page.getByRole("button",{name:"Entrar na plataforma"}).click();
 // Aguarda a aplicação autenticada montar antes de consultar isVisible (que não espera renderizações).
 await expect(page.locator("#area-de-estudos")).toBeVisible({timeout});
 // Em telas pequenas a barra lateral é ocultada da árvore acessível até a gaveta ser aberta.
 const drawer=page.getByRole("button",{name:"Abrir navegação"});
 if(await drawer.isVisible())await drawer.click();
 await expect(page.getByRole("navigation",{name:"Áreas de estudo"})).toBeVisible({timeout});
 await page.getByRole("button",{name:/Treinador/i}).first().click();
 await expect(page.getByText("Seu treinador de estudos")).toBeVisible({timeout});
 await expect(page.getByText("Flashcards inteligentes")).toBeVisible();
 // Jornada completa: criar cartão privado, recuperar resposta e agendar próxima revisão.
 const front=`Pergunta QA ${test.info().project.name} ${Date.now()}`;
 const answer="O gabarito é conferido no servidor e o cartão pertence à conta autenticada.";
 await page.getByPlaceholder("O que preciso lembrar?").fill(front);
 await page.getByPlaceholder("Explique com suas palavras.").fill(answer);
 await page.getByRole("button",{name:"Salvar flashcard"}).click();
 const card=page.locator("article").filter({hasText:front});
 await expect(card).toBeVisible({timeout});
 await card.getByRole("button",{name:"Mostrar resposta"}).click();
 await expect(card).toContainText(answer);
 await card.getByRole("button",{name:"Lembrei",exact:true}).click();
 await expect(card).toHaveCount(0,{timeout});

 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
});
