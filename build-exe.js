const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pngToIco = require('png-to-ico');

async function build() {
  const pngPath = path.join(__dirname, 'icon.png');
  const icoPath = path.join(__dirname, 'icon.ico');

  console.log('Verificando ícone...');
  if (fs.existsSync(pngPath)) {
    console.log('Convertendo icon.png para icon.ico...');
    const buf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, buf);
    console.log('Ícone convertido com sucesso!');
  } else {
    console.log('Aviso: icon.png não encontrado. O app será compilado com o ícone padrão.');
  }

  console.log('Iniciando empacotamento do executável...');
  let cmd = 'npx electron-packager . NeatOS --platform=win32 --arch=x64 --out=dist_standalone --overwrite';
  
  if (fs.existsSync(icoPath)) {
    cmd += ' --icon=icon.ico';
  }

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ Compilação concluída com sucesso!');
    console.log('Seu arquivo .exe está dentro da pasta dist_standalone/NeatOS-win32-x64');
  } catch (err) {
    console.error('Erro na compilação:', err);
  }
}

build();
