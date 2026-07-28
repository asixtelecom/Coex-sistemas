"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Message, MessageReaction } from "@/types";
import {
  Clock,
  Check,
  CheckCheck,
  XCircle,
  X,
  FileText,
  MapPin,
  LayoutTemplate,
  ImageOff,
  CornerDownLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ReplyQuote } from "./reply-quote";
import { MessageReactions } from "./message-reactions";
import { fetchMediaAsBlobUrl } from "@/lib/media-cache";

interface MessageBubbleProps {
  message: Message;
  reply?: { authorLabel: string; preview: string } | null;
  reactions?: MessageReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  agentAvatarUrl?: string | null;
  /** Avatar URL of the agent who sent this message. */
  agentAvatarUrl?: string | null;
  /** Full name of the agent who sent this message. */
  agentName?: string | null;
}

function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

function MediaUnavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <ImageOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{label} indisponivel</span>
    </div>
  );
}

function useCachedMedia(url: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const needsCache = url.startsWith("/api/whatsapp/media/");

    if (!needsCache) {
      setSrc(url);
      setLoading(false);
      return;
    }

    fetchMediaAsBlobUrl(url)
      .then((blobUrl) => {
        if (!cancelled) {
          setSrc(blobUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { src, loading, error };
}

function MediaImage({ url, alt }: { url: string; alt: string }) {
  const { src, loading, error } = useCachedMedia(url);
  const [open, setOpen] = useState(false);

  if (error) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <img
        src={src ?? ""}
        alt={alt}
        className="max-h-64 max-w-60 cursor-pointer rounded-lg object-contain"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src ?? ""}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function CachedVideo({ url }: { url: string }) {
  const { src, loading, error } = useCachedMedia(url);

  if (error) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <video
      src={src ?? url}
      controls
      className="max-h-64 max-w-60 rounded-lg object-contain"
    />
  );
}

function CachedAudio({ url }: { url: string }) {
  const { src, loading, error } = useCachedMedia(url);

  if (error) {
    return <MediaUnavailable label="Audio" />;
  }

  if (loading) {
    return (
      <div className="flex h-10 w-60 items-center justify-center rounded-lg bg-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <audio src={src ?? url} controls className="w-56" />
  );
}

function CachedPdf({ url, filename }: { url: string; filename: string }) {
  const { src, loading, error } = useCachedMedia(url);

  if (error) {
    return <MediaUnavailable label={filename || "Documento"} />;
  }

  if (loading) {
    return (
      <div className="flex h-64 w-56 items-center justify-center rounded-lg border border-border bg-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          src={src ?? url}
          className="h-64 w-56"
          title={filename || "PDF"}
        />
      </div>
      <a
        href={src ?? url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="truncate">{filename || "Abrir PDF"}</span>
      </a>
    </div>
  );
}

function MessageContent({ message }: { message: Message }) {
  switch (message.content_type) {
    case "text":
      return (
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="text-sm">
          {message.content_text}
        </p>
      );

    case "image":
      return (
        <div>
          {message.media_url ? (
            <MediaImage url={message.media_url} alt="Imagem compartilhada" />
          ) : (
            <MediaUnavailable label="Imagem" />
          )}
          {message.content_text && (
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="mt-1 text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "video":
      return (
        <div>
          {message.media_url ? (
            <CachedVideo url={message.media_url} />
          ) : (
            <MediaUnavailable label="Video" />
          )}
          {message.content_text && (
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="mt-1 text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "audio":
      return (
        <div>
          {message.media_url ? (
            <CachedAudio url={message.media_url} />
          ) : (
            <MediaUnavailable label="Audio" />
          )}
        </div>
      );

    case "document":
      if (!message.media_url) {
        return <MediaUnavailable label={message.content_text || "Documento"} />;
      }
      const isPdf =
        message.media_url.includes(".pdf") ||
        (message.content_text || "").toLowerCase().endsWith(".pdf");
      if (isPdf) {
        return (
          <CachedPdf
            url={message.media_url}
            filename={message.content_text || "Documento"}
          />
        );
      }
      return (
        <a
          href={message.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
        >
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {message.content_text || "Documento"}
          </span>
        </a>
      );

    case "template":
      return (
        <div>
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LayoutTemplate className="h-3 w-3" />
            Modelo
          </span>
          {message.content_text && (
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="mt-1 text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "location":
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{message.content_text || "Localizacao compartilhada"}</span>
        </div>
      );

    case "interactive":
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" />
            Resposta de botao
          </span>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="text-sm">
            {message.content_text || "[Resposta interativa]"}
          </p>
        </div>
      );

    default:
      return (
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "normal", wordBreak: "keep-all" }} className="text-sm">
          {message.content_text || "[Tipo de mensagem nao suportado]"}
        </p>
      );
  }
}

export function MessageBubble({
  message,
  reply,
  reactions,
  currentUserId,
  onToggleReaction,
  agentAvatarUrl,
  agentName,
}: MessageBubbleProps) {
  const isAgent = message.sender_type === "agent" || message.sender_type === "bot";
  const time = format(new Date(message.created_at), "HH:mm");
  const agentInitial = (agentName || "A").charAt(0).toUpperCase();

  const avatar = isAgent ? (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
      {agentAvatarUrl ? (
        <img
          src={agentAvatarUrl}
          alt={agentName || "Agente"}
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        agentInitial
      )}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col",
        isAgent ? "items-end" : "items-start",
      )}
    >
      <div className={cn("flex items-end gap-1.5", isAgent ? "flex-row-reverse" : "flex-row")}>
        {avatar}
        <div
          className={cn(
            "relative min-w-0 max-w-[75%] rounded-2xl px-3 py-2",
            "relative max-w-[75%] rounded-2xl px-3 py-2",
            isAgent
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted text-foreground",
          )}
        >
          {reply && (
            <ReplyQuote
              authorLabel={reply.authorLabel}
              preview={reply.preview}
              onPrimary={isAgent}
            />
          )}
          <MessageContent message={message} />
          <div
            className={cn(
              "mt-1 flex items-center gap-1",
              isAgent ? "justify-end" : "justify-start",
            )}
          >
            <span
              className={cn(
                "text-[10px]",
                // Outbound bubbles sit on the primary fill, so the
                // timestamp must read against that (not the neutral
                // foreground) — otherwise it goes low-contrast in light
                // mode. Inbound bubbles use the muted surface.
                isAgent ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
            {isAgent && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
      {reactions && reactions.length > 0 && onToggleReaction && (
        <MessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      )}
    </div>
  );
}
