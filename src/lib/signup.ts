/**
 * Buttondown embed endpoint, e.g.
 * https://buttondown.com/api/emails/embed-subscribe/<username>. Empty = the
 * form is not rendered, so nothing collects an address until a list exists.
 */
export function signupEndpoint(): string {
  const value = import.meta.env.VITE_SIGNUP_ENDPOINT;
  return typeof value === "string" ? value.trim() : "";
}
