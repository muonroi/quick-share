import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ChatThreadComponent } from '../../features/chat-thread/chat-thread.component';
import { ChatMessage } from '../../services/main-share/models/chat-message';
import { ChatSession } from '../../services/main-share/models/chat-session';

@Component({
  selector: 'app-main-share',
  standalone: true,
  imports: [CommonModule, ChatThreadComponent],
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
  public heroTitle = 'What are you doing on quick-share?';
  public heroRendered = '';
  public showCaret = true;
  private typingIdx = 0;
  private typingTimer?: any;
  public sessions: ChatSession[] = [];
  public currentSessionId: string | null = null;
  @ViewChild('promptInputEl') promptInputEl?: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.sidebarCollapsed = window.innerWidth < 768;
    this.sidebarOpen = false;
    this.newChat();
  }

  get currentSession(): ChatSession | undefined {
    return this.sessions.find(s => s.id === this.currentSessionId);
  }

  /** Tạo chat mới */
  public newChat() {
    const s: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };
    this.sessions = [s, ...this.sessions];          // push lên đầu
    this.currentSessionId = s.id;
    this.messages = s.messages;                     // bind sang thread
    // reset hero typing
    this.heroRendered = ''; this.typingIdx = 0; this.showCaret = true;
    setTimeout(() => this.typeNext(), 50);
  }

  /** Mở session theo id */
  public openSession(id: string) {
    const s = this.sessions.find(x => x.id === id);
    if (!s) return;
    this.currentSessionId = id;
    this.messages = s.messages;
    this.stopHeroTyping(); this.showCaret = false;  // vào chat mode
  }

  /** Helper đặt title dựa vào message đầu tiên */
  private titleFromMessage(m: ChatMessage): string {
    const base = (m.text || (m.attachments?.[0]?.name ?? 'Untitled')).trim();
    return base.length > 40 ? base.slice(0, 37) + '…' : base || 'New chat';
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
      this.sidebarCollapsed = true;
    } else {
      this.sidebarOpen = false;
      this.sidebarCollapsed = false;
    }
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

  // Nếu chuyển sang chat (có messages), dừng gõ
  private onEnterChatMode() { this.stopHeroTyping(); this.showCaret = false; }


  toggleSidebarMobile() {
    this.sidebarOpen = !this.sidebarOpen;
  }
  toggleSidebarDesktop() { this.sidebarCollapsed = !this.sidebarCollapsed; }

  closeDrawerByBackdrop() {
    if (this.sidebarOpen) this.sidebarOpen = false;
  }

  public onFilesChanged(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.addFiles(input.files);

    input.value = '';
  }

  public toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
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

    // đảm bảo có session
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

    s.messages.push(msg);              // thêm vào session
    this.messages = s.messages;        // cập nhật binding (tham chiếu)
    s.updatedAt = msg.time as Date;

    // nếu là message đầu tiên → đặt title cho history
    if (s.messages.length === 1) s.title = this.titleFromMessage(msg);

    // đưa session vừa cập nhật lên đầu list (giống ChatGPT)
    this.sessions = [s, ...this.sessions.filter(x => x.id !== s.id)];

    // clear input/files
    this.clearFiles(); if (input) input.value = '';

    setTimeout(() => {
      msg.status = 'sent';
      this.messages = [...s.messages]; // trigger change detection nếu cần
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
}
