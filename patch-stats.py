filepath = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/(dashboard)/inbox/stats/page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ---- Patch 1: Add ChevronDown import ----
old1 = "import { ArrowLeft, AlertCircle, EyeOff, X } from 'lucide-react'"
new1 = "import { ArrowLeft, AlertCircle, EyeOff, X, ChevronDown } from 'lucide-react'"

# ---- Patch 2: Add whatsappChannel state + whatsappChannels list state after existing states ----
old2 = "  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)\n  const supabase = createClient()"
new2 = """  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)
  const [whatsappChannels, setWhatsappChannels] = useState<{ account_id: string; display_phone: string }[]>([])
  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const supabase = createClient()"""

# ---- Patch 3: Fetch whatsapp channels on mount ----
old3 = "  const fetchStats = useCallback(async () => {"
new3 = """  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from('whatsapp_config')
        .select('account_id, display_phone, phone_number_id')
      if (data) {
        const channels = data.map(c => ({
          account_id: c.account_id,
          display_phone: c.display_phone || c.phone_number_id || 'WhatsApp',
        }))
        setWhatsappChannels(channels)
      }
    }
    loadChannels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStats = useCallback(async () => {"""

# ---- Patch 4: Add selectedWhatsappChannel to the filteredMessages filter ----
old4 = """      const filteredMessages = channelFilter === 'all'
        ? messagesData
        : messagesData.filter(m => {
            const ch = convChannelMap.get(m.conversation_id)
            return ch ? ch.type === channelFilter : channelFilter === 'whatsapp'
          })"""
new4 = """      const filteredMessages = messagesData.filter(m => {
        const ch = convChannelMap.get(m.conversation_id)
        const matchesChannel = channelFilter === 'all' || (ch ? ch.type === channelFilter : channelFilter === 'whatsapp')
        if (!matchesChannel) return false
        if (channelFilter === 'whatsapp' && selectedWhatsappChannel !== 'all') {
          return ch ? ch.account_id === selectedWhatsappChannel : false
        }
        return true
      })"""

# ---- Patch 5: Add selectedWhatsappChannel to fetchStats deps ----
old5 = "  }, [period, channelFilter, supabase])"
new5 = "  }, [period, channelFilter, selectedWhatsappChannel, supabase])"

# ---- Patch 6: Add useEffect dep ----
old6 = "  useEffect(() => { fetchStats() }, [fetchStats])"
new6 = "  useEffect(() => { fetchStats() }, [fetchStats])"  # no change needed

# ---- Patch 7: Add WhatsApp channel dropdown after channel filter buttons ----
old7 = """      <div className="mb-6 grid grid-cols-3 gap-3">"""
new7 = """      {channelFilter === 'whatsapp' && whatsappChannels.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Canal:</span>
          <div className="relative">
            <select
              value={selectedWhatsappChannel}
              onChange={(e) => setSelectedWhatsappChannel(e.target.value)}
              className="appearance-none rounded-md border border-border bg-card pl-3 pr-8 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todos os canais</option>
              {whatsappChannels.map((ch) => (
                <option key={ch.account_id} value={ch.account_id}>
                  {ch.display_phone}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">"""

# Apply patches
patches = [
    (old1, new1, "lucide import"),
    (old2, new2, "whatsapp channel states"),
    (old3, new3, "load channels useEffect"),
    (old4, new4, "filteredMessages with channel filter"),
    (old5, new5, "fetchStats deps"),
    (old7, new7, "WhatsApp channel dropdown"),
]

for old, new, name in patches:
    if old in content:
        content = content.replace(old, new)
        print(f"[OK] {name}")
    else:
        print(f"[MISS] {name} - not found")
        # Show context
        key = old.strip()[:60]
        idx = content.find(key)
        if idx >= 0:
            print(f"  Found partial at {idx}: {repr(content[idx:idx+80])}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! File written.")
