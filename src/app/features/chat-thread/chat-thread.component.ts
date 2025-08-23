import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ChatMessage } from '../../services/main-share/models/chat-message';
import { ChatRole } from '../../services/main-share/types/chat-role';


@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './chat-thread.component.html',
  styleUrls: ['./chat-thread.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatThreadComponent implements AfterViewInit, OnChanges {
  @Input() messages: ChatMessage[] = [];
  @Input() groupWindowMinutes = 5;
  @Output() retry = new EventEmitter<string>();
  @ViewChild('wrap') wrap?: ElementRef<HTMLElement>;

  groups: Array<{
    role: ChatRole;
    name?: string;
    avatarUrl?: string;
    showHeader: boolean;
    headerTime: string;
    messages: ChatMessage[];
  }> = [];

  ngAfterViewInit() { this.recompute(); this.scrollToBottom(true); }
  ngOnChanges(_: SimpleChanges) { this.recompute(); this.scrollToBottom(); }

  private recompute() {
    const arr = [...(this.messages || [])].sort((a, b) => +new Date(a.time) - +new Date(b.time));
    const groups: typeof this.groups = [];
    let prev: ChatMessage | undefined;

    for (const m of arr) {
      const sameRole = prev && prev.role === m.role;
      const closeInTime = prev && Math.abs(+new Date(m.time) - +new Date(prev.time)) <= this.groupWindowMinutes * 60 * 1000;

      if (groups.length && sameRole && closeInTime) {
        groups[groups.length - 1].messages.push(m);
      } else {
        groups.push({
          role: m.role,
          name: m.name,
          avatarUrl: m.avatarUrl,
          showHeader: m.role !== 'client',
          headerTime: this.timeOnly(m.time),
          messages: [m]
        });
      }
      prev = m;
    }
    this.groups = groups;
  }

  private scrollToBottom(force = false) {
    const el = this.wrap?.nativeElement;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (force || atBottom) {
      queueMicrotask(() => el.scrollTop = el.scrollHeight);
    }
  }

  timeOnly(d: string | Date) {
    const dt = new Date(d);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  formatBytes(bytes: number) {
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = bytes;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
  }
}
