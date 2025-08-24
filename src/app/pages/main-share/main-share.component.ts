import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ChatThreadComponent } from '../../features/chat-thread/chat-thread.component';
import { ChatMessage } from '../../services/main-share/models/chat-message';
import { ChatSession } from '../../services/main-share/models/chat-session';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-main-share',
  standalone: true,
  imports: [CommonModule, ChatThreadComponent, FormsModule],
  templateUrl: './main-share.component.html',
  styleUrl: './main-share.component.scss'
})
export class MainShareComponent implements OnInit {
  public fileCount = 0;
  public files: File[] = [];
  public totalSize = 0;
  public messages: ChatMessage[] = [];
  public sidebarOpen = false;
  public sidebarCollapsed = false;
  public heroTitle = 'What are you doing on quick share?';
  public heroRendered = '';
  public showCaret = true;
  private typingIdx = 0;
  private typingTimer?: any;
  public sessions: ChatSession[] = [];
  public currentSessionId: string | null = null;
  public isMobile = false;
  public editingId: string | null = null;
  public editingTitle = '';
  @ViewChild('promptInputEl') promptInputEl?: ElementRef<HTMLInputElement>;
  @ViewChild(ChatThreadComponent) thread?: ChatThreadComponent;
  ngOnInit() {
    this.sidebarCollapsed = window.innerWidth < 768;
    this.sidebarOpen = false;
    this.newChat();
    this.updateIsMobile();

  }

  get currentSession(): ChatSession | undefined {
    return this.sessions.find(s => s.id === this.currentSessionId);
  }
  get canNewChat(): boolean {

    if (!this.sessions?.length) return true;
    if (!this.currentSession) return true;


    return (this.currentSession.messages?.length ?? 0) > 0;
  }


  public trackBySessionId = (_: number, s: ChatSession) => s.id;

  private updateIsMobile() {
    this.isMobile = window.innerWidth <= 768;

    if (!this.isMobile) this.sidebarOpen = false;
  }

  /** Dùng chung cho cả desktop & mobile */
  public toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarOpen = !this.sidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  /** Tạo chat mới */
  public newChat() {

    const cur = this.currentSession;
    if (cur && (cur.messages?.length ?? 0) === 0) {
      this.promptInputEl?.nativeElement?.focus();
      return;
    }


    const s: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };
    this.sessions = [s, ...this.sessions];
    this.currentSessionId = s.id;
    this.messages = s.messages;


