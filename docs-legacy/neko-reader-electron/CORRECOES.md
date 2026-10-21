# 🔧 Correções Aplicadas - NekoReader v2

## ✅ Problemas Corrigidos

### 1. Erro de Sintaxe no main.js
**Problema:** Faltava a chave `data:` nas funções `readCBZ` e `readCBR`

**Correção:** Adicionado `data:` antes das expressões base64
```javascript
// ❌ Errado
entry.getData().toString('base64'),

// ✅ Correto
data: entry.getData().toString('base64'),
```

### 2. Erro ao Ler CBR/RAR
**Problema:** Usando `createExtractorFromFile` que não retorna `extraction` nos arquivos

**Correção:** Mudado para `createExtractorFromData` com ArrayBuffer
```javascript
// ❌ Errado (extraction é undefined)
const extractor = await createExtractorFromFile({ filepath: filePath });

// ✅ Correto (extraction contém os dados)
const fileBuffer = fs.readFileSync(filePath);
const arrayBuffer = fileBuffer.buffer.slice(...);
const extractor = await createExtractorFromData({ data: arrayBuffer });
```

### 3. Erro ao Gerar EXE (Symbolic Links do macOS)
**Problema:** electron-builder tenta criar symbolic links do macOS no Windows, causando erro de permissão

**Correção:** 
- Adicionado `"signAndEditExecutable": false` no `package.json`
- Script atualizado para limpar cache do winCodeSign
- Variável de ambiente `CSC_IDENTITY_AUTO_DISCOVERY=false` para desativar assinatura

### 4. Suporte a CBR/RAR
**Adicionado:** Leitura de arquivos .cbr/.rar usando `node-unrar-js` (pure JavaScript, sem dependências nativas)

## 📦 Formatos Suportados

| Formato | Biblioteca | Status |
|---------|-----------|--------|
| `.cbz` / `.zip` | adm-zip | ✅ Funcionando |
| `.cbr` / `.rar` | node-unrar-js | ✅ Funcionando |
| `.pdf` | pdfjs-dist | ✅ Funcionando |
| `.cbt` / `.tar` | - | ❌ Não suportado (converta para CBZ) |

## 🚀 Como Gerar o EXE

### Passo 1: Limpar cache (se necessário)
```cmd
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
```

### Passo 2: Instalar dependências
```cmd
npm install
```

### Passo 3: Gerar EXE
```cmd
BUILD-PORTABLE.cmd
```

Ou manualmente:
```cmd
set CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --win portable --x64
```

### Passo 4: Verificar o EXE
O arquivo será gerado em: `dist\NekoReader-portable.exe`

## ⚠️ Se Ainda Der Erro ao Gerar EXE

### Opção 1: Executar como Administrador
1. Clique com botão direito no `BUILD-PORTABLE.cmd`
2. Selecione "Executar como administrador"

### Opção 2: Desativar assinatura completamente
Edite o `package.json` e adicione:
```json
"build": {
  "win": {
    "signAndEditExecutable": false,
    "sign": null
  }
}
```

### Opção 3: Usar target "dir" em vez de "portable"
```cmd
npx electron-builder --win dir --x64
```
Isso gera uma pasta `dist\win-unpacked` com todos os arquivos (não é um único EXE, mas funciona).

### Opção 4: Verificar espaço em disco
O build precisa de pelo menos 2GB de espaço livre.

## 🧪 Como Testar o App

### Testar sem gerar EXE
```cmd
npm start
```

Ou:
```cmd
npx electron .
```

### Testar formatos
1. **PDF:** Arraste um arquivo .pdf para a janela
2. **CBZ:** Arraste um arquivo .cbz ou .zip
3. **CBR:** Arraste um arquivo .cbr ou .rar

## 📝 Notas Importantes

- **Zero dependências nativas:** Não precisa de GTK, cairo, ou compilação C++
- **PDF renderizado no browser:** Usa canvas HTML5 nativo do Chromium
- **CBR/RAR em pure JS:** Usa WebAssembly via node-unrar-js
- **EXE portátil:** Um único arquivo que pode ser levado no pendrive

## 🆘 Problemas Comuns

### "Cannot find module 'node-unrar-js'"
```cmd
npm install node-unrar-js
```

### "electron not found"
```cmd
npm install
npx electron .
```

### "Formato não suportado: .cbr"
Certifique-se de usar a versão atualizada do `main.js` com suporte a CBR.

### EXE muito grande (~150MB)
É normal. O portable inclui o runtime Electron completo.

### App não abre arquivo compactado
Verifique se o arquivo não está corrompido. Para RAR5, converta para CBZ usando 7-Zip.

## 📞 Precisa de Ajuda?

Se tiver problemas:
1. Verifique se o Node.js está na versão 18+ (`node --version`)
2. Delete `node_modules` e `package-lock.json` e rode `npm install` novamente
3. Limpe o cache do electron-builder (veja Passo 1 acima)
4. Execute o CMD como Administrador

## 🎉 Pronto!

Agora você tem um leitor de mangás/HQ/PDF portátil para Windows, com suporte completo a CBZ, CBR e PDF, sem dependências nativas problemáticas!
