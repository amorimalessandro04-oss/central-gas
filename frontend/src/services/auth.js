// Utilitários de autenticação (token JWT no localStorage)
const CHAVE = 'central_gas_token';
const CHAVE_USUARIO = 'central_gas_usuario';

export function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function getToken() {
  return localStorage.getItem(CHAVE);
}

export function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIO));
  } catch {
    return null;
  }
}

export function estaLogado() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(CHAVE);
  localStorage.removeItem(CHAVE_USUARIO);
}