    this.heroRendered = '';
    this.typingIdx = 0;
    this.showCaret = true;
    setTimeout(() => this.typeNext(), 50);
  }

  public openSession(id: string) {
    const s = this.sessions.find(x => x.id === id);
    if (!s) return;
    this.currentSessionId = id;
    this.messages = s.messages;
    this.stopHeroTyping(); this.showCaret = false;
  }

  private titleFromMessage(m: ChatMessage): string {
    const base = (m.text || (m.attachments?.[0]?.name ?? 'Untitled')).trim();
    return base.length > 40 ? base.slice(0, 37) + '…' : base || 'New chat';
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobile();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.sidebarOpen) this.sidebarOpen = false;
  }

  @ViewChild('homeHero', { static: false })
  set homeHeroRef(ref: ElementRef<HTMLElement> | undefined) {
    if (ref) this.restartHeroTyping();
  }

  private restartHeroTyping() {
    this.stopHeroTyping();
    this.heroRendered = '';
    this.typingIdx = 0;
    this.showCaret = true;
    setTimeout(() => this.typeNext(), 50);
  }

  private typeNext() {
    if (this.typingIdx > this.heroTitle.length) {
      setTimeout(() => (this.showCaret = false), 600);
      return;
    }

    this.heroRendered = this.heroTitle.slice(0, this.typingIdx++);
    const ch = this.heroTitle[this.typingIdx - 1] ?? '';

    const base = 55;
    let extra = 0;
    if (/[.,!?]/.test(ch)) {
      extra = 220;
    }

    this.typingTimer = setTimeout(() => this.typeNext(), base + extra);
  }

  private stopHeroTyping() {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = undefined;
    }
  }


  private onEnterChatMode() { this.stopHeroTyping(); this.showCaret = false; }


  toggleSidebarMobile() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = !this.sidebarOpen;
      if (this.sidebarOpen) this.sidebarCollapsed = false;
    } else {
      this.toggleSidebarDesktop();
    }
  }

  toggleSidebarDesktop() { this.sidebarCollapsed = !this.sidebarCollapsed; }

  closeDrawerByBackdrop() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
      this.sidebarCollapsed = true;
    } else {
      this.sidebarOpen = false;
    }
  }

  public onFilesChanged(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.addFiles(input.files);

    input.value = '';
  }

  public onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  public onDrop(e: DragEvent) {
    e.preventDefault();
    const list = e.dataTransfer?.files;
    if (!list || list.length === 0) return;
    this.addFiles(list);
  }


  private addFiles(list: FileList | File[]) {
    const current = new Map(this.files.map(f => [f.name + '|' + f.size + '|' + f.lastModified, true]));
    const added: File[] = [];
    Array.from(list).forEach(f => {
      const k = `${f.name}|${f.size}|${f.lastModified}`;
      if (!current.has(k)) {
        current.set(k, true);
        added.push(f);
      }
    });
    this.files = [...this.files, ...added];
    this.recalc();
  }

  public removeAt(i: number) {
    this.files.splice(i, 1);
    this.recalc();
  }

  public clearFiles() {
    this.files = [];
    this.recalc();
  }

  private recalc() {
    this.fileCount = this.files.length;
    this.totalSize = this.files.reduce((s, f) => s + f.size, 0);
  }


  public formatBytes(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;

  }
  public truncate(name: string, max = 40): string {
    return name.length > max ? name.slice(0, max - 10) + '…' + name.slice(-9) : name;
  }

  public send() {
    const input = this.promptInputEl?.nativeElement;
    const text = input?.value?.trim();
    if (!text && !this.files.length) return;


    if (!this.currentSessionId) this.newChat();
    const s = this.currentSession!;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'client',
      name: 'You',
      text,
      attachments: this.files.map(f => ({
        name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f)
      })),
      time: new Date(),
      status: 'sending'
    };

    s.messages.push(msg);
    this.messages = s.messages;
    s.updatedAt = msg.time as Date;


    if (s.messages.length === 1) s.title = this.titleFromMessage(msg);


    this.sessions = [s, ...this.sessions.filter(x => x.id !== s.id)];


    this.clearFiles(); if (input) input.value = '';

    setTimeout(() => {
      msg.status = 'sent';
      this.messages = [...s.messages];
    }, 400);
  }

  public trapFocus(e: MouseEvent) {
    const el = e.target as HTMLElement;


    const allow =
      (el instanceof HTMLInputElement && el.type === 'text') ||
      !!el.closest('button') ||
      !!el.closest('label[for="fileInput"]') ||
      !!el.closest('.chip');

    if (!allow) {
      this.promptInputEl?.nativeElement.blur();
      e.preventDefault();
    }
  }


  /** Bắt đầu rename */
  public startEdit(s: ChatSession, ev?: Event) {
    ev?.stopPropagation();
    this.editingId = s.id;
    this.editingTitle = s.title ?? '';

    setTimeout(() => document.getElementById('edit-' + s.id)?.focus(), 0);
  }

  /** Lưu rename */
  public commitEdit() {
    if (!this.editingId) return;
    const s = this.sessions.find(x => x.id === this.editingId);
    if (!s) { this.editingId = null; return; }
    const newTitle = (this.editingTitle || '').trim();
    if (newTitle && newTitle !== s.title) {
      s.title = newTitle;
      s.updatedAt = new Date();

      this.sessions = [s, ...this.sessions.filter(x => x.id !== s.id)];
    } else {

      this.sessions = [...this.sessions];
    }
    this.editingId = null;
    this.editingTitle = '';
  }

  /** Huỷ rename */
  public cancelEdit(ev?: Event) {
    ev?.stopPropagation();
    this.editingId = null;
    this.editingTitle = '';
  }

  /** Phím tắt trong ô rename */
  public onEditKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Enter') { ev.preventDefault(); this.commitEdit(); }
    if (ev.key === 'Escape') { ev.preventDefault(); this.cancelEdit(); }
  }

  /** Xoá session */
  public deleteSession(id: string, ev?: Event) {
    ev?.stopPropagation();
    if (!confirm('Delete this chat?')) return;

    const isCurrent = this.currentSessionId === id;
    const newSessions = this.sessions.filter(x => x.id !== id);
    this.sessions = [...newSessions];

    if (isCurrent) {
      if (newSessions.length) {
        this.currentSessionId = newSessions[0].id;
        this.messages = newSessions[0].messages;
      } else {
        this.currentSessionId = null;
        this.messages = [];
      }
    }
    if (this.editingId === id) { this.editingId = null; this.editingTitle = ''; }
  }
}
