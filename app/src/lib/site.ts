export const SITE_ORIGIN = 'https://themaincoursemarket.com';
export const SITE_NAME = 'the main course';
export const SITE_SHORT = 'main';

export function shareLine(name: string, path: string): string {
  return `${name} on the main course. ${SITE_ORIGIN}${path}`;
}
