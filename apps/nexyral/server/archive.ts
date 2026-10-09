// USTAR with fixed safe paths; no executable archive hooks or external tools.
export function sourceArchive(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9._/-]{1,99}$/.test(path) || path.startsWith("/") || path.split("/").some((part) => !part || part === "..")) throw new Error("Invalid archive path");
    const bytes = Buffer.from(content);
    const header = Buffer.alloc(512);
    const octal = (value: number, length: number) => value.toString(8).padStart(length - 1, "0") + "\0";
    header.write(path, 0, 100); header.write(octal(0o644, 8), 100); header.write(octal(0, 8), 108); header.write(octal(0, 8), 116);
    header.write(octal(bytes.length, 12), 124); header.write(octal(0, 12), 136); header.fill(32, 148, 156); header.write("0", 156);
    header.write("ustar\0", 257); header.write("00", 263);
    header.write([...header].reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0") + "\0 ", 148);
    blocks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}
