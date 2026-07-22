export type RefreshedVideoMetadata =
  | {
      status: 'available';
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      duration: number;
    }
  | { status: 'unavailable' };
