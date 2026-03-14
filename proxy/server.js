/**
 * OpenAI API 代理服务器
 * 部署在可访问 OpenAI 的服务器上（如海外 VPS、开 VPN 的电脑）
 * 用法: node server.js
 * 需设置环境变量 OPENAI_API_KEY
 */
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('请设置环境变量 OPENAI_API_KEY');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/v1/')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
  };
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  const options = {
    hostname: 'api.openai.com',
    path: req.url,
    method: 'POST',
    headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error('代理请求失败:', e.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`代理已启动: http://0.0.0.0:${PORT}`);
  console.log('在 .env 中设置: EXPO_PUBLIC_OPENAI_BASE_URL=http://你的服务器IP:' + PORT);
});
