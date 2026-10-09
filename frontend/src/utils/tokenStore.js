const KEY = "token";

// "Remember me" decides which storage the token lands in: localStorage survives
// the browser closing, sessionStorage dies with the tab.
export function readToken() {
  return localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
}

export function writeToken(token, remember) {
  const persistent = remember === undefined ? !!localStorage.getItem(KEY) : !!remember;
  (persistent ? localStorage : sessionStorage).setItem(KEY, token);
  (persistent ? sessionStorage : localStorage).removeItem(KEY);
}

export function clearToken() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
