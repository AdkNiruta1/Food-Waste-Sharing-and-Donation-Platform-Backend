import sharp from "sharp";
import fs from "fs";
import path from "path";

export const saveCompressedImage = async (buffer, folder, filename) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const filePath = path.join(folder, filename);

  let quality = 80;
  let outputBuffer;

  do {
    outputBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    quality -= 10;
  } while (outputBuffer.length > 5 * 1024 * 1024 && quality > 30);

  await fs.promises.writeFile(filePath, outputBuffer);

  return filePath;
};
