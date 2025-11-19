export function useWritingTools() {
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const countSentences = (text: string): number => {
    return text.split(/[.!?]+/).filter(Boolean).length;
  };

  return { countWords, countSentences };
}
