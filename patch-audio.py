import re

filepath = '/www/wwwroot/coexsistemas.techvoz.com.br/src/components/inbox/message-composer.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''          {draft.kind === "audio" && (
            <div className="flex items-center gap-2">
              <audio src={draft.mediaUrl} controls className="w-56" />
              <GatedButton
                size="sm"
                canAct={!readOnly}
                gateReason="send messages"
                disabled={busy}
                onClick={onSend}
                className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90 disabled:opacity-40"
                title="Enviar audio"
              >
                <Send className="h-4 w-4" />
              </GatedButton>
            </div>
          )}'''

new = '''          {draft.kind === "audio" && (
            <div className="flex w-full items-center justify-center gap-3">
              <audio src={draft.mediaUrl} controls className="flex-1" />
              <GatedButton
                size="sm"
                canAct={!readOnly}
                gateReason="send messages"
                disabled={busy}
                onClick={onSend}
                className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90 disabled:opacity-40"
                title="Enviar audio"
              >
                <Send className="h-4 w-4" />
              </GatedButton>
            </div>
          )}'''

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: audio block updated')
else:
    print('ERROR: target string not found')
    # Try to show what's there
    idx = content.find('draft.kind === "audio"')
    print('Found at index:', idx)
    print(repr(content[idx:idx+400]))
