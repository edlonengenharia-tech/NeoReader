# 🎯 INSTRUÇÕES RÁPIDAS - NekoReader

## ✅ O que foi corrigido

1. **Erro de sintaxe** no main.js (faltava `data:`)
2. **Erro ao ler CBR** (usando API errada do node-unrar-js)
3. **Erro ao gerar EXE** (symbolic links do macOS)

## 🚀 PASSO A PASSO PARA GERAR O EXE

### 1️⃣ Limpar cache do electron-builder
Abra o CMD e execute:
```cmd
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
```

### 2️⃣ Ir para a pasta do projeto
```cmd
cd C:\Users\Usuario\Downloads\workspace\neko-reader-electron
```

### 3️⃣ Limpar e reinstalar dependências
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### 4️⃣ Testar o app (opcional)
```cmd
npm start
```
Teste abrir arquivos PDF, CBZ e CBR. Se funcionar, continue.

### 5️⃣ Gerar o EXE
**Opção A - Usando o script (recomendado):**
```cmd
BUILD-PORTABLE.cmd
```

**Opção B - Manualmente:**
```cmd
set CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --win portable --x64
```

### 6️⃣ Verificar o EXE
O arquivo será gerado em: `dist\NekoReader-portable.exe`

## ⚠️ SE AINDA DER ERRO AO GERAR EXE

### Solução 1: Executar como Administrador
1. Clique com botão direito no `BUILD-PORTABLE.cmd`
2. Selecione "Executar como administrador"

### Solução 2: Gerar pasta em vez de EXE único
```cmd
npx electron-builder --win dir --x64
```
Isso gera uma pasta `dist\win-unpacked` com todos os arquivos. Você pode criar um ZIP dessa pasta.

### Solução 3: Verificar espaço em disco
O build precisa de pelo menos 2GB de espaço livre.

## 📦 FORMATOS SUPORTADOS

✅ **PDF** - Via pdfjs-dist  
✅ **CBZ/ZIP** - Via adm-zip  
✅ **CBR/RAR** - Via node-unrar-js  
❌ **CBT/TAR** - Não suportado (converta para CBZ)

## 🧪 TESTAR O APP

```cmd
npm start
```

Arraste arquivos para a janela:
- PDF ✅
- CBZ ✅
- CBR ✅

## 📝 ARQUIVOS CORRIGIDOS

- ✅ `src/main.js` - Sintaxe corrigida + CBR funcionando
- ✅ `package.json` - Desativada assinatura de código
- ✅ `BUILD-PORTABLE.cmd` - Limpa cache automaticamente

## 🆘 PROBLEMAS COMUNS

**"electron not found"**
```cmd
npm install
npx electron .
```

**"Cannot find module 'node-unrar-js'"**
```cmd
npm install node-unrar-js
```

**"Formato não suportado: .cbr"**
Certifique-se de usar o `main.js` atualizado.

**EXE não gera**
Execute o CMD como Administrador ou use `npx electron-builder --win dir`.

---

## 🎉 RESUMO

Agora o app:
- ✅ Lê PDF, CBZ e CBR
- ✅ Não usa dependências nativas problemáticas
- ✅ Pode gerar EXE portátil (se executar como Admin)

Se tiver mais problemas, me envie o erro completo!
