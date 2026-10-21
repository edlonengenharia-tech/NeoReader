// Teste de sintaxe do main.js
const fs = require('fs');
const path = require('path');

try {
  const mainPath = path.join(__dirname, 'src', 'main.js');
  const mainContent = fs.readFileSync(mainPath, 'utf-8');
  
  // Tenta compilar o código
  new Function(mainContent);
  
  console.log('✅ Sintaxe do main.js está correta!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro de sintaxe no main.js:');
  console.error(error.message);
  process.exit(1);
}
