export function buildShuffleQueue(itemIds: string[]): string[] {
  const queue = [...itemIds];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex]!, queue[index]!];
  }
  return queue;
}
