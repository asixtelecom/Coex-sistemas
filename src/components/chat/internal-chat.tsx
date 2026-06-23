"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useInternalChat, type EmployeeWithPresence, type ChatConversation } from "@/hooks/use-internal-chat";
import { MessageSquare, Send, X, ChevronLeft, Search, Users, MessageCircle, Paperclip, Mic, Square, Play, FileText, Image, FileAudio, FileVideo, File, Smile, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import type { InternalMessage } from "@/types";

type TabType = "conversations" | "employees";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="h-5 w-5" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="h-5 w-5" />;
  if (mimeType.includes("pdf")) return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
}

export function InternalChat() {
  const { accountId, user } = useAuth();
  const {
    conversations,
    employees,
    activeConversation,
    messages,
    loading,
    setActiveConversation,
    sendMessage,
    uploadFile,
    getOrCreateConversation,
    markAsRead,
    deleteMessage,
    deleteConversation,
    clearMessages,
  } = useInternalChat(accountId ?? null, user?.id ?? null);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tab, setTab] = useState<TabType>("conversations");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const onEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length === 0 || !activeConversation) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 100) return;

        setUploading(true);
        const audioFile = new Blob([audioBlob], { type: "audio/webm" }) as any;
        audioFile.name = "audio_" + Date.now() + ".webm";
        audioFile.lastModified = Date.now();
        const uploaded = await uploadFile(audioFile as File);
        if (uploaded) {
          await sendMessage(activeConversation.id, "\u00c1udio", uploaded);
        }
        setUploading(false);
      };

      audioChunksRef.current = [];
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      console.error("Microphone access denied");
    }
  }, [activeConversation, sendMessage, uploadFile]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  useEffect(() => {
    if (!activeConversation && isRecording) stopRecording();
  }, [activeConversation, isRecording, stopRecording]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ":" + s.toString().padStart(2, "0");
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !activeConversation) return;
    await sendMessage(activeConversation.id, inputValue.trim());
    setInputValue("");
  }, [inputValue, activeConversation, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    setUploading(true);
    const uploaded = await uploadFile(file);
    if (uploaded) {
      await sendMessage(activeConversation.id, file.name, uploaded);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeConversation, sendMessage, uploadFile]);

  const handleSelectEmployee = useCallback(
    async (emp: EmployeeWithPresence) => {
      const convId = await getOrCreateConversation(emp.user_id);
      if (convId) setTab("conversations");
    },
    [getOrCreateConversation]
  );

  const handleSelectConversation = useCallback(
    (conv: ChatConversation) => {
      setActiveConversation(conv);
      markAsRead(conv.id);
    },
    [setActiveConversation, markAsRead]
  );

  const handleDeleteConversation = useCallback(
    (e: React.MouseEvent, convId: string) => {
      e.stopPropagation();
      deleteConversation(convId);
    },
    [deleteConversation]
  );


  const handleClearMessages = useCallback(() => {
    if (!activeConversation) return;
    if (window.confirm("Tem certeza que deseja limpar todas as mensagens desta conversa?")) {
      clearMessages(activeConversation.id);
    }
  }, [activeConversation, clearMessages]);

  const handleDeleteMessage = useCallback(
    (e: React.MouseEvent, msgId: string) => {
      e.stopPropagation();
      deleteMessage(msgId);
    },
    [deleteMessage]
  );

  const handleBack = useCallback(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  const filteredEmployees = searchQuery
    ? employees.filter(
        (e) =>
          e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Ontem";
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  const onlineCount = employees.filter((e) => e.status === "online").length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        title="Chat Interno"
      >
        <MessageSquare className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border border-border bg-card shadow-2xl transition-all duration-200",
        isExpanded ? "h-[650px] w-[500px]" : "h-[560px] w-[400px]"
      )}
    >
      <div className="flex shrink-0 items-center justify-between rounded-t-xl border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {activeConversation ? (
            <button onClick={handleBack} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {activeConversation ? activeConversation.other_user?.full_name ?? "Chat Interno" : "Chat Interno"}
            </h3>
            {!activeConversation && (
              <p className="text-xs text-muted-foreground">{onlineCount} online de {employees.length} funcionários</p>
            )}
            {activeConversation?.other_user && (
              <p className={cn("text-xs", activeConversation.other_user.status === "online" ? "text-green-500" : "text-muted-foreground")}>
                {activeConversation.other_user.status === "online" ? "Online" : activeConversation.other_user.status === "away" ? "Ausente" : "Offline"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
                    {activeConversation && (
            <button
              onClick={handleClearMessages}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
              title="Limpar conversa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            {isExpanded ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { setIsOpen(false); setActiveConversation(null); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeConversation ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Envie uma mensagem!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("group relative flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      <Avatar size="sm">
                        {msg.sender?.avatar_url ? <AvatarImage src={msg.sender.avatar_url} alt={msg.sender.full_name ?? ""} /> : null}
                        <AvatarFallback>{msg.sender?.full_name?.charAt(0)?.toUpperCase() ?? "U"}</AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[75%] space-y-1", isMe ? "items-end" : "items-start")}>
                        {msg.media_url && (
                          <div className={cn("relative overflow-hidden rounded-lg", !msg.content || msg.media_type?.startsWith("image/") ? "border border-border" : "bg-muted p-2")}>
                            {hoveredMsgId === msg.id && isMe && (
                              <button
                                onClick={(e) => handleDeleteMessage(e, msg.id)}
                                className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                                title="Excluir mensagem"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                            {msg.media_type?.startsWith("image/") ? (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                <img src={msg.media_url} alt={msg.media_name ?? ""} className="max-h-48 w-full rounded object-cover" />
                              </a>
                            ) : msg.media_type?.startsWith("audio/") ? (
                              <div className="flex items-center gap-2">
                                <FileAudio className="h-5 w-5 shrink-0 text-primary" />
                                <audio controls className="h-8 max-w-[180px]" src={msg.media_url}>
                                  <a href={msg.media_url} download>{msg.media_name}</a>
                                </audio>
                              </div>
                            ) : msg.media_type?.startsWith("video/") ? (
                              <div>
                                <video controls className="max-h-48 w-full rounded" src={msg.media_url} />
                              </div>
                            ) : (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                                {getFileIcon(msg.media_type ?? "")}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{msg.media_name ?? "Arquivo"}</p>
                                  {msg.media_size ? <p className="text-[10px] text-muted-foreground">{formatFileSize(msg.media_size)}</p> : null}
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content && (
                          <div className={cn("relative rounded-lg px-3 py-2 text-sm", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                            {hoveredMsgId === msg.id && isMe && (
                              <button
                                onClick={(e) => handleDeleteMessage(e, msg.id)}
                                className={cn("absolute -right-8 top-1 flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted", isMe ? "text-primary-foreground/70 hover:text-destructive" : "text-muted-foreground hover:text-destructive")}
                                title="Excluir mensagem"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={cn("mt-1 text-right text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {uploading && (
            <div className="shrink-0 border-t border-border px-4 py-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Enviando arquivo...
              </div>
            </div>
          )}

          {isRecording && (
            <div className="shrink-0 border-t border-border bg-destructive/5 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-destructive">
                    <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-destructive opacity-75" />
                  </span>
                  <span className="text-sm font-medium text-destructive">Gravando</span>
                  <span className="text-sm text-muted-foreground">{formatDuration(recordingDuration)}</span>
                </div>
                <button onClick={stopRecording} className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Square className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                title="Anexar arquivo"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFileSelect} className="hidden" />

              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={isRecording}
                  className="w-full pr-9"
                />
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isRecording}
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>

                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-12 right-0 z-50">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      skinTonesDisabled
                      searchDisabled
                      width={300}
                      height={350}
                    />
                  </div>
                )}
              </div>

              {inputValue.trim() ? (
                <button onClick={handleSend} disabled={uploading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={uploading}
                  className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors", isRecording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 border-b border-border">
            <button
              onClick={() => setTab("conversations")}
              className={cn("flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors", tab === "conversations" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <MessageCircle className="h-4 w-4" />
              Conversas
              {totalUnread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{totalUnread}</span>
              )}
            </button>
            <button
              onClick={() => setTab("employees")}
              className={cn("flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors", tab === "employees" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Users className="h-4 w-4" />
              Funcionários
            </button>
          </div>

          <div className="shrink-0 px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tab === "conversations" ? "Buscar conversas..." : "Buscar funcionários..."}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "employees" ? (
              <div className="px-2 py-1">
                {employees.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum funcionário encontrado</p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button key={emp.user_id} onClick={() => handleSelectEmployee(emp)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted">
                      <div className="relative shrink-0">
                        <Avatar size="sm">
                          {emp.avatar_url ? <AvatarImage src={emp.avatar_url} alt={emp.full_name} /> : null}
                          <AvatarFallback>{emp.full_name.charAt(0)?.toUpperCase() ?? "U"}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", emp.status === "online" ? "bg-green-500" : emp.status === "away" ? "bg-amber-500" : "bg-muted-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{emp.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp.status === "online" ? "Online" : emp.status === "away" ? "Ausente" : emp.last_seen_at ? "Visto em " + formatTime(emp.last_seen_at) : "Offline"}
                        </p>
                      </div>
                      <span className={cn("shrink-0 text-[10px] font-medium", emp.role === "owner" ? "text-amber-400" : emp.role === "admin" ? "text-primary" : "text-muted-foreground")}>
                        {emp.role === "owner" ? "Proprietário" : emp.role === "admin" ? "Admin" : "Agente"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="px-2 py-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda. Vá em Funcionários para iniciar uma."}
                  </p>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="group relative"
                      onMouseEnter={() => setHoveredConvId(conv.id)}
                      onMouseLeave={() => setHoveredConvId(null)}
                    >
                      <button onClick={() => handleSelectConversation(conv)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted">
                        <div className="relative shrink-0">
                          <Avatar size="sm">
                            {conv.other_user?.avatar_url ? <AvatarImage src={conv.other_user.avatar_url} alt={conv.other_user.full_name} /> : null}
                            <AvatarFallback>{conv.other_user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                          </Avatar>
                          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", conv.other_user?.status === "online" ? "bg-green-500" : conv.other_user?.status === "away" ? "bg-amber-500" : "bg-muted-foreground")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{conv.other_user?.full_name ?? "Usuário"}</p>
                            {conv.unread_count > 0 && (
                              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{conv.unread_count}</span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {conv.last_message?.media_url
                              ? conv.last_message.media_type?.startsWith("image/")
                                ? "\ud83d\udcf7 Foto"
                                : conv.last_message.media_type?.startsWith("audio/")
                                  ? "\ud83c\udfb5 \u00c1udio"
                                  : conv.last_message.media_type?.startsWith("video/")
                                    ? "\ud83c\udfac V\u00eddeo"
                                    : "\ud83d\udcce Arquivo"
                              : conv.last_message?.content ?? "Nenhuma mensagem ainda"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 self-start pt-0.5">
                          {hoveredConvId === conv.id && conv.last_message && (
                            <button
                              onClick={(e) => handleDeleteConversation(e, conv.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir conversa"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {conv.last_message ? formatTime(conv.last_message.created_at) : null}
                          </span>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
