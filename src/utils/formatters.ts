/**
 * 将字节大小转换为人类可读的格式
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
export function bytesToSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * 格式化日期时间
 * @param date 日期对象或时间戳
 * @returns 格式化后的日期时间字符串，如 "2023-01-01 12:30:45"
 */
export function formatDateTime(date: Date | number): string {
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 截断文本，超出长度添加省略号
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * 格式化文件大小（与bytesToSize功能相同，为保持兼容性添加）
 * @param size 文件大小（字节）
 * @param decimals 小数位数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(size: number, decimals: number = 2): string {
  return bytesToSize(size, decimals);
}
