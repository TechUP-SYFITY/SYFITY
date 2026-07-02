export type SearchResponse = {
  success: true;
  data: {
    items: Array<{
      videoId: string;
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      duration: number;
    }>;
  };
};
