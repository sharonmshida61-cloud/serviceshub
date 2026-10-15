const KEY = "token";

// This tab's own copy wins, so signing in as a second account somewhere else in
// the browser cannot hijack the requests a dashboard that is already open sends.
// localStorage is only the copy a brand-new tab starts from ("remember me").
export function readToken() {
  return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
}

// "Remember me" decides whether the session also lands in localStorage, which is
// what lets a tab opened later stay signed in.
export function writeToken(token, remember) {
  const persistent = remember === undefined ? !!localStorage.getItem(KEY) : !!remember;
  sessionStorage.setItem(KEY, token);
  if (persistent) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}

export function clearToken() {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
