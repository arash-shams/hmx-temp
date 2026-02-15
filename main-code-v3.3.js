export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const KV = env.SHM_DATA || env.HMX_DATA;

    let site = {
      name: hostname.includes("hmx") ? "HMX Digital" : "SHM Intelligence",
      primary: hostname.includes("hmx") ? "#00d4ff" : "#00ff88",
      logo: hostname.includes("hmx") ? "HMX" : "SHM",
      contact_tg: "@HoushangMousavi",
      contact_mail: hostname.includes("hmx") ? "hmxsh.official@gmail.com" : "shmsh.official@gmail.com"
    };

    function generateVIPCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      const length = Math.floor(Math.random() * 3) + 8;
      for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return site.logo + "-" + result;
    }

    async function addLog(type, data) {
      const key = `logs:${type}`;
      let logs = await KV.get(key, { type: "json" }) || [];
      logs.unshift({ ...data, time: new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) });
      if (logs.length > 500) logs.pop();
      await KV.put(key, JSON.stringify(logs));
    }

    if (url.pathname === '/submit-purchase' && request.method === 'POST') {
      try {
        const { email, tx } = await request.json();
        const subCode = generateVIPCode();
        await KV.put(`code:${subCode}`, JSON.stringify({ status: "temporary", user_email: email, tx: tx, device: null }));
        await addLog("sales", { buyer: email, code: subCode, tx: tx });
        return new Response(JSON.stringify({ success: true, code: subCode }), { headers: {'Content-Type': 'application/json'} });
      } catch (e) { return new Response("Error", { status: 400 }); }
    }

    if (url.pathname === '/auth-vip' && request.method === 'POST') {
      try {
        const { token } = await request.json();
        const ua = request.headers.get('user-agent') || 'unknown';
        const dataRaw = await KV.get(`code:${token}`);
        if (!dataRaw) return new Response(JSON.stringify({ success: false }), { status: 403 });
        let data = JSON.parse(dataRaw);
        if (data.status === "blocked" || (data.device && data.device !== ua)) return new Response(JSON.stringify({ success: false, msg: "Device Lock" }), { status: 403 });
        if (!data.device) { data.device = ua; await KV.put(`code:${token}`, JSON.stringify(data)); }
        await addLog("access", { user_id: token, code: token, device: ua });
        return new Response(JSON.stringify({ success: true, config: `vless://${site.logo.toLowerCase()}@${hostname}:443` }), { headers: {'Content-Type': 'application/json'} });
      } catch (e) { return new Response("Error", { status: 400 }); }
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${site.name}</title>
        <style>
            :root { --primary: ${site.primary}; }
            body { margin:0; font-family:'Segoe UI', sans-serif; color:white; text-align:center; background: url('background.jpg') center/cover fixed no-repeat #0a0a0a; min-height:100vh; transition: 0.3s; }
            .glass { background: rgba(0,0,0,0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 30px; padding: 40px; margin: 40px auto; max-width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            button { width:100%; padding:15px; margin:10px 0; border-radius:15px; border:none; cursor:pointer; font-weight:bold; background:var(--primary); color:#000; font-size:1rem; transition: 0.3s; }
            input { width:100%; padding:12px; margin:10px 0; border-radius:12px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:white; text-align:center; box-sizing: border-box; }
            .audio-player { position:fixed; bottom:20px; left:20px; display:flex; align-items:center; gap:10px; z-index:1000; }
            .audio-btn { width:50px; height:50px; background:rgba(0,0,0,0.4); border:2px solid var(--primary); border-radius:50%; cursor:pointer; color:var(--primary); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px var(--primary); }
            .btn-lang { position:fixed; top:20px; right:20px; padding:8px 15px; background:rgba(0,0,0,0.5); border:1px solid var(--primary); color:white; border-radius:20px; cursor:pointer; }
            .contact-info { margin-top: 20px; font-size: 0.85rem; opacity: 0.7; }
            .contact-info a { color: var(--primary); text-decoration: none; margin: 0 8px; font-weight: bold; }
            .hidden { display:none !important; }
        </style>
    </head>
    <body>
        <button class="btn-lang" onclick="toggleLang()">馃寪 <span id="langText">賮丕乇爻蹖</span></button>
        <div id="landing" class="glass">
            <h1 id="title">${site.name}</h1>
            <p id="desc">Secure Proxy & Cyber Intelligence</p>
            <button onclick="showScreen('login')" id="btnL">VIP Access</button>
            <button onclick="showScreen('buy')" id="btnB" style="background:#fff">Purchase Token</button>
            <div class="contact-info">
                <span id="contactTxt">Contact:</span> 
                <a href="https://t.me/${site.contact_tg.replace('@','')}" target="_blank">Telegram</a> | 
                <a href="mailto:${site.contact_mail}">Email</a>
            </div>
        </div>
        <div id="buy" class="glass hidden">
            <h2 id="buyTitle">Purchase Subscription</h2>
            <input type="email" id="bEmail" placeholder="Your Email">
            <input type="text" id="bTx" placeholder="Transaction TX Hash">
            <button onclick="submitBuy()" id="btnSubmit">Submit Request</button>
            <button onclick="showScreen('landing')" style="background:none; color:white;">Back</button>
        </div>
        <div id="login" class="glass hidden">
            <h2 id="loginTitle">VIP Login</h2>
            <input type="text" id="vToken" placeholder="Token (${site.logo}-XXXXXX)">
            <button onclick="authVIP()" id="btnAuth">Activate</button>
            <div id="vip-res" class="hidden" style="margin-top:15px; border:1px dashed var(--primary); padding:10px;"><code id="config-out" style="word-break:break-all; font-size:11px;"></code></div>
            <button onclick="showScreen('landing')" style="background:none; color:white;">Back</button>
        </div>
        <div class="audio-player">
            <div class="audio-btn" onclick="toggleMusic()"><span id="musicIcon">馃攰</span></div>
        </div>
        <audio id="player"></audio>
        <script>
            let currentLang = 'en';
            const playlist = ['music1.mp3', 'music2.mp3', 'music3.mp3', 'music4.mp3', 'music5.mp3'];
            let currentTrack = 0;
            const audio = document.getElementById('player');
            function loadTrack(idx) { audio.src = playlist[idx]; audio.load(); }
            audio.onended = () => { currentTrack = (currentTrack + 1) % playlist.length; loadTrack(currentTrack); audio.play(); };
            function toggleMusic() {
                if(audio.paused) { if(!audio.src) loadTrack(currentTrack); audio.play(); document.getElementById('musicIcon').innerText = "馃攰"; }
                else { audio.pause(); document.getElementById('musicIcon').innerText = "馃攪"; }
            }
            const trans = {
                en: { title: "${site.name}", desc: "Secure Proxy & Cyber Intelligence", btnL: "VIP Access", btnB: "Purchase Token", contactTxt: "Contact:", buyTitle: "Purchase Subscription", btnSubmit: "Submit Request", loginTitle: "VIP Login", btnAuth: "Activate", langText: "賮丕乇爻蹖", dir: "ltr" },
                fa: { title: "${site.name} 賴賵卮賲賳丿", desc: "倬乇賵讴爻蹖 丕賲賳 賵 丿乇诏丕賴 賴賵卮 爻丕蹖亘乇蹖", btnL: "賵乇賵丿 讴丕乇亘乇丕賳 賵蹖跇賴", btnB: "禺乇蹖丿 丕卮鬲乇丕讴", contactTxt: "丕乇鬲亘丕胤 亘丕 賲丕:", buyTitle: "禺乇蹖丿 丕卮鬲乇丕讴 噩丿蹖丿", btnSubmit: "孬亘鬲 丿乇禺賵丕爻鬲", loginTitle: "賵乇賵丿 VIP", btnAuth: "賮毓丕賱鈥屫池ж槽�", langText: "English", dir: "rtl" }
            };
            function toggleLang() {
                currentLang = currentLang === 'en' ? 'fa' : 'en';
                const t = trans[currentLang];
                Object.keys(t).forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = t[id]; });
                document.body.dir = t.dir;
            }
            function showScreen(id) { document.querySelectorAll('.glass').forEach(g => g.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
            async function submitBuy() {
                const email = document.getElementById('bEmail').value;
                const tx = document.getElementById('bTx').value;
                const res = await fetch('/submit-purchase', { method: 'POST', body: JSON.stringify({ email, tx }) });
                const d = await res.json();
                alert("Your Code: " + d.code);
            }
            async function authVIP() {
                const token = document.getElementById('vToken').value;
                const res = await fetch('/auth-vip', { method: 'POST', body: JSON.stringify({ token }) });
                const d = await res.json();
                if(d.success) { document.getElementById('vip-res').classList.remove('hidden'); document.getElementById('config-out').innerText = d.config; }
                else alert("Invalid Token");
            }
        </script>
    </body>
    </html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }
};
