// worker.js
// Minimal UVU demo: accept a password, hash it server-side, and append ONLY the hash
// to a text file served at /md5hashes.txt.
// Requires a KV binding named HASHES.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the simple list of hashes
    if (request.method === "GET" && url.pathname === "/md5hashes.txt") {
      const body = await env.HASHES.get("md5hashes.txt");
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
      const hash = md5(pw);

      // Append ONLY the hash + newline to the KV file (no header, no metadata).
      const key = "md5hashes.txt";
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

/** ---- MD5 implementation (server-side only; UI does not reference it) ---- */
function md5(string){function R(l,s){return(l<<s)|(l>>>32-s)}function A(x,y){var a=(x&0x3fffffff)+(y&0x3fffffff);var b=(x&0x40000000);var c=(y&0x40000000);var d=(x&0x80000000);var e=(y&0x80000000);if(b&c)return a^0x80000000^d^e; if(b|c){if(a&0x40000000)return a^0xc0000000^d^e; else return a^0x40000000^d^e}return a^d^e}
function F(x,y,z){return(x&y)|((~x)&z)}function G(x,y,z){return(x&z)|(y&(~z))}function H(x,y,z){return x^y^z}function I(x,y,z){return y^(x|(~z))}
function FF(a,b,c,d,x,s,ac){a=A(a,A(A(F(b,c,d),x),ac));return A(R(a,s),b)}
function GG(a,b,c,d,x,s,ac){a=A(a,A(A(G(b,c,d),x),ac));return A(R(a,s),b)}
function HH(a,b,c,d,x,s,ac){a=A(a,A(A(H(b,c,d),x),ac));return A(R(a,s),b)}
function II(a,b,c,d,x,s,ac){a=A(a,A(A(I(b,c,d),x),ac));return A(R(a,s),b)}
function W(str){const m=unescape(encodeURIComponent(str));const l=m.length;const n=((l+8-(l+8)%64)/64+1)*16;const wa=new Array(n-1);let bp=0,bc=0;for(;bc<l;bc++){const wc=(bc-(bc%4))/4;bp=(bc%4)*8;wa[wc]=(wa[wc]|(m.charCodeAt(bc)<<bp))>>>0}const wc=(bc-(bc%4))/4;bp=(bc%4)*8;wa[wc]=wa[wc]|(0x80<<bp);wa[n-2]=(l<<3)>>>0;wa[n-1]=(l>>>29)>>>0;return wa}
function toHex(l){let s="";for(let i=0;i<=3;i++){const b=(l>>>(i*8))&255;s+=("0"+b.toString(16)).slice(-2)}return s}
const x=W(string);let a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;
for(let k=0;k<x.length;k+=16){const AA=a,BB=b,CC=c,DD=d;
a=FF(a,b,c,d,x[k+0],7,0xd76aa478); d=FF(d,a,b,c,x[k+1],12,0xe8c7b756);
c=FF(c,d,a,b,x[k+2],17,0x242070db); b=FF(b,c,d,a,x[k+3],22,0xc1bdceee);
a=FF(a,b,c,d,x[k+4],7,0xf57c0faf); d=FF(d,a,b,c,x[k+5],12,0x4787c62a);
c=FF(c,d,a,b,x[k+6],17,0xa8304613); b=FF(b,c,d,a,x[k+7],22,0xfd469501);
a=FF(a,b,c,d,x[k+8],7,0x698098d8); d=FF(d,a,b,c,x[k+9],12,0x8b44f7af);
c=FF(c,d,a,b,x[k+10],17,0xffff5bb1); b=FF(b,c,d,a,x[k+11],22,0x895cd7be);
a=FF(a,b,c,d,x[k+12],7,0x6b901122); d=FF(d,a,b,c,x[k+13],12,0xfd987193);
c=FF(c,d,a,b,x[k+14],17,0xa679438e); b=FF(b,c,d,a,x[k+15],22,0x49b40821);
a=GG(a,b,c,d,x[k+1],5,0xf61e2562); d=GG(d,a,b,c,x[k+6],9,0xc040b340);
c=GG(c,d,a,b,x[k+11],14,0x265e5a51); b=GG(b,c,d,a,x[k+0],20,0xe9b6c7aa);
a=GG(a,b,c,d,x[k+5],5,0xd62f105d); d=GG(d,a,b,c,x[k+10],9,0x02441453);
c=GG(c,d,a,b,x[k+15],14,0xd8a1e681); b=GG(b,c,d,a,x[k+4],20,0xe7d3fbc8);
a=GG(a,b,c,d,x[k+9],5,0x21e1cde6); d=GG(d,a,b,c,x[k+14],9,0xc33707d6);
c=GG(c,d,a,b,x[k+3],14,0xf4d50d87); b=GG(b,c,d,a,x[k+8],20,0x455a14ed);
a=GG(a,b,c,d,x[k+13],5,0xa9e3e905); d=GG(d,a,b,c,x[k+2],9,0xfcefa3f8);
c=GG(c,d,a,b,x[k+7],14,0x676f02d9); b=GG(b,c,d,a,x[k+12],20,0x8d2a4c8a);
a=HH(a,b,c,d,x[k+5],4,0xfffa3942); d=HH(d,a,b,c,x[k+8],11,0x8771f681);
c=HH(c,d,a,b,x[k+11],16,0x6d9d6122); b=HH(b,c,d,a,x[k+14],23,0xfde5380c);
a=HH(a,b,c,d,x[k+1],4,0xa4beea44); d=HH(d,a,b,c,x[k+4],11,0x4bdecfa9);
c=HH(c,d,a,b,x[k+7],16,0xf6bb4b60); b=HH(b,c,d,a,x[k+10],23,0xbebfbc70);
a=HH(a,b,c,d,x[k+13],4,0x289b7ec6); d=HH(d,a,b,c,x[k+0],11,0xeaa127fa);
c=HH(c,d,a,b,x[k+3],16,0xd4ef3085); b=HH(b,c,d,a,x[k+6],23,0x04881d05);
a=HH(a,b,c,d,x[k+9],4,0xd9d4d039); d=HH(d,a,b,c,x[k+12],11,0xe6db99e5);
c=HH(c,d,a,b,x[k+15],16,0x1fa27cf8); b=HH(b,c,d,a,x[k+2],23,0xc4ac5665);
a=II(a,b,c,d,x[k+0],6,0xf4292244); d=II(d,a,b,c,x[k+7],10,0x432aff97);
c=II(c,d,a,b,x[k+14],15,0xab9423a7); b=II(b,c,d,a,x[k+5],21,0xfc93a039);
a=II(a,b,c,d,x[k+12],6,0x655b59c3); d=II(d,a,b,c,x[k+3],10,0x8f0ccc92);
c=II(c,d,a,b,x[k+10],15,0xffeff47d); b=II(b,c,d,a,x[k+1],21,0x85845dd1);
a=II(a,b,c,d,x[k+8],6,0x6fa87e4f); d=II(d,a,b,c,x[k+15],10,0xfe2ce6e0);
c=II(c,d,a,b,x[k+6],15,0xa3014314); b=II(b,c,d,a,x[k+13],21,0x4e0811a1);
a=A(a,AA)>>>0; b=A(b,BB)>>>0; c=A(c,CC)>>>0; d=A(d,DD)>>>0;}
return (toHex(a)+toHex(b)+toHex(c)+toHex(d)).toLowerCase()}
function escapeHTML(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
