import { useClipboard, type UseClipboardReturn } from '@vueuse/core';

export const useCopyToClipboard = (): UseClipboardReturn<false> => useClipboard({ legacy: true });
