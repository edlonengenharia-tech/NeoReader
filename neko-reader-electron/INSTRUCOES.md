# NekoReader - Instruções de Execução

## ⚠️ Problema com Scripts .cmd

Se os scripts `.cmd` derem erro de "'cho' não é reconhecido", use as alternativas abaixo.

## 🚀 Opção 1: Usar Scripts .bat (Recomendado)

Tente usar os arquivos `.bat` em vez de `.cmd`:

```
TESTE-NPM.bat          → Testar o app
BUILD-PORTABLE.bat     → Gerar EXE portátil
```

## 🔧 Opção 2: Executar Comandos Manualmente

Abra o **CMD** (Prompt de Comando) e execute:

### Para testar o app:
```cmd
cd C:\caminho\para\neko-reader-electron
npm install
npm start
```

### Para gerar o EXE:
```cmd
cd C:\caminho\para\neko-reader-electron
npm install
set CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --win portable --x64
```

## 📋 Opção 3: PowerShell

Se o CMD continuar dando problema, use o **PowerShell**:

```powershell
cd C:\caminho\para\neko-reader-electron
npm install
npm start
```

Para gerar o EXE:
```powershell
cd C:\caminho\para\neko-reader-electron
npm install
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npx electron-builder --win portable --x64
```

## 🆘 Se Node.js Não For Encontrado

### Verificar instalação:
```cmd
node --version
```

### Se não encontrar, tente:
```cmd
"C:\Program Files\nodejs\node.exe" --version
```

### Ou adicione ao PATH temporariamente:
```cmd
set PATH=C:\Program Files\nodejs;%PATH%
node --version
```

## ✅ Formatos Suportados

- **PDF** - Via pdfjs-dist
- **CBZ/ZIP** - Via adm-zip
- **CBR/RAR** - Via node-unrar-js

## 📞 Problemas Comuns

### "'cho' não é reconhecido"
→ Use os arquivos `.bat` ou execute comandos manualmente

### "Node.js não encontrado"
→ Verifique se está instalado em `C:\Program Files\nodejs\`

### "electron not found"
→ Execute `npm install` primeiro

### Erro ao gerar EXE
→ Execute o CMD como Administrador ou use `--win dir` em vez de `--win portable`

---

**Dica:** Se os scripts `.cmd` não funcionarem, execute os comandos manualmente no CMD ou PowerShell.
