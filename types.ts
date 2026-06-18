export type Post = {
  id?: number;
  post: string;
  platform: string;
  schedule_time: string;
  scheduleTime?: string;
  status: string;
  publish_message: string;
};

type PostTarget = {
  id: number;
  post_id: number;
  social_account_id: number;
  platform: string;
  status: string;
};