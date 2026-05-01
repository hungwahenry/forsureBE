export const ChatEvents = {
  MessageNew: 'chat.message.new',
  MessageDeleted: 'chat.message.deleted',
  MemberRemoved: 'chat.member.removed',
  ActivityUpdated: 'chat.activity.updated',
} as const;

export const chatRoom = (activityId: string) => `chat:${activityId}`;
