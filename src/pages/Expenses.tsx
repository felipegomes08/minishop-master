import { useEffect, useMemo, useState } from "react";
import { Camera, CalendarIcon, Eye, FileImage, Loader2, Pencil, Plus, Search, Trash2, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Expense = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  receipt_image_url: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseForm = {
  title: string;
  description: string;
  category: string;
  amount: string;
  expenseDate: Date;
  paymentMethod: string;
  receiptImageUrl: string | null;
};

const categories = ["Compra de produtos", "Aluguel", "Marketing", "Taxas", "Transporte", "Embalagens", "Serviços", "Alimentação", "Outros"];
const paymentMethods = ["Pix", "Dinheiro", "Cartão", "Boleto", "Transferência", "Outros"];

const emptyForm = (): ExpenseForm => ({
  title: "",
  description: "",
  category: "Outros",
  amount: "",
  expenseDate: new Date(),
  paymentMethod: "Outros",
  receiptImageUrl: null,
});

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (value: string) => format(new Date(`${value}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
const dateToInput = (date: Date) => format(date, "yyyy-MM-dd");

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type: mime });
}

async function compressImage(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageUrl;
  });

  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(imageUrl);

  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function Expenses() {
  const { companyId, loading: companyLoading } = useCompanyContext();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saveReceipt, setSaveReceipt] = useState(false);
  const [receiptImageBase64, setReceiptImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingReceipt, setReadingReceipt] = useState(false);

  const db = supabase as any;

  const fetchData = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      let expensesQuery = db
        .from("expenses")
        .select("*")
        .eq("company_id", companyId)
        .order("expense_date", { ascending: false });

      if (startDate) {
        expensesQuery = expensesQuery.gte("expense_date", dateToInput(startDate));
      }
      if (endDate) {
        expensesQuery = expensesQuery.lte("expense_date", dateToInput(endDate));
      }

      const { data: expensesData, error: expensesError } = await expensesQuery;

      if (expensesError) throw expensesError;

      setExpenses((expensesData || []) as Expense[]);
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
      toast({ title: "Erro ao carregar despesas", description: "Tente novamente em alguns instantes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyLoading && companyId) fetchData();
  }, [companyId, companyLoading, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return expenses;
    return expenses.filter((expense) =>
      [expense.title, expense.category, expense.payment_method, expense.description || ""].some((field) => field.toLowerCase().includes(query)),
    );
  }, [expenses, searchQuery]);

  const openCreateDialog = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setSaveReceipt(false);
    setReceiptImageBase64(null);
    setDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title,
      description: expense.description || "",
      category: expense.category,
      amount: String(Number(expense.amount || 0)),
      expenseDate: new Date(`${expense.expense_date}T12:00:00`),
      paymentMethod: expense.payment_method,
      receiptImageUrl: expense.receipt_image_url,
    });
    setSaveReceipt(Boolean(expense.receipt_image_url));
    setReceiptImageBase64(null);
    setDialogOpen(true);
  };

  const handleReceiptUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Anexe uma imagem da notinha.", variant: "destructive" });
      return;
    }

    setReadingReceipt(true);
    try {
      const imageBase64 = await compressImage(file);
      setReceiptImageBase64(imageBase64);
      const { data, error } = await supabase.functions.invoke("extract-expense-from-receipt", { body: { imageBase64 } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data.expense;
      setForm((current) => ({
        ...current,
        title: extracted.title || extracted.vendor || current.title,
        amount: extracted.amount ? String(Number(extracted.amount).toFixed(2)) : current.amount,
        expenseDate: extracted.expenseDate ? new Date(`${extracted.expenseDate}T12:00:00`) : current.expenseDate,
        category: categories.includes(extracted.category) ? extracted.category : "Outros",
        paymentMethod: paymentMethods.includes(extracted.paymentMethod) ? extracted.paymentMethod : "Outros",
        description: extracted.description || extracted.vendor || current.description,
      }));
      toast({ title: "Notinha lida com sucesso", description: "Confira os dados antes de salvar a despesa." });
    } catch (error) {
      console.error("Erro ao ler notinha:", error);
      toast({ title: "Não foi possível ler a notinha", description: error instanceof Error ? error.message : "Preencha os dados manualmente.", variant: "destructive" });
    } finally {
      setReadingReceipt(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    const amount = Number(String(form.amount).replace(",", "."));
    if (!form.title.trim() || !amount || amount <= 0) {
      toast({ title: "Preencha os campos obrigatórios", description: "Informe título e valor da despesa.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let receiptImageUrl = saveReceipt ? form.receiptImageUrl : null;

      if (saveReceipt && receiptImageBase64) {
        const filePath = `${companyId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("expense-receipts").upload(filePath, dataUrlToBlob(receiptImageBase64), {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        receiptImageUrl = filePath;
      }

      const payload = {
        company_id: companyId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        amount,
        expense_date: dateToInput(form.expenseDate),
        payment_method: form.paymentMethod,
        receipt_image_url: receiptImageUrl,
      };

      const query = editingExpense
        ? db.from("expenses").update(payload).eq("id", editingExpense.id).eq("company_id", companyId)
        : db.from("expenses").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast({ title: editingExpense ? "Despesa atualizada" : "Despesa cadastrada", description: "As informações da despesa foram salvas." });
      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      toast({ title: "Erro ao salvar despesa", description: "Verifique os dados e tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense || !companyId) return;
    try {
      const { error } = await db.from("expenses").delete().eq("id", selectedExpense.id).eq("company_id", companyId);
      if (error) throw error;
      toast({ title: "Despesa excluída", description: "A despesa foi removida." });
      setDeleteOpen(false);
      setSelectedExpense(null);
      await fetchData();
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      toast({ title: "Erro ao excluir despesa", description: "Tente novamente em alguns instantes.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Despesas</h1>
          <p className="text-sm text-muted-foreground">Controle os gastos da empresa e organize seus comprovantes.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por título, categoria ou forma de pagamento" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <DatePicker label="Início" date={startDate} onChange={setStartDate} />
            <DatePicker label="Fim" date={endDate} onChange={setEndDate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="rounded-full bg-muted p-3"><TrendingDown className="h-6 w-6 text-muted-foreground" /></div>
              <div>
                <h3 className="font-medium">Nenhuma despesa encontrada</h3>
                <p className="text-sm text-muted-foreground">Cadastre manualmente ou use o leitor de notinha.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Despesa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="font-medium">{expense.title}</div>
                      {expense.description && <div className="max-w-[320px] truncate text-sm text-muted-foreground">{expense.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell>{expense.payment_method}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedExpense(expense); setDetailsOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(expense)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedExpense(expense); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar despesa" : "Nova despesa"}</DialogTitle>
            <DialogDescription>Preencha manualmente ou anexe uma foto da notinha para completar os campos com IA.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <Label htmlFor="receipt-upload" className="mb-2 block">Leitor de notinha</Label>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">A imagem é usada para leitura. Ative a opção abaixo se quiser salvar o comprovante na despesa.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" className="gap-2" disabled={readingReceipt} asChild>
                    <label htmlFor="receipt-camera" className="cursor-pointer">
                      {readingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {readingReceipt ? "Lendo..." : "Tirar foto"}
                    </label>
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" disabled={readingReceipt} asChild>
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      {readingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                      Buscar da galeria
                    </label>
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3">
                  <Label htmlFor="save-receipt" className="text-sm font-medium">Salvar comprovante nesta despesa</Label>
                  <Switch id="save-receipt" checked={saveReceipt} onCheckedChange={setSaveReceipt} />
                </div>
                {saveReceipt && !receiptImageBase64 && !form.receiptImageUrl && <p className="text-xs text-muted-foreground">Anexe ou tire uma foto para salvar o comprovante.</p>}
                {form.receiptImageUrl && !receiptImageBase64 && <p className="text-xs text-muted-foreground">Esta despesa já possui comprovante salvo.</p>}
                <Input id="receipt-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleReceiptUpload(event.target.files?.[0])} />
                <Input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={(event) => handleReceiptUpload(event.target.files?.[0])} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Compra de embalagens" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <DatePicker date={form.expenseDate} onChange={(date) => date && setForm({ ...form, expenseDate: date })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={(paymentMethod) => setForm({ ...form, paymentMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Observações</Label>
                <Textarea id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Detalhes adicionais da despesa" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || readingReceipt}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da despesa</DialogTitle>
          </DialogHeader>
          {selectedExpense && <div className="space-y-3 text-sm">
            <DetailRow label="Título" value={selectedExpense.title} />
            <DetailRow label="Valor" value={formatCurrency(Number(selectedExpense.amount))} />
            <DetailRow label="Data" value={formatDate(selectedExpense.expense_date)} />
            <DetailRow label="Categoria" value={selectedExpense.category} />
            <DetailRow label="Pagamento" value={selectedExpense.payment_method} />
            <DetailRow label="Observações" value={selectedExpense.description || "Sem observações"} />
          </div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação removerá a despesa do balanço e não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DatePicker({ label, date, onChange }: { label?: string; date?: Date; onChange: (date?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <CalendarIcon className="h-4 w-4" />
          {label && <span className="text-muted-foreground">{label}:</span>}
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={onChange} initialFocus locale={ptBR} />
      </PopoverContent>
    </Popover>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}