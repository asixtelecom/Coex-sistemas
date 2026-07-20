"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { CornerUpLeft, Copy, SmilePlus, Forward, Smile } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Message } from "@/types";

const QUICK_EMOJIS = [
  "👍", "👎", "❤️", "🔥", "😂", "😮", "😢", "🙏",
  "👏", "🤝", "💪", "✅", "❌", "⭐", "🎉", "🤔",
];

const EMOJI_CATEGORIES = [
  {
    name: "Frequentes",
    emojis: ["👍", "👎", "❤️", "🔥", "😂", "😮", "😢", "🙏", "👏", "🤝", "💪", "✅", "❌", "⭐", "🎉", "🤔", "😊", "😍", "🥰", "😘", "😎", "🤗", "😅", "🤣"],
  },
  {
    name: "Sorrisos",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥"],
  },
  {
    name: "Gestos",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏"],
  },
  {
    name: "Corações",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  },
  {
    name: "Animais",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞"],
  },
  {
    name: "Comida",
    emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯"],
  },
  {
    name: "Atividades",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "🎯", "🎮", "🎰", "🧩", "🎭", "🎨", "🧵", "🧶", "🎼", "🎵", "🎶"],
  },
  {
    name: "Objetos",
    emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋"],
  },
  {
    name: "Símbolos",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐"],
  },
  {
    name: "Bandeiras",
    emojis: ["🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇺🇸", "🇧🇷", "🇬🇧", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇯🇵", "🇰🇷", "🇨🇳", "🇮🇳", "🇷🇺", "🇨🇦", "🇦🇺", "🇲🇽", "🇦🇷", "🇨🇴", "🇨🇱", "🇵🇪", "🇪🇨", "🇻🇪", "🇵🇹"],
  },
];

interface MessageActionsProps {
  message: Message;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onForward?: () => void;
  children: ReactNode;
}

export function MessageActions({
  message,
  onReply,
  onReact,
  onForward,
  children,
}: MessageActionsProps) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const fullPickerRef = useRef<HTMLDivElement>(null);

  const isAgent =
    message.sender_type === "agent" || message.sender_type === "bot";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fullPickerRef.current && !fullPickerRef.current.contains(e.target as Node)) {
        setFullPickerOpen(false);
      }
    }
    if (fullPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fullPickerOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setTouchOpen(true);
  };

  const handleCopy = async () => {
    const text = message.content_text ?? "";
    if (!text) {
      toast.error("Nada para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
    setTouchOpen(false);
  };

  const handlePickEmoji = (emoji: string) => {
    onReact(emoji);
    setPickerOpen(false);
    setFullPickerOpen(false);
    setTouchOpen(false);
  };

  const handleReply = () => {
    onReply();
    setTouchOpen(false);
  };

  const handleForward = () => {
    onForward?.();
    setTouchOpen(false);
  };

  return (
    <div
      className={cn(
        "flex w-full",
        isAgent ? "justify-end" : "justify-start",
      )}
      onContextMenu={handleContextMenu}
      onBlur={() => setTouchOpen(false)}
    >
      <div className="group/actions relative min-w-0 max-w-[75%]">
        {children}
      <div
        data-touch-open={touchOpen || pickerOpen || fullPickerOpen ? "true" : undefined}
        className={cn(
          "absolute -top-3 z-10 flex h-7 items-center gap-0.5 rounded-full border border-border bg-popover/95 px-1 shadow-md backdrop-blur-sm transition-opacity",
          "opacity-0 group-hover/actions:opacity-100 group-focus-within/actions:opacity-100",
          "data-[touch-open=true]:opacity-100",
          isAgent ? "right-3" : "left-3",
        )}
      >
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            className="flex h-5 w-5 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground"
            aria-label="Reagir"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent
            className="flex w-auto flex-row gap-1 p-1.5"
            sideOffset={6}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => handlePickEmoji(e)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-125 hover:bg-muted"
                aria-label={`Reagir com ${e}`}
              >
                {e}
              </button>
            ))}
            <div className="ml-1 border-l border-border pl-1">
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setFullPickerOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Mais emojis"
              >
                <Smile className="h-4 w-4" />
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Full Emoji Picker - Centralizado na tela */}
        {fullPickerOpen && (
          <>
            <div
              className="fixed inset-0 z-[99]"
              onClick={() => setFullPickerOpen(false)}
            />
            <div
              ref={fullPickerRef}
              className="fixed left-1/2 top-1/2 z-[100] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover shadow-xl"
            >
            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border p-2 scrollbar-none">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    activeCategory === idx
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="h-[280px] overflow-y-auto p-2">
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handlePickEmoji(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl leading-none transition-transform hover:scale-125 hover:bg-muted"
                    aria-label={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          </>
        )}

        <button
          type="button"
          onClick={handleReply}
          className="flex h-5 w-5 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground"
          aria-label="Responder"
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-5 w-5 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copiar"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {onForward && (
          <button
            type="button"
            onClick={handleForward}
            className="flex h-5 w-5 items-center justify-center rounded-full text-popover-foreground hover:bg-muted hover:text-foreground"
            aria-label="Encaminhar"
          >
            <Forward className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
