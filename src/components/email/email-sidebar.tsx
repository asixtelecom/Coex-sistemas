"use client"

import { Pencil, Inbox, Send, Star, AlertTriangle, FileText, Trash2, FileJson } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Folder {
  id: string
  label: string
  icon: typeof Inbox
  count?: number
}

interface EmailSidebarProps {
  folders: Folder[]
  activeFolder: string
  onFolderChange: (folder: string) => void
  onCompose: () => void
  collapsed?: boolean
}

export function EmailSidebar({ folders, activeFolder, onFolderChange, onCompose, collapsed }: EmailSidebarProps) {
  return (
    <aside className={cn(
      "flex flex-col gap-2 border-r border-border bg-card p-3",
      collapsed ? "w-16 items-center" : "w-56"
    )}>
      <Button onClick={onCompose} className={cn(
        "flex items-center gap-2",
        collapsed ? "w-10 h-10 p-0 justify-center" : "w-full"
      )}>
        <Pencil className="h-4 w-4" />
        {!collapsed && "Escrever"}
      </Button>

      <nav className="flex flex-col gap-1 mt-2">
        {folders.map((folder) => {
          const Icon = folder.icon
          const isActive = activeFolder === folder.id
          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? folder.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left">{folder.label}</span>
              )}
              {!collapsed && folder.count !== undefined && folder.count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                  {folder.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
