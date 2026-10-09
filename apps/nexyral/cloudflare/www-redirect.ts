/** Canonical public address; this Worker holds no credentials or application data. */
export default {
  fetch(request: Request): Response {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Use https://nexyral.online for application requests.', { status: 421 });
    }
    const incoming = new URL(request.url);
    const target = new URL('https://nexyral.online');
    target.pathname = incoming.pathname;
    target.search = incoming.search;
    return Response.redirect(target.href, 308);
  },
};
