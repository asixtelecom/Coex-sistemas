"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  Search,
  UserCircle,
  Phone,
  Building2,
  FileText,
  ClipboardCheck,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Package,
  Camera,
  Pencil,
  MapPin,
  Mail,
  Printer,
  Share2,
  MessageCircle,
  Image as ImageIcon,
  Warehouse,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vistoria {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_document: string | null;
  tipo_servico: string;
  tipo_imovel: string | null;
  status: string;
  data_vistoria: string;
  horario_vistoria: string | null;
  total_cubagem: number;
  total_valor_almoxarifado: number;
  created_at: string;
  vistoriador_id: string;
}

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  document: string | null;
  address: string | null;
}

interface TipoServico {
  id: number;
  slug: string;
  nome: string;
  categoria: string;
  icone?: string;
}

interface DefaultComodo {
  id: number;
  comodo: string;
  ordem: number;
}

interface CubagemItem {
  id: string;
  item_name: string;
  default_m3: number;
}

interface ComodoItem {
  comodo: string;
  item_name: string;
  cubagem_m3: number;
  quantidade: number;
}

interface AlmoxarifadoItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number | null;
}

interface VistoriaAlmoxarifadoItem {
  nome: string;
  quantidade: number;
  valor_custo: number;
}

interface RouteData {
  origin: string;
  destination: string;
  mapsUrl: string;
  coordinates: [number, number][];
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  centerLat: number;
  centerLng: number;
  distance: string;
  duration: string;
}

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  em_andamento: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  concluido: "bg-green-500/20 text-green-500 border-green-500/30",
  cancelado: "bg-red-500/20 text-red-500 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function VistoriaPage() {
  const supabase = createClient();
  const { user, accountId } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profilesMap, setProfilesMap] = useState<Record<string, { name: string | null; avatar_url: string | null; email: string | null }>>({});

  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [step, setStep] = useState<"select" | "pergunta" | "imovel" | "cliente" | "tipo" | "comodos" | "cubagem" | "almoxarifado">("select");
  const [tipoServico, setTipoServico] = useState<string>("");
  const [tipoImovel, setTipoImovel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().split("T")[0]);

  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchingContact, setSearchingContact] = useState(false);

  const [newContact, setNewContact] = useState({
    name: "",
    document: "",
    phone: "",
    phone2: "",
    email: "",
    company: "",
    address: "",
  });
  const [showNewContact, setShowNewContact] = useState(false);
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDocument, setContactDocument] = useState("");

  const [currentVistoriaId, setCurrentVistoriaId] = useState<string | null>(null);
  const [temVistoria, setTemVistoria] = useState<boolean | null>(null);
  const [existingVistorias, setExistingVistorias] = useState<any[]>([]);
  const [selectedExistingVistoriaId, setSelectedExistingVistoriaId] = useState<string | null>(null);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [defaultComodos, setDefaultComodos] = useState<DefaultComodo[]>([]);
  const [cubagemItems, setCubagemItems] = useState<CubagemItem[]>([]);
  const [selectedComodos, setSelectedComodos] = useState<string[]>([]);
  const [comodoItems, setComodoItems] = useState<Record<string, ComodoItem[]>>({});
  const [savingCubagem, setSavingCubagem] = useState(false);
  const [customComodoInput, setCustomComodoInput] = useState("");
  const [cubagemItemsList, setCubagemItemsList] = useState<ComodoItem[]>([]);
  const [almoxarifadoItems, setAlmoxarifadoItems] = useState<AlmoxarifadoItem[]>([]);
  const [vistoriaAlmoxarifadoItems, setVistoriaAlmoxarifadoItems] = useState<VistoriaAlmoxarifadoItem[]>([]);

  const [cameraOpenId, setCameraOpenId] = useState<string | null>(null);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVistoria, setEditingVistoria] = useState<Vistoria | null>(null);
  const [editForm, setEditForm] = useState({ tipo_servico: "", tipo_imovel: "", contact_name: "", contact_phone: "", contact_document: "", status: "" });
  const [editCubagemComodos, setEditCubagemComodos] = useState<ComodoItem[]>([]);
  const [editAlmoxarifado, setEditAlmoxarifado] = useState<VistoriaAlmoxarifadoItem[]>([]);
  const [editCubagemLoading, setEditCubagemLoading] = useState(false);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [routeVistoria, setRouteVistoria] = useState<Vistoria | null>(null);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDest, setRouteDest] = useState("");
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVistoriaId, setRecordedVistoriaId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryVistoriaId, setGalleryVistoriaId] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchVistorias = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from("vistorias")
      .select("*")
      .eq("account_id", accountId)
      .order("data_vistoria", { ascending: false })
      .order("horario_vistoria", { ascending: false });
    if (data) setVistorias(data as Vistoria[]);
    setLoading(false);
  }, [accountId, supabase]);

  useEffect(() => {
    fetchVistorias();
    supabase.from("tipos_servico").select("*").order("ordem").then(({ data }) => {
      if (data) setTiposServico(data as TipoServico[]);
    });
    supabase.from("vistoria_default_comodos").select("*").order("ordem").then(({ data }) => {
      if (data) setDefaultComodos(data as DefaultComodo[]);
    });
    supabase.from("cubagem_master_items").select("*").order("item_name").then(({ data }) => {
      if (data) setCubagemItems(data as CubagemItem[]);
    });
    supabase.from("estoque_items").select("id, name, quantity, unit, cost").eq("account_id", accountId).order("name").then(({ data }) => {
      if (data) setAlmoxarifadoItems(data as AlmoxarifadoItem[]);
    });
  }, [fetchVistorias, supabase, accountId]);

  const vistoriadorIds = useMemo(() => [...new Set(vistorias.map((v) => v.vistoriador_id).filter(Boolean) as string[])], [vistorias]);

  useEffect(() => {
    if (vistoriadorIds.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, email")
      .in("user_id", vistoriadorIds)
      .then(({ data }) => {
        if (!data) return;
        setProfilesMap((prev) => ({
          ...prev,
          ...Object.fromEntries(
            data.map((p) => [
              p.user_id,
              { name: p.full_name, avatar_url: p.avatar_url, email: p.email },
            ])
          ),
        }));
      });
  }, [vistoriadorIds, supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("contact_name");
    const phone = params.get("contact_phone");
    const contactId = params.get("contact_id");
    if (name || phone) {
      setContactName(name || "");
      setContactPhone(phone || "");
      setNewContact((prev) => ({
        ...prev,
        name: name || "",
        phone: phone || "",
      }));
      setStep("cliente");
    }
  }, []);

  const searchContacts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setContactResults([]);
      return;
    }
    setSearchingContact(true);
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, email, company, document, address")
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,document.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    setContactResults((data as Contact[]) ?? []);
    setSearchingContact(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contactSearch.length >= 2) searchContacts(contactSearch);
      else setContactResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch, searchContacts]);

  useEffect(() => {
    const phone = newContact.phone.trim();
    if (phone.length < 8) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, phone, email, company, document, address")
        .eq("phone", phone)
        .limit(1);
      if (data && data.length > 0) {
        const c = data[0] as Contact;
        setNewContact((p) => ({
          ...p,
          name: c.name ?? p.name,
          email: c.email ?? p.email,
          company: c.company ?? p.company,
          document: c.document ?? p.document,
          address: c.address ?? p.address,
        }));
        toast.success("Cliente encontrado — dados preenchidos");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newContact.phone, supabase]);

  // Fetch existing vistorias when client is selected and temVistoria is true
  useEffect(() => {
    if (!temVistoria || !selectedContact?.id) {
      setExistingVistorias([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setFetchingExisting(true);
      const { data } = await supabase
        .from("vistorias")
        .select("id, tipo_servico, tipo_imovel, status, data_vistoria, total_cubagem, contact_name")
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setExistingVistorias(data ?? []);
        setFetchingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [temVistoria, selectedContact?.id, supabase]);

  const handleNewContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!newContact.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          account_id: accountId,
          user_id: user?.id,
          name: newContact.name.trim(),
          phone: newContact.phone.trim() || null,
          email: newContact.email.trim() || null,
          company: newContact.company.trim() || null,
          document: newContact.document.trim() || null,
          address: newContact.address.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      setSelectedContact(data as unknown as Contact);
      setContactName(data.name ?? "");
      setContactPhone(data.phone ?? "");
      setContactDocument(data.document ?? "");
      setShowNewContact(false);
    setContactMode("existing");
      setNewContact({ name: "", document: "", phone: "", phone2: "", email: "", company: "", address: "" });
      toast.success("Cliente cadastrado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (v: Vistoria) => {
    setEditingVistoria(v);
    setEditForm({
      tipo_servico: v.tipo_servico,
      tipo_imovel: v.tipo_imovel || "",
      contact_name: v.contact_name || "",
      contact_phone: v.contact_phone || "",
      contact_document: v.contact_document || "",
      status: v.status,
    });
    setEditCubagemLoading(true);
    const [comodosRes, almoxRes] = await Promise.all([
      supabase.from("vistoria_comodos").select("comodo, item_name, cubagem_m3, quantidade").eq("vistoria_id", v.id).order("created_at"),
      supabase.from("vistoria_almoxarifado").select("nome, quantidade, valor_custo").eq("vistoria_id", v.id).order("created_at"),
    ]);
    setEditCubagemComodos((comodosRes.data ?? []) as ComodoItem[]);
    setEditAlmoxarifado((almoxRes.data ?? []).map((i: any) => ({ nome: i.nome, quantidade: i.quantidade, valor_custo: i.valor_custo })));
    setEditCubagemLoading(false);
    setEditDialogOpen(true);
  };

  const handleFileCapture = async (file: File, type: "photo" | "video", vistoriaId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vistoriaId", vistoriaId);
    formData.append("type", type);
    try {
      const res = await fetch("/api/vistoria/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${type === "photo" ? "Foto" : "Vídeo"} salvo com sucesso`);
    } catch {
      toast.error("Erro ao salvar mídia");
    }
  };

  const getRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "video/webm";
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
  };

  const startVideoRecording = async (vistoriaId: string) => {
    try {
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        toast.error("Câmera requer HTTPS — acesse via https://coexsistemas.techvoz.com.br");
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      mediaStreamRef.current = stream;
      setRecordedVistoriaId(vistoriaId);
      setRecordingOpen(true);
      setIsRecording(false);
      setRecordingTime(0);
      recordedChunksRef.current = [];
      await new Promise((r) => setTimeout(r, 100));
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError") {
        toast.error("Permissão negada — permita o acesso à câmera nas configurações do navegador");
      } else if (name === "NotFoundError") {
        toast.error("Câmera não encontrada no dispositivo");
      } else if (name === "NotReadableError") {
        toast.error("Câmera em uso por outro aplicativo");
      } else {
        toast.error("Erro ao acessar a câmera: " + (err?.message || "verifique as permissões"));
      }
    }
  };

  const beginRecording = () => {
    if (!mediaStreamRef.current) return;
    const mimeType = getRecorderMimeType();
    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType });
      const vid = recordedVistoriaId;
      cleanupRecording();
      if (vid) handleFileCapture(file, "video", vid);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    let sec = 0;
    recordingTimerRef.current = setInterval(() => { sec++; setRecordingTime(sec); }, 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cleanupRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingOpen(false);
    setIsRecording(false);
    setRecordingTime(0);
    setRecordedVistoriaId(null);
  };

  const handleCreateVistoria = async () => {
    if (!tipoServico) {
      toast.error("Selecione o tipo de serviço");
      return;
    }
    if (!selectedContact && !contactName.trim()) {
      toast.error("Selecione ou cadastre um cliente");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("vistorias").insert({
        account_id: accountId,
        vistoriador_id: user?.id,
        contact_id: selectedContact?.id || null,
        contact_name: contactName.trim() || selectedContact?.name || null,
        contact_phone: contactPhone.trim() || selectedContact?.phone || null,
        contact_document: contactDocument.trim() || selectedContact?.document || null,
        tipo_servico: tipoServico,
        tipo_imovel: tipoImovel,
        data_vistoria: dataVistoria,
        status: "pendente",
      }).select("id").single();
      if (error) throw error;
      setCurrentVistoriaId(data.id);
      if (tipoServico === "guarda-volume") {
        toast.success("Vistoria criada — adicione os itens");
        setStep("cubagem");
      } else {
        toast.success("Vistoria criada — adicione os cômodos");
        setStep("comodos");
      }
      fetchVistorias();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar vistoria");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingVistoria) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("vistorias").update({
        tipo_servico: editForm.tipo_servico,
        tipo_imovel: editForm.tipo_imovel || null,
        contact_name: editForm.contact_name || null,
        contact_phone: editForm.contact_phone || null,
        contact_document: editForm.contact_document || null,
        status: editForm.status,
      }).eq("id", editingVistoria.id);
      if (error) throw error;

      await supabase.from("vistoria_comodos").delete().eq("vistoria_id", editingVistoria.id);
      if (editCubagemComodos.length > 0) {
        const { error: cubagemError } = await supabase.from("vistoria_comodos").insert(
          editCubagemComodos.map((i) => ({
            vistoria_id: editingVistoria.id,
            comodo: i.comodo,
            item_name: i.item_name,
            cubagem_m3: i.cubagem_m3,
            quantidade: i.quantidade,
          }))
        );
        if (cubagemError) throw cubagemError;
      }
      const totalCubagem = editCubagemComodos.reduce((sum, i) => sum + i.cubagem_m3 * i.quantidade, 0);

      await supabase.from("vistoria_almoxarifado").delete().eq("vistoria_id", editingVistoria.id);
      if (editAlmoxarifado.length > 0) {
        const { error: almoxError } = await supabase.from("vistoria_almoxarifado").insert(
          editAlmoxarifado.map((i) => ({
            vistoria_id: editingVistoria.id,
            nome: i.nome,
            quantidade: i.quantidade,
            valor_custo: i.valor_custo,
          }))
        );
        if (almoxError) throw almoxError;
      }
      const totalAlmox = editAlmoxarifado.reduce((sum, i) => sum + i.quantidade * i.valor_custo, 0);

      await supabase.from("vistorias").update({ total_cubagem: totalCubagem, total_valor_almoxarifado: totalAlmox }).eq("id", editingVistoria.id);

      toast.success("Vistoria atualizada");
      setEditDialogOpen(false);
      setEditingVistoria(null);
      fetchVistorias();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar vistoria");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVistoria = async () => {
    if (!editingVistoria) return;
    if (!confirm("Tem certeza que deseja excluir esta vistoria?")) return;
    try {
      await supabase.from("vistoria_comodos").delete().eq("vistoria_id", editingVistoria.id);
      await supabase.from("vistoria_almoxarifado").delete().eq("vistoria_id", editingVistoria.id);
      const { error } = await supabase.from("vistorias").delete().eq("id", editingVistoria.id);
      if (error) throw error;
      toast.success("Vistoria excluída");
      setEditDialogOpen(false);
      setEditingVistoria(null);
      fetchVistorias();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir vistoria");
    }
  };

  function resetForm() {
    setStep("select");
    setTipoServico("");
    setTipoImovel("");
    setTemVistoria(null);
    setExistingVistorias([]);
    setSelectedExistingVistoriaId(null);
    setSelectedContact(null);
    setContactName("");
    setContactPhone("");
    setContactDocument("");
    setContactSearch("");
    setContactResults([]);
    setShowNewContact(false);
    setNewContact({ name: "", document: "", phone: "", phone2: "", email: "", company: "", address: "" });
    setCurrentVistoriaId(null);
    setSelectedComodos([]);
    setComodoItems({});
    setCubagemItemsList([]);
    setVistoriaAlmoxarifadoItems([]);
    setDataVistoria(new Date().toISOString().split("T")[0]);
  }

  const handleSaveRoute = async () => {
    if (!routeData || !routeVistoria) return;
    const coords = routeData.coordinates;
    const lngs = coords.map((c: [number, number]) => c[0]);
    const lats = coords.map((c: [number, number]) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const pad = 0.05;
    const rangeLng = maxLng - minLng + pad * 2;
    const rangeLat = maxLat - minLat + pad * 2;
    const W = 600, H = 400;
    const scale = Math.min(W / rangeLng, H / rangeLat) * 0.9;
    const cx = (minLng + maxLng) / 2;
    const cy = (minLat + maxLat) / 2;
    const offX = W / 2 - cx * scale;
    const offY = H / 2 + cy * scale;
    const toX = (lng: number) => lng * scale + offX;
    const toY = (lat: number) => -lat * scale + offY;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H + 60;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, W, H + 60);

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    coords.forEach((c: [number, number], i: number) => {
      const x = toX(c[0]), y = toY(c[1]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    const drawMarker = (x: number, y: number, label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    };

    drawMarker(toX(routeData.originLng), toY(routeData.originLat), "A", "#2563eb");
    drawMarker(toX(routeData.destLng), toY(routeData.destLat), "B", "#dc2626");

    ctx.fillStyle = "#333";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Origem: ${routeData.origin}`, 12, H + 8);
    ctx.fillText(`Destino: ${routeData.destination}`, 12, H + 26);
    ctx.fillText(`${routeData.distance} — ${routeData.duration}`, 12, H + 44);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) { toast.error("Erro ao gerar imagem"); return; }
    const file = new File([blob], `route-${Date.now()}.png`, { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("vistoriaId", routeVistoria.id);
    fd.append("type", "route");
    try {
      const res = await fetch("/api/vistoria/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      toast.success("Rota salva em vistoria/fotoevideo");
    } catch {
      toast.error("Erro ao salvar rota");
    }
  };

  const handleCalcRoute = async () => {
    if (!routeOrigin.trim() || !routeDest.trim()) return;
    setRouteLoading(true);
    setRouteData(null);
    try {
      const [origRes, destRes] = await Promise.all([
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(routeOrigin)}&format=json&limit=1`),
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(routeDest)}&format=json&limit=1`),
      ]);
      const [origData, destData] = await Promise.all([origRes.json(), destRes.json()]);
      if (!origData.length) throw new Error("Origem não encontrada");
      if (!destData.length) throw new Error("Destino não encontrado");

      const oLon = parseFloat(origData[0].lon);
      const oLat = parseFloat(origData[0].lat);
      const dLon = parseFloat(destData[0].lon);
      const dLat = parseFloat(destData[0].lat);

      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?geometries=geojson&overview=full`,
      );
      const routeJson = await routeRes.json();
      if (!routeJson.routes?.length) throw new Error("Rota não encontrada");

      const r = routeJson.routes[0];
      const coords = r.geometry.coordinates as [number, number][];
      const distKm = (r.distance / 1000).toFixed(1);
      const totalMin = Math.round(r.duration / 60);
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      const durStr = hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;

      const mapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(routeOrigin)}/${encodeURIComponent(routeDest)}/`;

      setRouteData({
        origin: routeOrigin,
        destination: routeDest,
        mapsUrl,
        coordinates: coords,
        originLat: oLat,
        originLng: oLon,
        destLat: dLat,
        destLng: dLon,
        centerLat: (oLat + dLat) / 2,
        centerLng: (oLon + dLon) / 2,
        distance: `${distKm} km`,
        duration: durStr,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular rota");
    } finally {
      setRouteLoading(false);
    }
  };

  const groupedVistorias = useMemo(() => {
    const groups: Record<string, Vistoria[]> = {};
    vistorias.forEach((v) => {
      const date = v.data_vistoria || v.created_at.split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(v);
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    return sorted;
  }, [vistorias]);

  const filteredVistorias = useMemo(() => {
    if (!search) return groupedVistorias;
    const q = search.toLowerCase();
    return groupedVistorias
      .map(([date, items]) => [
        date,
        items.filter(
          (v) =>
            v.contact_name?.toLowerCase().includes(q) ||
            v.contact_phone?.includes(q) ||
            v.tipo_servico?.toLowerCase().includes(q) ||
            statusLabels[v.status]?.toLowerCase().includes(q),
        ),
      ] as [string, Vistoria[]])
      .filter(([, items]) => items.length > 0);
  }, [groupedVistorias, search]);

  const hasPermission = true;

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vistorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie as vistorias e inspeções</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4 mr-1" /> Nova Vistoria
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar vistorias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        const vistoriaId = pendingUploadRef.current;
        if (file && vistoriaId) handleFileCapture(file, "photo", vistoriaId);
        pendingUploadRef.current = null;
        e.target.value = "";
      }} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        const vistoriaId = pendingUploadRef.current;
        if (file && vistoriaId) handleFileCapture(file, "video", vistoriaId);
        pendingUploadRef.current = null;
        e.target.value = "";
      }} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filteredVistorias.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardCheck className="size-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma vistoria encontrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredVistorias.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                <CalendarIcon className="size-3.5 inline mr-1" />
                {format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((v) => (
                  <Card key={v.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {v.contact_name || "Sem nome"}
                          </p>
                          {v.contact_phone && (
                            <p className="text-xs text-muted-foreground truncate">
                              <Phone className="size-3 inline mr-1" /> {v.contact_phone}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-xs border ${statusColors[v.status] || ""}`}>
                            {statusLabels[v.status] || v.status}
                          </Badge>
                          <div className="relative">
                            <Button variant="ghost" size="icon" className="size-7" title="Compartilhar" onClick={() => setShareOpenId(shareOpenId === v.id ? null : v.id)}>
                              <Share2 className="size-3.5" />
                            </Button>
                            {shareOpenId === v.id && (
                              <>
                                <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 min-w-[150px]">
                                  <button
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-popover-foreground hover:bg-muted rounded"
                                    onClick={() => {
                                      const assunto = encodeURIComponent(`Vistoria - ${v.contact_name || "Sem nome"}`);
                                      const corpo = encodeURIComponent(
                                        `Vistoria: ${v.contact_name || "Sem nome"}\n` +
                                        `Telefone: ${v.contact_phone || "—"}\n` +
                                        `Tipo: ${tiposServico.find((t) => t.slug === v.tipo_servico)?.nome || v.tipo_servico}\n` +
                                        `Cubagem: ${v.total_cubagem.toFixed(3)} m³\n` +
                                        `Status: ${statusLabels[v.status] || v.status}`
                                      );
                                      window.open(`mailto:?subject=${assunto}&body=${corpo}`, "_blank");
                                      setShareOpenId(null);
                                    }}
                                  >
                                    <Mail className="size-3.5" /> Email
                                  </button>
                                  <button
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-popover-foreground hover:bg-muted rounded"
                                    onClick={() => {
                                      const texto = encodeURIComponent(
                                        `*Vistoria - ${v.contact_name || "Sem nome"}*\n` +
                                        `📞 ${v.contact_phone || "—"}\n` +
                                        `📦 ${tiposServico.find((t) => t.slug === v.tipo_servico)?.nome || v.tipo_servico}\n` +
                                        `­ƒôÉ ${v.total_cubagem.toFixed(3)} m³\n` +
                                        `🟡 ${statusLabels[v.status] || v.status}`
                                      );
                                      window.open(`https://wa.me/?text=${texto}`, "_blank");
                                      setShareOpenId(null);
                                    }}
                                  >
                                    <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp
                                  </button>
                                </div>
                                <div className="fixed inset-0 z-40" onClick={() => setShareOpenId(null)} />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {tiposServico.find((t) => t.slug === v.tipo_servico)?.nome || v.tipo_servico}
                        </Badge>
                        {v.tipo_imovel && (
                          <Badge variant="outline" className="text-[10px]">
                            {tiposServico.find((t) => t.slug === v.tipo_imovel)?.nome || v.tipo_imovel}
                          </Badge>
                        )}
                        {v.horario_vistoria && (
                          <span>
                            <Clock className="size-3 inline mr-0.5" /> {v.horario_vistoria.slice(0, 5)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Package className="size-3" /> {v.total_cubagem.toFixed(3)} m³
                        </span>
                        {v.total_valor_almoxarifado > 0 && (
                          <span className="flex items-center gap-1 text-amber-500 font-medium">
                            <Warehouse className="size-3" /> R$ {Number(v.total_valor_almoxarifado).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            {profilesMap[v.vistoriador_id || ""]?.avatar_url ? (
                              <AvatarImage
                                src={profilesMap[v.vistoriador_id || ""]?.avatar_url || ""}
                                alt={profilesMap[v.vistoriador_id || ""]?.name || ""}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {(profilesMap[v.vistoriador_id || ""]?.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {profilesMap[v.vistoriador_id || ""]?.name || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver mídias"
                            onClick={async () => {
                              setGalleryVistoriaId(v.id);
                              setGalleryOpen(true);
                              setGalleryLoading(true);
                              setGalleryFiles([]);
                              try {
                                const res = await fetch(`/api/vistoria/media/${v.id}`);
                                const data = await res.json();
                                if (data.files) setGalleryFiles(data.files);
                              } catch {
                                toast.error("Erro ao carregar mídias");
                              } finally {
                                setGalleryLoading(false);
                              }
                            }}
                          >
                            <ImageIcon className="size-4" />
                          </button>
                          <div className="relative">
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Câmera / Webcam"
                              onClick={() => setCameraOpenId(cameraOpenId === v.id ? null : v.id)}
                            >
                              <Camera className="size-4" />
                            </button>
                            {cameraOpenId === v.id && (
                              <>
                                <div className="absolute bottom-full right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 min-w-[130px]">
                                  <button
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-popover-foreground hover:bg-muted rounded"
                                    onClick={() => { pendingUploadRef.current = cameraOpenId; photoInputRef.current?.click(); setCameraOpenId(null); }}
                                  >
                                    <Camera className="size-3.5" /> Foto
                                  </button>
                                  <button
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-popover-foreground hover:bg-muted rounded"
                                    onClick={() => { pendingUploadRef.current = cameraOpenId; videoInputRef.current?.click(); setCameraOpenId(null); }}
                                  >
                                    <Camera className="size-3.5" /> Filmar
                                  </button>
                                </div>
                                <div className="fixed inset-0 z-40" onClick={() => setCameraOpenId(null)} />
                              </>
                            )}
                          </div>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Lápis / Editar"
                            onClick={() => {
                              if (v.status === "cancelado" || v.status === "concluido") {
                                toast.error("Vistoria " + statusLabels[v.status]?.toLowerCase() + " não pode ser editada");
                                return;
                              }
                              handleEdit(v);
                            }}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Localização / Endereço"
                            onClick={() => { setRouteVistoria(v); setRouteOrigin(""); setRouteDest(""); setRouteData(null); setRouteDialogOpen(true); }}
                          >
                            <MapPin className="size-4" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Telefone / Contato"
                            onClick={() => {
                              if (v.contact_phone) {
                                window.open(`https://wa.me/55${v.contact_phone.replace(/\D/g, "")}`, "_blank");
                              } else {
                                toast.error("Telefone não disponível");
                              }
                            }}
                          >
                            <Phone className="size-4" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="E-mail / Carta"
                          >
                            <Mail className="size-4" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Impressora / Imprimir"
                          >
                            <Printer className="size-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { resetForm(); setEditingVistoria(null); } setFormOpen(open); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {step === "select" && "Nova Vistoria"}
              {step === "pergunta" && "Vistoria"}
              {step === "imovel" && "Tipo de Imóvel"}
              {step === "cliente" && "Selecionar Cliente"}
              {step === "tipo" && "Confirmar"}
              {step === "comodos" && "Cubagem — Cômodos"}
              {step === "cubagem" && "Cubagem"}
              {step === "almoxarifado" && "Almoxarifado"}
            </DialogTitle>
          </DialogHeader>

          {step === "select" && (
            <div className="space-y-3">
              <Label>Tipo de Serviço</Label>
              <div className="grid gap-2">
                {tiposServico
                  .filter((t) => ["mudanca-residencial", "mudanca-comercial", "mudanca-interestadual", "guarda-volume"].includes(t.slug))
                  .map((t) => (
                    <Button
                      key={t.slug}
                      variant={tipoServico === t.slug ? "default" : "outline"}
                      onClick={() => { setTipoServico(t.slug); setStep("pergunta"); }}
                      className="justify-start h-12"
                    >
                      <Building2 className="size-4 mr-2 shrink-0" />
                      <span className="truncate">{t.nome}</span>
                    </Button>
                  ))}
                {tiposServico.filter((t) => ["mudanca-residencial", "mudanca-comercial", "mudanca-interestadual", "guarda-volume"].includes(t.slug)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo disponível</p>
                )}
              </div>

            </div>
          )}

          {step === "pergunta" && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/50 p-4 text-center space-y-3">
                <p className="text-sm font-medium text-foreground">Você já tem uma vistoria realizada para este cliente?</p>
                <p className="text-xs text-muted-foreground">Se já possui uma vistoria, podemos vinculá-la ao cliente selecionado.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => { setTemVistoria(true); setStep("cliente"); }}>
                  Sim, já tenho
                </Button>
                <Button onClick={() => { setTemVistoria(false); setStep("imovel"); }}>
                  Não, criar nova
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "imovel" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tipo de Imóvel</Label>
                <Badge variant="outline" className="text-xs">
                  {tiposServico.find((t) => t.slug === tipoServico)?.nome || tipoServico}
                </Badge>
              </div>
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                {tiposServico.filter((t) => t.categoria === "imovel").map((t) => (
                  <Button
                    key={t.slug}
                    variant={tipoImovel === t.slug ? "default" : "outline"}
                    onClick={() => { setTipoImovel(t.slug); setStep("cliente"); }}
                    className="justify-start h-12"
                  >
                    <Building2 className="size-4 mr-2 shrink-0" />
                    <span className="truncate">{t.nome}</span>
                  </Button>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("pergunta")}>
                  Voltar
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "cliente" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {tiposServico.find((t) => t.slug === tipoServico)?.nome || tipoServico}
                </Badge>
                {tipoImovel && (
                  <Badge variant="outline" className="text-xs">
                    {tiposServico.find((t) => t.slug === tipoImovel)?.nome || tipoImovel}
                  </Badge>
                )}
              </div>
              <div>
                <RadioGroup
                  value={contactMode}
                  onValueChange={(v) => {
                    setContactMode(v as "existing" | "new");
                    setShowNewContact(v === "new");
                    if (v === "existing") {
                      setSelectedContact(null);
                      setContactName("");
                      setContactPhone("");
                      setContactDocument("");
                    }
                  }}
                  className="flex gap-4 mb-3"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="text-sm cursor-pointer">Selecionar existente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="text-sm cursor-pointer">Cadastrar novo</Label>
                  </div>
                </RadioGroup>
                {contactMode === "existing" && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Nome, CPF, telefone ou email..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      onFocus={() => setContactDropdownOpen(true)}
                      className="pl-9"
                    />
                  </div>
                )}
                {contactDropdownOpen && contactSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {searchingContact ? (
                      <div className="flex items-center justify-center p-3">
                        <Loader2 className="size-4 animate-spin" />
                      </div>
                    ) : contactResults.length > 0 ? (
                      contactResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedContact(c);
                            setContactName(c.name ?? "");
                            setContactPhone(c.phone ?? "");
                            setContactDocument(c.document ?? "");
                            setContactDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          <p className="font-medium text-popover-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.phone && `${c.phone} `}
                            {c.document && `| ${c.document}`}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        <p>Nenhum cliente encontrado</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => { setContactMode("new"); setShowNewContact(true); }}
                          className="mt-1"
                        >
                          Cadastrar novo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedContact && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback>
                        <UserCircle className="size-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-popover-foreground">{selectedContact.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {temVistoria && selectedContact && (
                <div className="space-y-2">
                  <Label>Vistorias existentes deste cliente</Label>
                  {fetchingExisting ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="size-4 animate-spin mr-2" /> Buscando vistorias...
                    </div>
                  ) : existingVistorias.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {existingVistorias.map((v) => (
                        <div
                          key={v.id}
                          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                            selectedExistingVistoriaId === v.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedExistingVistoriaId(selectedExistingVistoriaId === v.id ? null : v.id)}
                        >
                          <Checkbox
                            checked={selectedExistingVistoriaId === v.id}
                            onCheckedChange={() => setSelectedExistingVistoriaId(selectedExistingVistoriaId === v.id ? null : v.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {tiposServico.find((t) => t.slug === v.tipo_servico)?.nome || v.tipo_servico}
                              {v.tipo_imovel && ` — ${tiposServico.find((t) => t.slug === v.tipo_imovel)?.nome || v.tipo_imovel}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={v.status === "concluido" ? "default" : v.status === "cancelado" ? "destructive" : "secondary"} className="text-[10px]">
                                {statusLabels[v.status] || v.status}
                              </Badge>
                              {v.data_vistoria && <span className="text-xs text-muted-foreground">{new Date(v.data_vistoria + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                              {v.total_cubagem > 0 && <span className="text-xs text-muted-foreground">{v.total_cubagem.toFixed(3)} m³</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">Nenhuma vistoria encontrada para este cliente</p>
                  )}
                </div>
              )}

              {contactMode === "new" && (
                <div className="space-y-3 border border-border rounded-md p-3">
                  <h4 className="text-sm font-medium">Novo Cliente</h4>
                  <div className="grid gap-2">
                    <Input
                      placeholder="Nome completo *"
                      value={newContact.name}
                      onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="CPF/CNPJ"
                        value={newContact.document}
                        onChange={(e) => setNewContact((p) => ({ ...p, document: e.target.value }))}
                      />
                      <Input
                        placeholder="Telefone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="Email"
                      value={newContact.email}
                      onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                    />
                    <Input
                      placeholder="Empresa"
                      value={newContact.company}
                      onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
                    />
                    <Input
                      placeholder="Endereço"
                      value={newContact.address}
                      onChange={(e) => setNewContact((p) => ({ ...p, address: e.target.value }))}
                    />

                    <Button onClick={handleNewContact} disabled={saving}>
                      {saving && <Loader2 className="size-4 animate-spin mr-1" />}
                      Cadastrar
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep(temVistoria ? "pergunta" : "imovel")}>
                  Voltar
                </Button>
                <Button
                  onClick={() => {
                    if (temVistoria && selectedExistingVistoriaId) {
                      setCurrentVistoriaId(selectedExistingVistoriaId);
                      const v = existingVistorias.find((x) => x.id === selectedExistingVistoriaId);
                      if (v?.tipo_servico === "guarda-volume") { setStep("cubagem"); }
                      else { setStep("comodos"); }
                      toast.success("Vistoria vinculada com sucesso");
                    } else {
                      setStep("tipo");
                    }
                  }}
                  disabled={!selectedContact && !contactName.trim()}
                >
                  {temVistoria && selectedExistingVistoriaId ? "Vincular Vistoria" : "Continuar"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "tipo" && (
            <div className="space-y-3">
              <Label>Confirmar Vistoria</Label>
              <div className="space-y-2">
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Tipo de Serviço</p>
                  <p className="font-medium">{tiposServico.find((t) => t.slug === tipoServico)?.nome || tipoServico}</p>
                </div>
                {tipoImovel && (
                  <div className="rounded-md border border-border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Tipo de Imóvel</p>
                    <p className="font-medium">{tiposServico.find((t) => t.slug === tipoImovel)?.nome || tipoImovel}</p>
                  </div>
                )}
              </div>
              {selectedContact && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{selectedContact.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                </div>
              )}
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={dataVistoria}
                  onChange={(e) => setDataVistoria(e.target.value)}
                  className="mt-1"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("cliente")}>
                  Voltar
                </Button>
                <Button onClick={handleCreateVistoria} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin mr-1" />}
                  Criar Vistoria
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "cubagem" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {tiposServico.find((t) => t.slug === tipoServico)?.nome || tipoServico}
                </Badge>
                {selectedContact && (
                  <Badge variant="outline" className="text-xs">
                    {selectedContact.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {cubagemItemsList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm rounded-md border border-border p-2">
                    <span className="flex-1 truncate">{item.item_name}</span>
                    <span className="text-muted-foreground w-16 text-right">{item.cubagem_m3.toFixed(3)} m³</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                        setCubagemItemsList((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantidade: qty } : it))
                        );
                      }}
                      className="w-16 h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setCubagemItemsList((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <select
                  className="flex-1 h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                  value=""
                  onChange={(e) => {
                    const item = cubagemItems.find((ci) => String(ci.id) === e.target.value);
                    if (item) {
                      setCubagemItemsList((prev) => [...prev, {
                        comodo: "Geral",
                        item_name: item.item_name,
                        cubagem_m3: item.default_m3,
                        quantidade: 1,
                      }]);
                    }
                  }}
                >
                  <option value="">Adicionar item...</option>
                  {cubagemItems.map((ci) => (
                    <option key={ci.id} value={ci.id}>
                      {ci.item_name} ({ci.default_m3.toFixed(3)} m³)
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Item personalizado"
                  className="w-40 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      const name = (e.target as HTMLInputElement).value.trim();
                      setCubagemItemsList((prev) => [...prev, {
                        comodo: "Geral",
                        item_name: name,
                        cubagem_m3: 0,
                        quantidade: 1,
                      }]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                  Pular
                </Button>
                <Button onClick={async () => {
                  if (!currentVistoriaId) return;
                  setSavingCubagem(true);
                  try {
                    if (cubagemItemsList.length > 0) {
                      const { error } = await supabase.from("vistoria_comodos").insert(
                        cubagemItemsList.map((i) => ({
                          vistoria_id: currentVistoriaId,
                          comodo: "Geral",
                          item_name: i.item_name,
                          cubagem_m3: i.cubagem_m3,
                          quantidade: i.quantidade,
                        }))
                      );
                      if (error) throw error;
                    }
                    const total = cubagemItemsList.reduce((sum, i) => sum + i.cubagem_m3 * i.quantidade, 0);
                    await supabase.from("vistorias").update({ total_cubagem: total }).eq("id", currentVistoriaId);
                    toast.success("Cubagem salva");
                    setFormOpen(false);
                    resetForm();
                    fetchVistorias();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao salvar cubagem");
                  } finally {
                    setSavingCubagem(false);
                  }
                }} disabled={savingCubagem}>
                  {savingCubagem && <Loader2 className="size-4 animate-spin mr-1" />}
                  Salvar Cubagem
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "comodos" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {tiposServico.find((t) => t.slug === tipoServico)?.nome || tipoServico}
                </Badge>
                {tipoImovel && (
                  <Badge variant="outline" className="text-xs">
                    {tiposServico.find((t) => t.slug === tipoImovel)?.nome || tipoImovel}
                  </Badge>
                )}
                {selectedContact && (
                  <Badge variant="outline" className="text-xs">
                    {selectedContact.name}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Selecione os cômodos</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultComodos.map((c) => (
                    <Button
                      key={c.id}
                      variant={selectedComodos.includes(c.comodo) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedComodos((prev) =>
                          prev.includes(c.comodo)
                            ? prev.filter((s) => s !== c.comodo)
                            : [...prev, c.comodo]
                        );
                        if (!comodoItems[c.comodo]) {
                          setComodoItems((prev) => ({ ...prev, [c.comodo]: [] }));
                        }
                      }}
                    >
                      {c.comodo}
                    </Button>
                  ))}
                  {customComodoInput ? (
                    <div className="flex gap-1 items-center">
                      <Input
                        value={customComodoInput}
                        onChange={(e) => setCustomComodoInput(e.target.value)}
                        placeholder="Nome do cômodo..."
                        className="w-40 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customComodoInput.trim()) {
                            const name = customComodoInput.trim();
                            if (!selectedComodos.includes(name)) {
                              setSelectedComodos((prev) => [...prev, name]);
                              setComodoItems((prev) => ({ ...prev, [name]: [] }));
                            }
                            setCustomComodoInput("");
                          }
                          if (e.key === "Escape") setCustomComodoInput("");
                        }}
                      />
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          const name = customComodoInput.trim();
                          if (name) {
                            if (!selectedComodos.includes(name)) {
                              setSelectedComodos((prev) => [...prev, name]);
                              setComodoItems((prev) => ({ ...prev, [name]: [] }));
                            }
                            setCustomComodoInput("");
                          }
                        }}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomComodoInput(" ")}
                      className="border-dashed"
                    >
                      <Plus className="size-3 mr-1" /> outro
                    </Button>
                  )}
                </div>
              </div>

              {selectedComodos.map((comodo) => (
                <div key={comodo} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{comodo}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => {
                        setSelectedComodos((prev) => prev.filter((s) => s !== comodo));
                      }}
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </Button>
                  </div>

                  {(comodoItems[comodo] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{item.item_name}</span>
                      <span className="text-muted-foreground w-16 text-right">{item.cubagem_m3.toFixed(3)} m³</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value) || 1);
                          setComodoItems((prev) => ({
                            ...prev,
                            [comodo]: prev[comodo].map((it, i) =>
                              i === idx ? { ...it, quantidade: qty } : it
                            ),
                          }));
                        }}
                        className="w-16 h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => {
                          setComodoItems((prev) => ({
                            ...prev,
                            [comodo]: prev[comodo].filter((_, i) => i !== idx),
                          }));
                        }}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                      value=""
                      onChange={(e) => {
                        const item = cubagemItems.find((ci) => String(ci.id) === e.target.value);
                        if (item) {
                          setComodoItems((prev) => ({
                            ...prev,
                            [comodo]: [...(prev[comodo] || []), {
                              comodo,
                              item_name: item.item_name,
                              cubagem_m3: item.default_m3,
                              quantidade: 1,
                            }],
                          }));
                        }
                      }}
                    >
                      <option value="">Adicionar item...</option>
                      {cubagemItems.map((ci) => (
                        <option key={ci.id} value={ci.id}>
                          {ci.item_name} ({ci.default_m3.toFixed(3)} m³)
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Item personalizado"
                      className="w-40 h-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                          const name = (e.target as HTMLInputElement).value.trim();
                          setComodoItems((prev) => ({
                            ...prev,
                            [comodo]: [...(prev[comodo] || []), {
                              comodo,
                              item_name: name,
                              cubagem_m3: 0,
                              quantidade: 1,
                            }],
                          }));
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              ))}

              {almoxarifadoItems.length > 0 && (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="size-4 text-amber-500" />
                    <p className="text-sm font-medium">Itens do Almoxerifado</p>
                  </div>

                  {vistoriaAlmoxarifadoItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{item.nome}</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value) || 1);
                          setVistoriaAlmoxarifadoItems((prev) =>
                            prev.map((it, i) => i === idx ? { ...it, quantidade: qty } : it)
                          );
                        }}
                        className="w-16 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.valor_custo}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setVistoriaAlmoxarifadoItems((prev) =>
                            prev.map((it, i) => i === idx ? { ...it, valor_custo: val } : it)
                          );
                        }}
                        className="w-20 h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => setVistoriaAlmoxarifadoItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                      value=""
                      onChange={(e) => {
                        const item = almoxarifadoItems.find((ai) => ai.id === e.target.value);
                        if (item) {
                          setVistoriaAlmoxarifadoItems((prev) => [...prev, {
                            nome: item.name,
                            quantidade: 1,
                            valor_custo: item.cost || 0,
                          }]);
                        }
                      }}
                    >
                      <option value="">Adicionar item do Almoxerifado...</option>
                      {almoxarifadoItems.map((ai) => (
                        <option key={ai.id} value={ai.id}>
                          {ai.name} {ai.cost != null ? `(R$ ${ai.cost.toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {vistoriaAlmoxarifadoItems.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Total Almoxerifado: <strong className="text-amber-500">R$ {vistoriaAlmoxarifadoItems.reduce((s, i) => s + i.quantidade * i.valor_custo, 0).toFixed(2)}</strong>
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                  Pular
                </Button>
                <Button onClick={async () => {
                  if (!currentVistoriaId) return;
                  setSavingCubagem(true);
                  try {
                    const allItems: ComodoItem[] = [];
                    Object.values(comodoItems).forEach((items) => allItems.push(...items));
                    if (allItems.length > 0) {
                      const { error } = await supabase.from("vistoria_comodos").insert(
                        allItems.map((i) => ({
                          vistoria_id: currentVistoriaId,
                          comodo: i.comodo,
                          item_name: i.item_name,
                          cubagem_m3: i.cubagem_m3,
                          quantidade: i.quantidade,
                        }))
                      );
                      if (error) throw error;
                    }
                    if (vistoriaAlmoxarifadoItems.length > 0) {
                      const { error: almoxError } = await supabase.from("vistoria_almoxarifado").insert(
                        vistoriaAlmoxarifadoItems.map((i) => ({
                          vistoria_id: currentVistoriaId,
                          nome: i.nome,
                          quantidade: i.quantidade,
                          valor_custo: i.valor_custo,
                        }))
                      );
                      if (almoxError) throw almoxError;
                    }
                    const totalCubagem = allItems.reduce((sum, i) => sum + i.cubagem_m3 * i.quantidade, 0);
                    const totalAlmox = vistoriaAlmoxarifadoItems.reduce((sum, i) => sum + i.quantidade * i.valor_custo, 0);
                    await supabase.from("vistorias").update({ total_cubagem: totalCubagem, total_valor_almoxarifado: totalAlmox }).eq("id", currentVistoriaId);
                    toast.success("Cubagem salva");
                    setFormOpen(false);
                    resetForm();
                    fetchVistorias();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao salvar cubagem");
                  } finally {
                    setSavingCubagem(false);
                  }
                }} disabled={savingCubagem}>
                  {savingCubagem && <Loader2 className="size-4 animate-spin mr-1" />}
                  Salvar Cubagem
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditingVistoria(null); setEditCubagemComodos([]); setEditAlmoxarifado([]); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vistoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Serviço</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.tipo_servico} onChange={(e) => setEditForm({ ...editForm, tipo_servico: e.target.value })}>
                {tiposServico.map((t) => <option key={t.slug} value={t.slug}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo de Imóvel</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.tipo_imovel} onChange={(e) => setEditForm({ ...editForm, tipo_imovel: e.target.value })}>
                <option value="">Selecione</option>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="comercial">Comercial</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={editForm.contact_name} onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={editForm.contact_document} onChange={(e) => setEditForm({ ...editForm, contact_document: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="pendente">Pendente</option>
                <option value="agendado">Agendado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <hr className="border-border" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Cubagem</Label>
                {editCubagemLoading && <Loader2 className="size-4 animate-spin" />}
              </div>
              {editCubagemComodos.length === 0 && !editCubagemLoading && (
                <p className="text-sm text-muted-foreground">Nenhum item de cubagem.</p>
              )}
              <div className="space-y-2">
                {editCubagemComodos.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm rounded-md border border-border p-2">
                    <span className="flex-1 truncate">
                      {item.comodo !== "Geral" && (
                        <Badge variant="outline" className="text-[10px] mr-1">{item.comodo}</Badge>
                      )}
                      {item.item_name}
                    </span>
                    <span className="text-muted-foreground w-16 text-right">{item.cubagem_m3.toFixed(3)} m³</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                        setEditCubagemComodos((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantidade: qty } : it))
                        );
                      }}
                      className="w-16 h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setEditCubagemComodos((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <select
                  className="flex-1 h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                  value=""
                  onChange={(e) => {
                    const item = cubagemItems.find((ci) => String(ci.id) === e.target.value);
                    if (item) {
                      setEditCubagemComodos((prev) => [...prev, {
                        comodo: "Geral",
                        item_name: item.item_name,
                        cubagem_m3: item.default_m3,
                        quantidade: 1,
                      }]);
                    }
                  }}
                >
                  <option value="">Adicionar item...</option>
                  {cubagemItems.map((ci) => (
                    <option key={ci.id} value={ci.id}>
                      {ci.item_name} ({ci.default_m3.toFixed(3)} m³)
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Item personalizado"
                  className="w-36 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      const name = (e.target as HTMLInputElement).value.trim();
                      setEditCubagemComodos((prev) => [...prev, {
                        comodo: "Geral",
                        item_name: name,
                        cubagem_m3: 0,
                        quantidade: 1,
                      }]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
              {editCubagemComodos.length > 0 && (
                <p className="text-sm text-muted-foreground text-right mt-1">
                  Total: <strong>{editCubagemComodos.reduce((s, i) => s + i.cubagem_m3 * i.quantidade, 0).toFixed(3)} m³</strong>
                </p>
              )}
            </div>

            <hr className="border-border" />

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Warehouse className="size-4 text-amber-500" />
                <Label className="text-base">Estoque</Label>
              </div>
              {editAlmoxarifado.length === 0 && (
                <p className="text-sm text-muted-foreground mb-2">Nenhum item do estoque.</p>
              )}
              <div className="space-y-2">
                {editAlmoxarifado.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm rounded-md border border-border p-2">
                    <span className="flex-1 truncate">{item.nome}</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                        setEditAlmoxarifado((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, quantidade: qty } : it)
                        );
                      }}
                      className="w-16 h-8 text-xs"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.valor_custo}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setEditAlmoxarifado((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, valor_custo: val } : it)
                        );
                      }}
                      className="w-20 h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setEditAlmoxarifado((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {almoxarifadoItems.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <select
                    className="flex-1 h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                    value=""
                    onChange={(e) => {
                      const item = almoxarifadoItems.find((ai) => ai.id === e.target.value);
                      if (item) {
                        setEditAlmoxarifado((prev) => [...prev, {
                          nome: item.name,
                          quantidade: 1,
                          valor_custo: item.cost || 0,
                        }]);
                      }
                    }}
                  >
                    <option value="">Adicionar item do Almoxerifado...</option>
                    {almoxarifadoItems.map((ai) => (
                      <option key={ai.id} value={ai.id}>
                        {ai.name} {ai.cost != null ? `(R$ ${ai.cost.toFixed(2)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editAlmoxarifado.length > 0 && (
                <p className="text-xs text-muted-foreground text-right mt-1">
                  Total: <strong className="text-amber-500">R$ {editAlmoxarifado.reduce((s, i) => s + i.quantidade * i.valor_custo, 0).toFixed(2)}</strong>
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between gap-2 mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingVistoria(null); }}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteVistoria}>Excluir</Button>
            </div>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={routeDialogOpen} onOpenChange={(open) => { if (!open) setRouteData(null); setRouteDialogOpen(open); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Rota da Vistoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-100px)] pr-1">
            <div>
              <Label className="flex items-center gap-1">
                <span className="size-4 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">A</span>
                Endereço de Origem
              </Label>
              <Input
                placeholder="Digite o endereço ou CEP..."
                value={routeOrigin}
                onChange={(e) => setRouteOrigin(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <span className="size-4 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">B</span>
                Endereço de Destino
              </Label>
              <Input
                placeholder="Digite o endereço ou CEP..."
                value={routeDest}
                onChange={(e) => setRouteDest(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCalcRoute}
              disabled={!routeOrigin.trim() || !routeDest.trim() || routeLoading}
              className="w-full"
            >
              {routeLoading && <Loader2 className="size-4 animate-spin mr-1" />}
              Calcular Rota
            </Button>

            {routeData && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-3 bg-muted/50 text-sm border-b border-border">
                  <span className="text-muted-foreground">
                    <span className="size-4 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mr-1">A</span>
                    {routeData.origin}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="size-4 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold mr-1">B</span>
                    {routeData.destination}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border text-sm">
                  <span className="text-muted-foreground">
                    Distância: <strong className="text-foreground">{routeData.distance}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Duração: <strong className="text-foreground">{routeData.duration}</strong>
                  </span>
                </div>
                <div className="flex gap-2 px-4 py-3">
                  <Button onClick={() => window.open(routeData.mapsUrl, "_blank")} variant="outline" className="flex-1">
                    <MapPin className="size-4 mr-1" /> Abrir no Google Maps
                  </Button>
                  <Button onClick={handleSaveRoute} className="flex-1">
                    <MapPin className="size-4 mr-1" /> Salvar Rota
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recordingOpen} onOpenChange={(open) => { if (!open) cleanupRecording(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRecording ? "Gravando..." : recordingTime > 0 ? "Gravação finalizada" : "Câmera"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoPreviewRef}
                className="w-full h-[320px] object-cover"
                muted
                playsInline
              />
              {!mediaStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Iniciando câmera...
                </div>
              )}
            </div>
            {isRecording && (
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                  <span className="size-2 rounded-full bg-destructive animate-pulse" />
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                </span>
              </div>
            )}
            <div className="flex justify-center gap-3">
              {!isRecording && recordingTime === 0 && (
                <Button onClick={beginRecording}>
                  <Camera className="size-4 mr-1" /> Gravar
                </Button>
              )}
              {isRecording && (
                <Button variant="destructive" onClick={stopVideoRecording}>
                  Parar
                </Button>
              )}
              {!isRecording && recordingTime > 0 && (
                <Button variant="outline" onClick={cleanupRecording}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={galleryOpen} onOpenChange={(open) => { if (!open) { setGalleryOpen(false); setGalleryFiles([]); } }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Mídias da Vistoria</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-100px)] pr-1">
            {galleryLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : galleryFiles.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ImageIcon className="size-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma mídia encontrada</p>
                <p className="text-xs mt-1">Use a câmera para tirar fotos ou filmar</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {galleryFiles.map((file) => (
                  <div key={file.name} className="rounded-lg border border-border overflow-hidden bg-muted/30">
                    {file.type === "video" ? (
                      <video controls className="w-full aspect-[4/3] object-cover" preload="metadata">
                        <source src={file.url} />
                      </video>
                    ) : (
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <img src={file.url} alt={file.name} className="w-full aspect-[4/3] object-cover hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
