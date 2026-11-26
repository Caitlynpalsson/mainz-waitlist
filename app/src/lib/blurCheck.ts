/** Native builds skip the blur number. Size and compression still apply. */
export async function blurVariance(_uri: string): Promise<number | null> {
  return null;
}
