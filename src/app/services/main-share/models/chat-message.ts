import { ChatRole } from "../types/chat-role";
import { ChatStatus } from "../types/chat-status";
import { ChatAttachment } from "./chat-attachment";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  attachments?: ChatAttachment[];
  time: string | Date;
  status?: ChatStatus;
  name?: string;
  avatarUrl?: string;
}
