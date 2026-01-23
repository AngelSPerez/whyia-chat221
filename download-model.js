// download-model.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = 'SmolLM2-360M-Instruct';
const BASE_URL = `https://huggingface.co/HuggingFaceTB/${MODEL}/resolve/main`;

const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'generation_config.json',
  'special_tokens_map.json',
  'onnx/model_quantized.onnx'
];

const OUTPUT_DIR = path.join(__dirname, 'models', MODEL);

// Crear directorios
fs.mkdirSync(path.join(OUTPUT_DIR, 'onnx'), { recursive: true });

// Verificar si ya existe
function fileExists(filepath) {
  try {
    return fs.existsSync(filepath) && fs.statSync(filepath).size > 0;
  } catch {
    return false;
  }
}

// Descargar con reintentos
function downloadFile(url, dest, retries = 3) {
  return new Promise((resolve, reject) => {
    // Si ya existe, skip
    if (fileExists(dest)) {
      console.log(`✅ ${path.basename(dest)} ya existe (skip)`);
      return resolve();
    }

    console.log(`📥 Descargando ${path.basename(dest)}...`);
    
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Seguir redirección
        https.get(response.headers.location, (redirectResponse) => {
          handleDownload(redirectResponse, file, dest, resolve, reject);
        }).on('error', (err) => handleError(err, dest, url, retries, resolve, reject));
      } else {
        handleDownload(response, file, dest, resolve, reject);
      }
    }).on('error', (err) => handleError(err, dest, url, retries, resolve, reject));
  });
}

function handleDownload(response, file, dest, resolve, reject) {
  const total = parseInt(response.headers['content-length'], 10);
  let downloaded = 0;
  let lastPercent = 0;
  
  response.on('data', (chunk) => {
    downloaded += chunk.length;
    if (total) {
      const percent = Math.floor((downloaded / total) * 100);
      if (percent > lastPercent && percent % 10 === 0) {
        process.stdout.write(`\r   ${percent}% completado`);
        lastPercent = percent;
      }
    }
  });
  
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log(`\r✅ ${path.basename(dest)} completado          `);
    resolve();
  });
  
  file.on('error', (err) => {
    fs.unlink(dest, () => {});
    reject(err);
  });
}

function handleError(err, dest, url, retries, resolve, reject) {
  fs.unlink(dest, () => {});
  
  if (retries > 0) {
    console.log(`\n⚠️  Error, reintentando... (${retries} intentos restantes)`);
    setTimeout(() => {
      downloadFile(url, dest, retries - 1).then(resolve).catch(reject);
    }, 2000);
  } else {
    reject(err);
  }
}

// Descargar todos
async function downloadAll() {
  console.log(`\n🤖 Descargando SmolLM2-360M-Instruct\n`);
  console.log(`📂 Destino: ${OUTPUT_DIR}\n`);
  
  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    const dest = path.join(OUTPUT_DIR, file);
    
    try {
      await downloadFile(url, dest);
    } catch (error) {
      console.error(`\n❌ Error descargando ${file}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 ¡Modelo descargado completamente!\n');
}

downloadAll().catch((err) => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
