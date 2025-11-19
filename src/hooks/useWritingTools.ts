export function useWritingTools() {

  function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  function countSentences(text: string): number {
    if (!text) return 0;
    return text.split(/[.!?]+/).filter(Boolean).length;
  }

  return { countWords, countSentences };
}
