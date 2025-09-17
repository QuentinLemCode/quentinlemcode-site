function renderBody({status, token}) {
  const html = `
    <script>
      const receiveMessage = (message) => {
        console.log('receiveMessage', message);
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify({ token })}',
          message.origin
        );

        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);

      window.opener.postMessage("authorizing:github", "*");
    </script>
  `;
  const blob = new Blob([html]);
  return blob;
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GH_CLIENT_ID}&scope=repo,user&redirect_uri=${env.REDIRECT_URI}`,
        302
      );
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: env.GH_CLIENT_ID,
          client_secret: env.GH_CLIENT_SECRET,
          code,
          redirect_uri: env.REDIRECT_URI,
        }),
      });
      
      const data = await tokenResp.json();

      const responseBody = renderBody({
        token: data.access_token,
        provider: 'github',
        status: 'success',
      });

      return new Response(responseBody, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

