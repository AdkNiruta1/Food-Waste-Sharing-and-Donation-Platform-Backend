import sharp from "sharp";
import fs from "fs";
import path from "path";
// Utility to compress and save an image buffer to a specified folder with a given filename
export const saveCompressedImage = async (buffer, folder, filename) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
// Full file path
  const filePath = path.join(folder, filename);

  let quality = 80;
  let outputBuffer;
// Compress image iteratively to be under 5MB
  do {
    outputBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    quality -= 10;
  } while (outputBuffer.length > 5 * 1024 * 1024 && quality > 30);
// Save compressed image to disk
  await fs.promises.writeFile(filePath, outputBuffer);

  return filePath;
};
