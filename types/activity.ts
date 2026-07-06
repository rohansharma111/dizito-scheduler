export type ActivityEvent = {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number;
  payload: any;
  created_at: string;
};

export type ActivityGroup = {
  label: string;
  events: ActivityEvent[];
};
