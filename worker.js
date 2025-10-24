// worker.js
// UVU Password Hash Demo (MD5 -> Slack)
// Notes:
// - Never logs plaintext passwords.
// - Posts only the MD5 hash (plus optional note + length) to Slack.
// - Set your Slack webhook as a secret: SLACK_WEBHOOK_URL

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(renderHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST") {
      // Accept form POSTs (application/x-www-form-urlencoded or multipart/form-data) and JSON
      const ct = request.headers.get("content-type") || "";
      let pw = "";
      let note = "";

      try {
        if (ct.includes("application/json")) {
          const data = await request.json();
          pw = (data.password || "").toString();
          note = (data.note || "").toString();
        } else {
          const form = await request.formData();
          pw = (form.get("pw") || "").toString();
          note = (form.get("note") || "").toString();
        }
      } catch (_) {
        return new Response("Bad request body.", { status: 400 });
      }

      if (!pw) {
        return new Response(renderHTML({ error: "Please enter a password." }), {
          headers: { "content-type": "text/html; charset=utf-8" },
          status: 400,
        });
      }

      // Compute MD5 in the Worker; do not persist plaintext.
      const hashed = md5(pw);

      // Build Slack message (text-only payload keeps it simple)
      const payload = {
        text:
          "🔐 *UVU Cybersecurity Demo — MD5 Submission*\n" +
          `*Hash:* \`${hashed}\`\n` +
          `*Length:* ${pw.length}\n` +
          (note ? `*Note:* ${note}\n` : "") +
          "_Reminder: This demo is educational; hashes may be cracked offline._",
      };

      // Send to Slack webhook
      const res = await fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return new Response(
          renderHTML({
            error:
              "We couldn't post to Slack (webhook error). Double-check your SLACK_WEBHOOK_URL.",
          }),
          { headers: { "content-type": "text/html; charset=utf-8" }, status: 502 }
        );
      }

      // Return the page again with a success toast, showing the resulting hash
      return new Response(renderHTML({ success: true, lastHash: hashed }), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

/** --------- Presentation HTML (UVU-themed) ---------- */
function renderHTML(opts = {}) {
  const { success = false, error = "", lastHash = "" } = opts;

  // UVU-ish palette (approximate): deep green + light accents
  // Avoids official marks; plainly labeled as a demo.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UVU Cybersecurity Demo — MD5 Hash Submission</title>
  <style>
    :root {
      --uvu-green: #215732; /* primary deep green */
      --uvu-dark:  #143220;
      --uvu-light: #e8f1ec;
      --uvu-accent:#89b19a;
      --text: #0b1b12;
      --danger:#8b1e1e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: var(--text); background: var(--uvu-light);
      display: grid; min-height: 100dvh; grid-template-rows: auto 1fr auto;
    }
    header {
      background: linear-gradient(135deg, var(--uvu-green), var(--uvu-dark));
      color: white; padding: 24px 16px; text-align: center;
      border-bottom: 4px solid var(--uvu-accent);
    }
    header h1 { margin: 0 0 6px; font-size: 1.6rem; letter-spacing: 0.3px; }
    header p { margin: 0; opacity: 0.9; }

    main { display: grid; place-items: center; padding: 24px 16px; }
    .card {
      width: 100%; max-width: 680px; background: white; border-radius: 14px;
      border: 1px solid #dfe7e3; box-shadow: 0 10px 24px rgba(0,0,0,0.05);
      padding: 22px;
    }
    .banner {
      background: #fff7e6; border: 1px solid #ffe6b3; color: #5c3d00;
      border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.98rem;
    }
    .banner strong { font-weight: 700; }
    .success {
      background: #eefaf0; border: 1px solid #bfe6c8; color: #0f5a2d;
      border-radius: 10px; padding: 10px 12px; margin-bottom: 16px; font-size: 0.95rem;
    }
    .error {
      background: #fdeaea; border: 1px solid #f3b3b3; color: var(--danger);
      border-radius: 10px; padding: 10px 12px; margin-bottom: 16px; font-size: 0.95rem;
    }
    form { display: grid; gap: 14px; margin-top: 8px; }
    label { font-weight: 600; }
    input[type="password"], input[type="text"] {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #cfd9d3;
      font-size: 1rem; outline: none;
    }
    input:focus {
      border-color: var(--uvu-green);
      box-shadow: 0 0 0 3px rgba(33,87,50,0.1);
    }
    .help {
      font-size: 0.9rem; color: #4a5a52; margin-top: -6px;
    }
    button[type="submit"] {
      appearance: none; border: none; cursor: pointer; border-radius: 10px;
      padding: 12px 16px; font-weight: 700; font-size: 1rem;
      color: white; background: var(--uvu-green);
      transition: transform 0.02s ease, filter 0.15s ease;
    }
    button[type="submit"]:hover { filter: brightness(1.05); }
    button[type="submit"]:active { transform: translateY(1px); }
    .hashbox {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      background: #f5f8f6; border: 1px dashed var(--uvu-accent);
      padding: 10px 12px; border-radius: 10px; overflow-wrap: anywhere;
    }
    footer {
      text-align: center; font-size: 0.9rem; color: #567261; padding: 18px;
    }
    .muted { opacity: 0.9; }
  </style>
</head>
<body>
  <header>
    <h1>UVU Cybersecurity Demo — MD5 Hash Submission</h1>
    <p class="muted">Educational exercise on weak hashes and password cracking</p>
  </header>

  <main>
    <section class="card" role="region" aria-label="MD5 submission panel">
      ${
        error
          ? `<div class="error" role="alert">❌ ${escapeHTML(error)}</div>`
          : success
            ? `<div class="success" role="status">✅ Submitted to Slack. ${
                lastHash
                  ? `MD5: <span class="hashbox">${lastHash}</span>`
                  : ""
              }</div>`
            : ""
      }
      <div class="banner">
        <strong>Important:</strong> Do <em>not</em> use any password you use at UVU or anywhere else.
        Anything submitted here will be <strong>hashed to MD5</strong> and may be subjected to cracking as part of this demonstration.
      </div>

      <form method="post" action="/" autocomplete="off" novalidate>
        <div>
          <label for="pw">Demo password</label>
          <input id="pw" name="pw" type="password" minlength="1" required
                 placeholder="Enter a throwaway demo password" />
          <div class="help">Use a brand-new, fake password created only for this demo.</div>
        </div>

        <div>
          <label for="note">Optional note (e.g., table/team)</label>
          <input id="note" name="note" type="text" maxlength="64" placeholder="Optional context for Slack" />
        </div>

        <button type="submit">Submit MD5 to Slack</button>
      </form>

      <p class="help" style="margin-top:14px;">
        This page does not store or log plaintext. It computes an MD5 hash server-side, sends the hash to Slack, then discards the plaintext.
      </p>
    </section>
  </main>

  <footer>
    UVU-themed demo · Built for live instruction on ${new Date().toLocaleDateString()}.
  </footer>
</body>
</html>`;
}

/** --------- Tiny MD5 (pure JS) ---------- */
/* Classic implementation using RFC 1321 steps. Adequate for demo purposes. */
function md5(string) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }

  function toWordArray(str) {
    const msg = unescape(encodeURIComponent(str)); // UTF-8
    const lMessageLength = msg.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const wordArray = new Array(lNumberOfWords - 1);
    let bytePosition = 0, byteCount = 0;

    while (byteCount < lMessageLength) {
      const wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePosition = (byteCount % 4) * 8;
      wordArray[wordCount] = (wordArray[wordCount] | (msg.charCodeAt(byteCount) << bytePosition)) >>> 0;
      byteCount++;
    }
    const wordCount = (byteCount - (byteCount % 4)) / 4;
    bytePosition = (byteCount % 4) * 8;
    wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
    wordArray[lNumberOfWords - 2] = (lMessageLength << 3) >>> 0;
    wordArray[lNumberOfWords - 1] = (lMessageLength >>> 29) >>> 0;
    return wordArray;
  }

  function toHex(lValue) {
    let str = "";
    for (let i = 0; i <= 3; i++) {
      const byte = (lValue >>> (i * 8)) & 255;
      str += ("0" + byte.toString(16)).slice(-2);
    }
    return str;
  }

  const x = toWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;

    a = FF(a,b,c,d,x[k+0], 7,0xd76aa478);  d = FF(d,a,b,c,x[k+1],12,0xe8c7b756);
    c = FF(c,d,a,b,x[k+2],17,0x242070db);  b = FF(b,c,d,a,x[k+3],22,0xc1bdceee);
    a = FF(a,b,c,d,x[k+4], 7,0xf57c0faf);  d = FF(d,a,b,c,x[k+5],12,0x4787c62a);
    c = FF(c,d,a,b,x[k+6],17,0xa8304613);  b = FF(b,c,d,a,x[k+7],22,0xfd469501);
    a = FF(a,b,c,d,x[k+8], 7,0x698098d8);  d = FF(d,a,b,c,x[k+9],12,0x8b44f7af);
    c = FF(c,d,a,b,x[k+10],17,0xffff5bb1); b = FF(b,c,d,a,x[k+11],22,0x895cd7be);
    a = FF(a,b,c,d,x[k+12], 7,0x6b901122); d = FF(d,a,b,c,x[k+13],12,0xfd987193);
    c = FF(c,d,a,b,x[k+14],17,0xa679438e); b = FF(b,c,d,a,x[k+15],22,0x49b40821);

    a = GG(a,b,c,d,x[k+1], 5,0xf61e2562);  d = GG(d,a,b,c,x[k+6], 9,0xc040b340);
    c = GG(c,d,a,b,x[k+11],14,0x265e5a51); b = GG(b,c,d,a,x[k+0],20,0xe9b6c7aa);
    a = GG(a,b,c,d,x[k+5], 5,0xd62f105d);  d = GG(d,a,b,c,x[k+10], 9,0x02441453);
    c = GG(c,d,a,b,x[k+15],14,0xd8a1e681); b = GG(b,c,d,a,x[k+4],20,0xe7d3fbc8);
    a = GG(a,b,c,d,x[k+9], 5,0x21e1cde6);  d = GG(d,a,b,c,x[k+14], 9,0xc33707d6);
    c = GG(c,d,a,b,x[k+3],14,0xf4d50d87); b = GG(b,c,d,a,x[k+8],20,0x455a14ed);
    a = GG(a,b,c,d,x[k+13], 5,0xa9e3e905); d = GG(d,a,b,c,x[k+2], 9,0xfcefa3f8);
    c = GG(c,d,a,b,x[k+7],14,0x676f02d9); b = GG(b,c,d,a,x[k+12],20,0x8d2a4c8a);

    a = HH(a,b,c,d,x[k+5], 4,0xfffa3942);  d = HH(d,a,b,c,x[k+8],11,0x8771f681);
    c = HH(c,d,a,b,x[k+11],16,0x6d9d6122); b = HH(b,c,d,a,x[k+14],23,0xfde5380c);
    a = HH(a,b,c,d,x[k+1], 4,0xa4beea44);  d = HH(d,a,b,c,x[k+4],11,0x4bdecfa9);
    c = HH(c,d,a,b,x[k+7],16,0xf6bb4b60);  b = HH(b,c,d,a,x[k+10],23,0xbebfbc70);
    a = HH(a,b,c,d,x[k+13], 4,0x289b7ec6); d = HH(d,a,b,c,x[k+0],11,0xeaa127fa);
    c = HH(c,d,a,b,x[k+3],16,0xd4ef3085);  b = HH(b,c,d,a,x[k+6],23,0x04881d05);
    a = HH(a,b,c,d,x[k+9], 4,0xd9d4d039);  d = HH(d,a,b,c,x[k+12],11,0xe6db99e5);
    c = HH(c,d,a,b,x[k+15],16,0x1fa27cf8); b = HH(b,c,d,a,x[k+2],23,0xc4ac5665);

    a = II(a,b,c,d,x[k+0], 6,0xf4292244);  d = II(d,a,b,c,x[k+7],10,0x432aff97);
    c = II(c,d,a,b,x[k+14],15,0xab9423a7); b = II(b,c,d,a,x[k+5],21,0xfc93a039);
    a = II(a,b,c,d,x[k+12], 6,0x655b59c3); d = II(d,a,b,c,x[k+3],10,0x8f0ccc92);
    c = II(c,d,a,b,x[k+10],15,0xffeff47d); b = II(b,c,d,a,x[k+1],21,0x85845dd1);
    a = II(a,b,c,d,x[k+8], 6,0x6fa87e4f);  d = II(d,a,b,c,x[k+15],10,0xfe2ce6e0);
    c = II(c,d,a,b,x[k+6], 15,0xa3014314); b = II(b,c,d,a,x[k+13],21,0x4e0811a1);

    a = AddUnsigned(a, AA) >>> 0;
    b = AddUnsigned(b, BB) >>> 0;
    c = AddUnsigned(c, CC) >>> 0;
    d = AddUnsigned(d, DD) >>> 0;
  }

  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
