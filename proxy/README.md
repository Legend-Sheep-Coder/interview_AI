# 国内网络代理方案

## 方案一：手机开 VPN（最简单）

1. 在手机安装 VPN 应用
2. 连接 VPN
3. 打开 Expo Go 运行项目
4. 无需改任何配置

---

## 方案二：使用国内代理服务（推荐）

国内有提供 OpenAI API 中转的服务，**无需 VPN**，仅需修改配置：

1. 注册代理服务，例如：
   - [简易API](https://jeniya.cn) - 新用户有免费额度
   - [CloseAI](https://closeai.com) - 企业级
   - 其他搜索「OpenAI API 国内代理」即可找到

2. 获取代理地址和 API Key（代理商会提供）

3. 在项目 `.env` 中配置：
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=代理商给你的Key
   EXPO_PUBLIC_OPENAI_BASE_URL=https://代理商的API地址
   ```

4. 执行 `npx expo start -c` 重启

---

## 方案三：自建代理（有海外服务器时）

若你有海外 VPS（如 AWS、Vultr、腾讯云香港等）：

1. 将 `proxy/` 目录上传到服务器

2. 安装 Node.js，执行：
   ```bash
   cd proxy
   export OPENAI_API_KEY=sk-你的OpenAI的key
   node server.js
   ```

3. 确保服务器防火墙开放 3000 端口

4. 在手机端 `.env` 配置：
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-你的OpenAI的key
   EXPO_PUBLIC_OPENAI_BASE_URL=http://你的服务器公网IP:3000
   ```

5. 若用真机，手机需能访问该 IP（同一网络或服务器有公网 IP）

---

## 方案四：本机代理（电脑开 VPN + 同 WiFi）

电脑开 VPN 后，在本机运行代理，手机连同一 WiFi：

1. 电脑连接 VPN
2. 在项目目录执行：
   ```bash
   cd proxy
   set OPENAI_API_KEY=sk-你的key
   node server.js
   ```
3. 查看电脑局域网 IP（如 192.168.1.100）
4. 手机 `.env` 配置：
   ```
   EXPO_PUBLIC_OPENAI_BASE_URL=http://192.168.1.100:3000
   ```
5. 手机和电脑需在同一 WiFi
