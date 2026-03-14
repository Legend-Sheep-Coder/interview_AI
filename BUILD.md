# 打包手机安装包说明

## 方式一：EAS 云端构建（推荐，无需安装 Java）

Expo 提供云端构建服务，无需本地配置 Android 开发环境。

### 步骤

1. **安装 EAS CLI**（若未安装）
   ```bash
   npm install -g eas-cli
   ```

2. **登录 Expo 账号**
   ```bash
   eas login
   ```
   - 若无账号，请先到 [expo.dev](https://expo.dev) 免费注册

3. **构建 Android APK**
   ```bash
   eas build --platform android --profile production
   ```

4. **下载安装包**
   - 构建完成后，终端会输出下载链接
   - 也可在 [expo.dev](https://expo.dev) 登录后，在项目构建记录中下载 APK

### 快捷命令

```bash
npm run build:android
```

---

## 方式二：本地构建（需安装 JDK 和 Android SDK）

若希望本地构建，需先安装：

1. **JDK 17**
   - 下载：https://adoptium.net/
   - 安装后设置环境变量 `JAVA_HOME`

2. **Android SDK**
   - 通过 Android Studio 安装，或单独安装命令行工具

3. **执行构建**
   ```bash
   npx expo prebuild --platform android --clean
   cd android && ./gradlew assembleRelease
   ```
   - APK 输出路径：`android/app/build/outputs/apk/release/app-release.apk`

---

## 构建配置说明

- **eas.json**：EAS 构建配置，`production` 和 `preview` 均输出 APK 格式
- **app.config.js**：应用配置，包名 `com.interview.quiz`
