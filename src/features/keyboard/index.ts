// Barrel export for keyboard feature module
export { KeyboardProvider } from './keyboard-provider';
export {
  useKeyboardScope,
  useRegisterShortcut,
  useCommandPalette,
  useShortcutsModal,
  useCurrentScope,
} from './keyboard-provider';
export { useKeyboardNav } from './use-keyboard-nav';
export { CommandPalette, type PaletteItem } from './command-palette';
export { ShortcutsModal, ShortcutBadge } from './shortcuts-modal';
export {
  SHORTCUTS,
  getShortcut,
  getShortcutsByScope,
  getShortcutsByCategory,
  type Shortcut,
  type ShortcutScope,
} from './shortcuts';
