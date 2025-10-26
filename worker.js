// worker.js
// Minimal UVU demo: accept a password, hash it server-side, and append ONLY the hash
// to a text file served at /ntlmhashes.txt.
// Requires a KV binding named HASHES.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the simple list of hashes
    if (request.method === "GET" && url.pathname === "/ntlmhashes.txt") {
      const body = await env.HASHES.get("ntlmhashes.txt");
      return new Response(body || "", {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (request.method === "GET") {
      return new Response(renderHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST") {
      const ct = request.headers.get("content-type") || "";
      let pw = "";
      try {
        if (ct.includes("application/json")) {
          const data = await request.json();
          pw = (data.password || "").toString();
        } else {
          const form = await request.formData();
          pw = (form.get("pw") || "").toString();
        }
      } catch {
        return new Response("Bad request body.", { status: 400 });
      }

      if (!pw) {
        return new Response(renderHTML({ error: "Please enter a value." }), {
          headers: { "content-type": "text/html; charset=utf-8" },
          status: 400,
        });
      }

      // Hash server-side; do not reveal algorithm or details on the page.
      const hash = ntlmHash(pw);

      // Append ONLY the hash + newline to the KV file (no header, no metadata).
      const key = "ntlmhashes.txt";
      const existing = await env.HASHES.get(key);
      const next = (existing || "") + hash + "\n";
      await env.HASHES.put(key, next);

      // Simple thank-you
      return new Response(renderHTML({ success: true }), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

/** -------- Minimal UVU-themed HTML (no algorithm mentions) -------- */
function renderHTML(opts = {}) {
  const { success = false, error = "" } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>UVU Cybersecurity Demo — Password Submission</title>
<style>
  :root { --uvu-green:#215732; --uvu-dark:#143220; --uvu-light:#e8f1ec; --uvu-accent:#89b19a; --text:#0b1b12; --danger:#8b1e1e; }
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);background:var(--uvu-light);
       display:grid;min-height:100dvh;grid-template-rows:auto 1fr auto}
  header{background:linear-gradient(135deg,var(--uvu-green),var(--uvu-dark));color:#fff;padding:24px 16px;text-align:center;border-bottom:4px solid var(--uvu-accent)}
  header h1{margin:0 0 6px;font-size:1.6rem}
  main{display:grid;place-items:center;padding:24px 16px}
  .card{width:100%;max-width:620px;background:#fff;border-radius:14px;border:1px solid #dfe7e3;box-shadow:0 10px 24px rgba(0,0,0,.05);padding:22px}
  .banner{background:#fff7e6;border:1px solid #ffe6b3;color:#5c3d00;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:.98rem}
  .success{background:#eefaf0;border:1px solid #bfe6c8;color:#0f5a2d;border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:.95rem}
  .error{background:#fdeaea;border:1px solid #f3b3b3;color:var(--danger);border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:.95rem}
  form{display:grid;gap:14px;margin-top:8px}
  label{font-weight:600}
  input[type="password"]{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #cfd9d3;font-size:1rem;outline:none}
  input:focus{border-color:var(--uvu-green);box-shadow:0 0 0 3px rgba(33,87,50,.1)}
  button{appearance:none;border:none;cursor:pointer;border-radius:10px;padding:12px 16px;font-weight:700;font-size:1rem;color:#fff;background:var(--uvu-green)}
  footer{text-align:center;font-size:.9rem;color:#567261;padding:18px}
</style>
</head>
<body>
<header><h1>Password cracking demo</h1></header>
<main>
  <section class="card">
    ${error ? `<div class="error">❌ ${escapeHTML(error)}</div>` : ""}
    ${success ? `<div class="success">Thanks for your submission.</div>` : ""}
    <div class="banner">
      <strong>Important:</strong> Do <em>not</em> use any password you use at UVU or anywhere else.
      Submit only a brand-new, throwaway string created for this educational demonstration.
    </div>
    <form method="post" action="/" autocomplete="off" novalidate>
      <div>
        <label for="pw">Password</label>
        <input id="pw" name="pw" type="password" minlength="1" required placeholder="password" />
      </div>
      <button type="submit">Submit</button>
    </form>
  </section>
</main>
<footer>Password cracking demo</footer>
</body>
</html>`;
}

/** ---- NTLM implementation (server-side only; UI does not reference it) ---- */
function ntlmHash(input) {
  const message = stringToUtf16LeBytes(input);
  return md4(message);
}

function stringToUtf16LeBytes(str) {
  const bytes = new Uint8Array(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >>> 8;
  }
  return bytes;
}

function md4(messageBytes) {
  const length = messageBytes.length;
  const remainder = length % 64;
  const paddingLength = remainder < 56 ? 56 - remainder : 120 - remainder;
  const padded = new Uint8Array(length + paddingLength + 8);
  padded.set(messageBytes);
  padded[length] = 0x80;

  const bitLength = length * 8;
  for (let i = 0; i < 8; i++) {
    padded[padded.length - 8 + i] = (bitLength >>> (8 * i)) & 0xff;
  }

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const X = new Uint32Array(16);

  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      const k = i + j * 4;
      X[j] =
        padded[k] |
        (padded[k + 1] << 8) |
        (padded[k + 2] << 16) |
        (padded[k + 3] << 24);
    }

    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    // Round 1
    a = rotl(add3(a, F(b, c, d), X[0]), 3);
    d = rotl(add3(d, F(a, b, c), X[1]), 7);
    c = rotl(add3(c, F(d, a, b), X[2]), 11);
    b = rotl(add3(b, F(c, d, a), X[3]), 19);
    a = rotl(add3(a, F(b, c, d), X[4]), 3);
    d = rotl(add3(d, F(a, b, c), X[5]), 7);
    c = rotl(add3(c, F(d, a, b), X[6]), 11);
    b = rotl(add3(b, F(c, d, a), X[7]), 19);
    a = rotl(add3(a, F(b, c, d), X[8]), 3);
    d = rotl(add3(d, F(a, b, c), X[9]), 7);
    c = rotl(add3(c, F(d, a, b), X[10]), 11);
    b = rotl(add3(b, F(c, d, a), X[11]), 19);
    a = rotl(add3(a, F(b, c, d), X[12]), 3);
    d = rotl(add3(d, F(a, b, c), X[13]), 7);
    c = rotl(add3(c, F(d, a, b), X[14]), 11);
    b = rotl(add3(b, F(c, d, a), X[15]), 19);

    // Round 2
    a = rotl(add4(a, G(b, c, d), X[0], 0x5a827999), 3);
    d = rotl(add4(d, G(a, b, c), X[4], 0x5a827999), 5);
    c = rotl(add4(c, G(d, a, b), X[8], 0x5a827999), 9);
    b = rotl(add4(b, G(c, d, a), X[12], 0x5a827999), 13);
    a = rotl(add4(a, G(b, c, d), X[1], 0x5a827999), 3);
    d = rotl(add4(d, G(a, b, c), X[5], 0x5a827999), 5);
    c = rotl(add4(c, G(d, a, b), X[9], 0x5a827999), 9);
    b = rotl(add4(b, G(c, d, a), X[13], 0x5a827999), 13);
    a = rotl(add4(a, G(b, c, d), X[2], 0x5a827999), 3);
    d = rotl(add4(d, G(a, b, c), X[6], 0x5a827999), 5);
    c = rotl(add4(c, G(d, a, b), X[10], 0x5a827999), 9);
    b = rotl(add4(b, G(c, d, a), X[14], 0x5a827999), 13);
    a = rotl(add4(a, G(b, c, d), X[3], 0x5a827999), 3);
    d = rotl(add4(d, G(a, b, c), X[7], 0x5a827999), 5);
    c = rotl(add4(c, G(d, a, b), X[11], 0x5a827999), 9);
    b = rotl(add4(b, G(c, d, a), X[15], 0x5a827999), 13);

    // Round 3
    a = rotl(add4(a, H(b, c, d), X[0], 0x6ed9eba1), 3);
    d = rotl(add4(d, H(a, b, c), X[8], 0x6ed9eba1), 9);
    c = rotl(add4(c, H(d, a, b), X[4], 0x6ed9eba1), 11);
    b = rotl(add4(b, H(c, d, a), X[12], 0x6ed9eba1), 15);
    a = rotl(add4(a, H(b, c, d), X[2], 0x6ed9eba1), 3);
    d = rotl(add4(d, H(a, b, c), X[10], 0x6ed9eba1), 9);
    c = rotl(add4(c, H(d, a, b), X[6], 0x6ed9eba1), 11);
    b = rotl(add4(b, H(c, d, a), X[14], 0x6ed9eba1), 15);
    a = rotl(add4(a, H(b, c, d), X[1], 0x6ed9eba1), 3);
    d = rotl(add4(d, H(a, b, c), X[9], 0x6ed9eba1), 9);
    c = rotl(add4(c, H(d, a, b), X[5], 0x6ed9eba1), 11);
    b = rotl(add4(b, H(c, d, a), X[13], 0x6ed9eba1), 15);
    a = rotl(add4(a, H(b, c, d), X[3], 0x6ed9eba1), 3);
    d = rotl(add4(d, H(a, b, c), X[11], 0x6ed9eba1), 9);
    c = rotl(add4(c, H(d, a, b), X[7], 0x6ed9eba1), 11);
    b = rotl(add4(b, H(c, d, a), X[15], 0x6ed9eba1), 15);

    a = add(a, aa);
    b = add(b, bb);
    c = add(c, cc);
    d = add(d, dd);
  }

  return [a, b, c, d].map(toHex).join("");
}

function F(x, y, z) {
  return (x & y) | (~x & z);
}

function G(x, y, z) {
  return (x & y) | (x & z) | (y & z);
}

function H(x, y, z) {
  return x ^ y ^ z;
}

function add(x, y) {
  return (x + y) >>> 0;
}

function add3(x, y, z) {
  return (x + y + z) >>> 0;
}

function add4(x, y, z, w) {
  return (x + y + z + w) >>> 0;
}

function rotl(x, s) {
  return ((x << s) | (x >>> (32 - s))) >>> 0;
}

function toHex(num) {
  return [0, 8, 16, 24]
    .map((shift) => ((num >>> shift) & 0xff).toString(16).padStart(2, "0"))
    .join("");
}
function escapeHTML(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
