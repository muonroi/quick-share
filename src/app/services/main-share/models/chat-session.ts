import { ChatMessage } from "./chat-message";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  pinned?: boolean;
}
