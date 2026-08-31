import { Icon } from './Icon';
export declare class DefaultIcon extends Icon {
  static imagePath?: string;
  _getIconUrl(name: string): string;
  _stripUrl(path: string): string | null;
  _detectIconPath(): string;
}
