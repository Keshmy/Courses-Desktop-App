# -

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
npm install
# على شبكة شركة (شهادة SSL):
npm run install:corp
```

### Database (أول مرة)

```bash
npm run db:setup
```

يُنشئ `local.db` مع الجداول وحساب مدير افتراضي: **admin** / **admin123**

### Development

```bash
npm run dev
```

افتح التطبيق → اختر **مدير** أو **موظف** → سجّل الدخول.

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
