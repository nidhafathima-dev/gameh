#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const audioDir = path.resolve(projectRoot, 'public', 'assets', 'audio');

console.log('\n🔮 Ouija Spirit Audio Converter');
console.log(`Scanning audio directory: ${audioDir}\n`);

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const files = fs.readdirSync(audioDir);
const mp4Files = files.filter((f) => f.toLowerCase().endsWith('.mp4'));

if (mp4Files.length === 0) {
  console.log('ℹ️  No .mp4 files found in spirit_audios/ to convert.');
  console.log('   Drop your MP4 recording into the "spirit_audios/" folder and run:');
  console.log('   npm run convert-audio\n');
  process.exit(0);
}

for (const mp4 of mp4Files) {
  const inputPath = path.join(audioDir, mp4);
  const baseName = path.parse(mp4).name;
  const outputPath = path.join(audioDir, `${baseName}.mp3`);

  console.log(`Processing: ${mp4} -> ${baseName}.mp3...`);

  let converted = false;

  // 1. Try macOS native afconvert
  try {
    execSync(`afconvert -f MPG3 -d .mp3 "${inputPath}" "${outputPath}"`, { stdio: 'inherit' });
    converted = true;
  } catch (err) {
    // 2. Try ffmpeg fallback if available
    try {
      execSync(`ffmpeg -y -i "${inputPath}" -vn -c:a libmp3lame -q:a 2 "${outputPath}"`, { stdio: 'inherit' });
      converted = true;
    } catch (ffmpegErr) {
      console.warn(`Could not convert ${mp4} to .mp3 automatically:`, ffmpegErr.message);
    }
  }

  if (converted && fs.existsSync(outputPath)) {
    console.log(`✅ Successfully extracted & converted: ${baseName}.mp3`);
  }
}

console.log('\nDone!\n');
