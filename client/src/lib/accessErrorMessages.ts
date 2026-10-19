type AccessMode = "login" | "register" | "forgot" | "reset";

type ValidationIssue = {
  message?: unknown;
  path?: unknown;
  code?: unknown;
  minimum?: unknown;
  maximum?: unknown;
};

const fieldLabels: Record<string, string> = {
  identifier: "usuário ou e-mail",
  name: "nome completo",
  username: "nome de usuário",
  email: "e-mail",
  cpf: "CPF",
  password: "senha",
  passwordConfirmation: "confirmação de senha",
  newPassword: "nova senha",
  confirmation: "confirmação de senha",
  currentPassword: "senha atual",
  token: "link de recuperação",
};

function fieldMessage(issue: ValidationIssue): string | null {
  const field = Array.isArray(issue.path) && typeof issue.path[0] === "string" ? issue.path[0] : "";
  const label = fieldLabels[field];
  if (!label) return null;
  if (issue.code === "too_small" && typeof issue.minimum === "number") {
    const minimum = issue.minimum;
    if (field.toLowerCase().includes("password") || field === "confirmation") return `A senha deve ter pelo menos ${minimum} caracteres.`;
    return `O campo ${label} deve ter pelo menos ${minimum} caracteres.`;
  }
  if (issue.code === "too_big" && typeof issue.maximum === "number") {
    return `O campo ${label} pode ter no máximo ${issue.maximum} caracteres.`;
  }
  if (issue.code === "invalid_format" || issue.code === "invalid_string") {
    if (field === "email") return "Informe um endereço de e-mail válido.";
  }
  if (typeof issue.message === "string" && /^[\p{L}0-9 .,;:!?()\-]+$/u.test(issue.message) && issue.message.length < 180) return issue.message;
  return `Verifique o campo ${label} e tente novamente.`;
}

function getValidationIssues(value: unknown): ValidationIssue[] {
  if (Array.isArray(value)) return value.filter(entry => entry && typeof entry === "object");
  if (value && typeof value === "object") {
    const object = value as { issues?: unknown; zodError?: { issues?: unknown }; fieldErrors?: Record<string, unknown> };
    if (Array.isArray(object.issues)) return getValidationIssues(object.issues);
    if (object.zodError) return getValidationIssues(object.zodError);
    if (object.fieldErrors && typeof object.fieldErrors === "object") {
      return Object.entries(object.fieldErrors).flatMap(([key, messages]) =>
        Array.isArray(messages) ? messages.map(message => ({ path: [key], message })) : []);
    }
  }
  return [];
}

export function formatAccessError(error: unknown, mode: AccessMode): string {
  const object = error && typeof error === "object" ? error as {
    message?: unknown;
    data?: { code?: unknown; zodError?: unknown };
    shape?: { data?: { zodError?: unknown } };
  } : null;
  const raw = typeof object?.message === "string" ? object.message : "";
  let issues = getValidationIssues(object?.data?.zodError ?? object?.shape?.data?.zodError);
  if (!issues.length && (raw.startsWith("[") || raw.startsWith("{"))) {
    try { issues = getValidationIssues(JSON.parse(raw)); } catch { /* Resposta inválida: não exibir detalhes internos. */ }
  }
  if (issues.length) return fieldMessage(issues[0]) ?? "Confira os dados informados e tente novamente.";

  const code = object?.data?.code;
  if (code === "TOO_MANY_REQUESTS" || /muitas tentativas|muitas solicitações/i.test(raw)) {
    return "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (code === "UNAUTHORIZED" || /usuário ou senha inválidos/i.test(raw)) return "Usuário ou senha incorretos. Verifique os dados e tente novamente.";
  if (/conta está bloqueada/i.test(raw)) return "Esta conta está bloqueada. Entre em contato com a administração.";
  if (/confirmação de senha não confere/i.test(raw)) return "As senhas informadas não coincidem.";
  if (/senha atual não confere/i.test(raw)) return "A senha atual está incorreta.";
  if (/nome de usuário já está em uso/i.test(raw)) return "Este nome de usuário já está em uso. Escolha outro.";
  if (/e-mail já está em uso/i.test(raw)) return "Este e-mail já está cadastrado.";
  if (/CPF já está em uso/i.test(raw)) return "Este CPF já está cadastrado.";
  if (/link é inválido|link de redefinição|link.*expirou/i.test(raw)) return "O link de recuperação está inválido ou expirou. Solicite outro.";
  if (/A senha deve ter pelo menos 8 caracteres/i.test(raw)) return "A senha deve ter pelo menos 8 caracteres.";
  if (/Informe um e-mail válido/i.test(raw)) return "Informe um endereço de e-mail válido.";

  if (mode === "login") return "Não foi possível entrar. Verifique sua conexão e tente novamente.";
  if (mode === "forgot") return "Não foi possível solicitar a recuperação agora. Tente novamente em instantes.";
  if (mode === "reset") return "Não foi possível redefinir sua senha. Confira os dados e tente novamente.";
  return "Não foi possível criar a conta. Confira os dados e tente novamente.";
}
