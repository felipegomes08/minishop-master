import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  expanded: boolean;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    parent_id: ''
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const buildTree = (items: Category[], parentId: string | null = null): CategoryNode[] => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
        expanded: expandedIds.has(item.id)
      }));
  };

  const categoryTree = buildTree(categories);

  const resetForm = () => {
    setFormData({ name: '', parent_id: '' });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || ''
    });
    setDialogOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    // Prevent circular reference
    if (editingCategory && formData.parent_id === editingCategory.id) {
      toast({ title: 'Uma categoria não pode ser pai de si mesma', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const categoryData = {
        name: formData.name,
        parent_id: formData.parent_id || null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: 'Categoria atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
        toast({ title: 'Categoria criada com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({ title: 'Erro ao salvar categoria', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) {
      toast({ 
        title: 'Não é possível excluir', 
        description: 'Esta categoria possui subcategorias. Exclua-as primeiro.',
        variant: 'destructive' 
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Categoria excluída com sucesso' });
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' });
    }
  };

  const getParentOptions = (excludeId?: string): Category[] => {
    if (!excludeId) return categories;
    
    // Get all descendant IDs to exclude
    const getDescendantIds = (parentId: string): string[] => {
      const children = categories.filter(c => c.parent_id === parentId);
      return [
        parentId,
        ...children.flatMap(c => getDescendantIds(c.id))
      ];
    };
    
    const excludeIds = getDescendantIds(excludeId);
    return categories.filter(c => !excludeIds.includes(c.id));
  };

  const renderCategoryItem = (node: CategoryNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30",
          )}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded",
              hasChildren ? "hover:bg-secondary cursor-pointer" : "cursor-default"
            )}
          >
            {hasChildren && (
              <ChevronRight 
                className={cn(
                  "w-4 h-4 transition-transform",
                  node.expanded && "rotate-90"
                )} 
              />
            )}
          </button>

          {node.expanded ? (
            <FolderOpen className="w-5 h-5 text-warning" />
          ) : (
            <Folder className="w-5 h-5 text-warning" />
          )}

          <span className="flex-1 font-medium">{node.name}</span>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditDialog(node)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteCategory(node.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {node.expanded && node.children.map(child => renderCategoryItem(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="text-muted-foreground mt-1">Organize seus produtos com categorias hierárquicas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da categoria"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria Pai</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (nível principal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (nível principal)</SelectItem>
                    {getParentOptions(editingCategory?.id).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Tree */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma categoria ainda</h3>
            <p className="text-muted-foreground mt-1">
              Crie sua primeira categoria para organizar produtos
            </p>
          </div>
        ) : (
          <div>
            {categoryTree.map(node => renderCategoryItem(node))}
          </div>
        )}
      </div>
    </div>
  );
}
