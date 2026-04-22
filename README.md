# Quiver It CEP / Illustrator 内部描摹插件

Quiver It CEP is an internal Adobe Illustrator CEP panel that sends a local image to the QuiverIt API and converts it into editable SVG paths inside Illustrator.

Quiver It CEP 是一个内部使用的 Adobe Illustrator 插件面板，用于把图片交给 QuiverIt API 做线条结构识别和精准路径描摹，然后把返回的 SVG 插入到 Illustrator 画布中，成为可继续编辑的矢量路径。

> Internal use only. This tool spends QuiverIt API credits and requires a valid internal API key.
>
> 仅供内部使用。这个插件会消耗 QuiverIt API credits，需要有效的内部 API key。

## Features / 功能

- Choose a local image from the CEP panel.
- Send the image to the QuiverIt SVG vectorization API.
- Select the vectorization model: `Arrow 1.1`, `Arrow 1.1 Max`, or `Arrow 1.0`.
- Preview the returned SVG inside the panel.
- Insert the traced SVG into the active Illustrator document.
- Store the API key locally in CEP `localStorage`; no API key is committed to the repository.

- 从插件面板中选择本地图片。
- 调用 QuiverIt SVG vectorization API。
- 支持选择模型：`Arrow 1.1`、`Arrow 1.1 Max`、`Arrow 1.0`。
- 在面板内预览返回的 SVG。
- 将描摹结果插入当前 Illustrator 文档。
- API key 只保存在本机 CEP `localStorage`，不会提交到仓库。

## Installation / 安装

Clone or copy this repository into the Adobe CEP extensions directory:

将本仓库复制或克隆到 Adobe CEP 扩展目录：

```text
Windows:
%APPDATA%\Adobe\CEP\extensions\com.daftlamb.quiverit

macOS:
~/Library/Application Support/Adobe/CEP/extensions/com.daftlamb.quiverit
```

The expected structure is:

目录结构应类似：

```text
com.daftlamb.quiverit/
  CSXS/
    manifest.xml
  css/
    style.css
  js/
    csinterface.js
    main.js
  jsx/
    host.jsx
  index.html
```

If unsigned CEP extensions are disabled, enable CEP debug mode for your Illustrator/CEP version before launching Illustrator.

如果 Illustrator 无法识别未签名 CEP 插件，需要先开启对应 CEP 版本的 debug mode。

## Usage / 使用方法

1. Open Adobe Illustrator.
2. Go to `Window > Extensions > Quiver It`.
3. Paste the internal QuiverIt API key into the API field and click `Save`.
4. Click `Choose Image` and select an image.
5. Pick a model in the `Vectorize` section.
6. Click `Trace with QuiverIt`.
7. Check the SVG preview.
8. Click `Insert into Illustrator` to place the traced vector paths into the active document.

1. 打开 Adobe Illustrator。
2. 从 `窗口 > 扩展功能 > Quiver It` 打开插件。
3. 在 API 区域输入内部 QuiverIt API key，并点击 `Save`。
4. 点击 `Choose Image` 选择图片。
5. 在 `Vectorize` 区域选择模型。
6. 点击 `Trace with QuiverIt` 开始描摹。
7. 在面板中检查 SVG 预览。
8. 点击 `Insert into Illustrator`，将结果插入当前文档。

## API Notes / API 说明

The panel calls:

插件当前调用：

```text
GET  https://api.quiver.ai/v1/models
POST https://api.quiver.ai/v1/svgs/vectorizations
```

The image payload is sent as a data URL first. If the API rejects that image format, the panel retries with raw base64.

图片会优先以 data URL 形式发送；如果接口返回图片格式无效，面板会自动改用纯 base64 再试一次。

## Development / 开发

Main files:

主要文件：

- `CSXS/manifest.xml` - CEP extension manifest and Illustrator panel registration.
- `index.html` - Panel layout.
- `css/style.css` - Panel styling, aligned with the Blob It / Lace It plugin visual language.
- `js/main.js` - CEP panel logic, API calls, image preview, SVG preview, and Illustrator insertion trigger.
- `js/csinterface.js` - CEP `CSInterface` bridge.
- `jsx/host.jsx` - Illustrator ExtendScript host code for importing the SVG into the active document.

After editing files in the repo, copy the updated files into the installed CEP extension directory and restart Illustrator, or reload the CEP panel if your environment supports it.

修改仓库文件后，需要同步到 CEP 安装目录，并重启 Illustrator，或在支持的环境中刷新 CEP 面板。

## Security / 安全注意

- Do not commit real API keys.
- Do not distribute this panel publicly without removing internal API access.
- API keys are stored in local browser storage used by the CEP panel, so this should be treated as a trusted-machine internal tool.

- 不要提交真实 API key。
- 不要在未移除内部 API 访问能力的情况下公开分发插件。
- API key 保存在 CEP 面板的本地浏览器存储中，因此这个工具应只用于可信任的内部机器。

## Status / 当前状态

This is an early internal workflow plugin. The core path is working:

当前是早期内部工作流版本，核心链路已经跑通：

```text
Choose image -> QuiverIt vectorization -> SVG preview -> Insert into Illustrator
```

Future improvements may include better inserted-object naming, automatic scaling presets, batch tracing, and a more polished shared UI system across the Daftlamb Illustrator plugin family.

后续可继续优化插入对象命名、自动缩放预设、批量描摹，以及和 Daftlamb Illustrator 插件系列统一的 UI 系统。
