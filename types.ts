export type Post = {
  id?: number;
  post: string;

  schedule_time: string;
  scheduleTime?: string;

  status: string;
  publish_message: string;

  targets: PostTarget[];
};

export type PostTarget = {
  id: number;

  post_id: number;

  social_account_id: number;

  platform: string;

  status: string;

  publish_message?: string;

  account_name?: string;

  published_at?: string;
};