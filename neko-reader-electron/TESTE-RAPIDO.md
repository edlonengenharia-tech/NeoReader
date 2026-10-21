# 🧪 Guia de Teste Rápido - NekoReader

## ✅ Correções Aplicadas

Foram corrigidos 4 erros de sintaxe no `main.js`:
- Linha 145: readCBZ - adicionado ``
- Linha 182: readCBR - adicionado ``
- Linha 216: book:open - adicionado ``
- Linha 315: ai:ask - adicionado ``

## 🚀 Teste Rápido (3 passos)

### 1️⃣ Iniciar o app
```cmd
cd neko-reader-electron
npm start
```

### 2️⃣ Testar PDF
- Arraste um arquivo `.pdf` para a janela
- ✅ Deve abrir e mostrar as páginas

### 3️⃣ Testar CBZ/CBR
- Arraste um arquivo `.cbz` ou `.cbr` para a janela
- ✅ Deve abrir e mostrar as páginas

## 📋 Checklist de Testes

### Teste 1: Abrir PDF
- [ ] Arrastar arquivo .pdf
- [ ] Verificar se as páginas aparecem
- [ ] Testar navegação (← →)
- [ ] Testar zoom (Ctrl + Scroll)

### Teste 2: Abrir CBZ
- [ ] Arrastar arquivo .cbz
- [ ] Verificar se as páginas aparecem
- [ ] Testar navegação (← →)
- [ ] Testar modo mangá (M)

### Teste 3: Abrir CBR
- [ ] Arrastar arquivo .cbr
- [ ] Verificar se as páginas aparecem
- [ ] Testar navegação (← →)
- [ ] Testar página dupla (D)

### Teste 4: Interface
- [ ] Biblioteca lateral aparece
- [ ] Botão "Continuar lendo" funciona
- [ ] Tela cheia funciona (F)
- [ ] Opções abrem (⚙)

## ⚠️ Se Algum Teste Falhar

### Erro: "App threw an error during load"
**Solução:** Verifique se o `main.js` tem as chaves `` corretas

### Erro: "Formato não suportado"
**Solução:** Verifique a extensão do arquivo (.pdf, .cbz, .cbr, .zip, .rar)

### Erro: "Cannot find module"
**Solução:** Execute `npm install` para instalar dependências

### Erro: "undefined" ao abrir CBR
**Solução:** O arquivo pode ser RAR5. Converta para CBZ com 7-Zip.

## 🔍 Debug Avançado

### Ver logs do console
```cmd
npm start
```
Depois pressione `Ctrl + Shift + I` para abrir o DevTools

### Verificar dependências
```cmd
npm list adm-zip
npm list node-unrar-js
npm list pdfjs-dist
```

### Reinstalar tudo
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

## 📞 Precisa de Ajuda?

Se algum teste falhar:
1. Abra o DevTools (`Ctrl + Shift + I`)
2. Vá na aba "Console"
3. Copie a mensagem de erro completa
4. Me envie com a descrição do problema

---

**Status:** Todas as funções de leitura foram corrigidas e devem funcionar!
