export type CharacterPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export type CharacterState = 'idle' | 'thinking' | 'speaking';
export type CharacterRenderer = (state: CharacterState, size: number) => unknown; // React型に依存しない

export const CHARACTER_CONFIG = {
  position: 'bottom-right' as CharacterPosition,
  size: 68,
  imageSrc: undefined as string | undefined, // 差し替えたい画像のURL/パス
  colors: {
    background: undefined as string | undefined,
    faceGradientFrom: '#ffffff',
    faceGradientTo: '#dbe9ff',
    border: '#b3ccff',
    eye: '#334155',
    mouth: '#64748b',
    dot1: '#94a3b8',
    dot2: '#b0bccd',
  },
  // 完全カスタムレンダラ（必要時に上書き）
  renderAvatar: undefined as undefined | CharacterRenderer,
};

