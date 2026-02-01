import { useEffect, useState } from 'react';
import api from '../services/api';
import { Trash2, Play, Search, Calendar, Clock, AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function ScheduledPosts() {
    const { toast } = useToast();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        totalPages: 1,
        total: 0
    });

    const [processing, setProcessing] = useState({
        delete: null,
        publish: null
    });

    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Estados para modal de cupom
    const [couponModalOpen, setCouponModalOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [selectedCoupon, setSelectedCoupon] = useState('none');
    const [loadingCoupons, setLoadingCoupons] = useState(false);

    useEffect(() => {
        fetchPosts(1);
    }, [statusFilter]);

    const fetchPosts = async (page = 1) => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await api.get('/scheduled-posts', { params });
            const { data, count } = response.data.data;

            setPosts(data || []);
            setPagination(prev => ({
                ...prev,
                page,
                totalPages: Math.ceil((count || 0) / 20),
                total: count || 0
            }));

        } catch (error) {
            console.error('❌ Erro ao carregar agendamentos:', error);
            toast({
                title: "Erro",
                description: "Falha ao carregar agendamentos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!confirm('Deseja cancelar este agendamento?')) return;

        setProcessing(prev => ({ ...prev, delete: id }));
        try {
            await api.delete(`/scheduled-posts/${id}`);
            fetchPosts(pagination.page);
            toast({ title: "Sucesso!", description: "Agendamento cancelado.", variant: "success" });
        } catch (error) {
            toast({ title: "Erro!", description: "Falha ao cancelar.", variant: "destructive" });
        } finally {
            setProcessing(prev => ({ ...prev, delete: null }));
        }
    };

    const handlePublishNow = async (id) => {
        // Abrir modal para vincular cupom
        setSelectedPostId(id);
        setCouponModalOpen(true);
        fetchCoupons();
    };

    const fetchCoupons = async () => {
        try {
            setLoadingCoupons(true);
            const response = await api.get('/coupons/active');
            // A resposta é { success: true, data: { coupons: [...], total, page, limit, totalPages } }
            setAvailableCoupons(response.data.data.coupons || []);
        } catch (error) {
            console.error('Erro ao carregar cupons:', error);
            toast({ title: "Erro", description: "Falha ao carregar cupons.", variant: "destructive" });
        } finally {
            setLoadingCoupons(false);
        }
    };

    const confirmPublish = async () => {
        if (!selectedPostId) return;

        setProcessing(prev => ({ ...prev, publish: selectedPostId }));
        setCouponModalOpen(false);

        try {
            const payload = (selectedCoupon && selectedCoupon !== 'none') ? { coupon_id: selectedCoupon } : {};
            await api.post(`/scheduled-posts/${selectedPostId}/publish-now`, payload);
            fetchPosts(pagination.page);
            toast({
                title: "Sucesso!",
                description: (selectedCoupon && selectedCoupon !== 'none') ? "Publicação com cupom iniciada!" : "Publicação iniciada!",
                variant: "success"
            });
        } catch (error) {
            toast({ title: "Erro!", description: "Falha ao publicar.", variant: "destructive" });
        } finally {
            setProcessing(prev => ({ ...prev, publish: null }));
            setSelectedPostId(null);
            setSelectedCoupon('none');
        }
    };

    const handleBulkDeletePending = async () => {
        const pendingCount = posts.filter(p => p.status === 'pending').length;

        if (pendingCount === 0) {
            toast({
                title: "Aviso",
                description: "Não há agendamentos pendentes para apagar.",
                variant: "default"
            });
            return;
        }

        const confirmMessage = `Deseja realmente apagar TODOS os ${pendingCount} agendamento(s) pendente(s)? Esta ação não pode ser desfeita!`;
        if (!confirm(confirmMessage)) return;

        setBulkDeleting(true);
        try {
            const response = await api.delete('/scheduled-posts/bulk/pending');
            const deletedCount = response.data.data.deletedCount;

            toast({
                title: "Sucesso!",
                description: `${deletedCount} agendamento(s) pendente(s) cancelado(s) com sucesso.`,
                variant: "success"
            });

            // Recarregar a lista
            fetchPosts(1); // Volta para a primeira página
        } catch (error) {
            console.error('Erro ao apagar agendamentos em lote:', error);
            toast({
                title: "Erro!",
                description: "Falha ao apagar agendamentos pendentes.",
                variant: "destructive"
            });
        } finally {
            setBulkDeleting(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        };
        const labels = {
            pending: "Pendente",
            published: "Publicado",
            failed: "Falhou"
        };
        return (
            <Badge className={styles[status] || "bg-gray-100"}>
                {labels[status] || status}
            </Badge>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatPrice = (price) => {
        if (!price) return '-';
        return `R$ ${parseFloat(price).toFixed(2)}`;
    };

    const getTimeRemaining = (scheduledAt) => {
        if (!scheduledAt) return null;
        const now = new Date();
        const scheduled = new Date(scheduledAt);
        const diff = scheduled - now;

        if (diff <= 0) return { text: 'Aguardando processamento', color: 'text-orange-500', urgent: true };

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return { text: `em ${days}d ${hours % 24}h`, color: 'text-muted-foreground', urgent: false };
        if (hours > 0) return { text: `em ${hours}h ${minutes % 60}min`, color: 'text-blue-500', urgent: false };
        if (minutes > 5) return { text: `em ${minutes} min`, color: 'text-yellow-500', urgent: false };
        return { text: `em ${minutes} min`, color: 'text-red-500', urgent: true };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agendamentos IA</h1>
                    <p className="text-muted-foreground">
                        Fila de publicações inteligentes ({pagination.total})
                    </p>
                </div>
                <div className="flex gap-2">
                    {statusFilter === 'pending' && posts.filter(p => p.status === 'pending').length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDeletePending}
                            disabled={bulkDeleting || loading}
                        >
                            {bulkDeleting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Trash className="h-4 w-4 mr-2" />
                            )}
                            Apagar Pendentes em Lote
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPosts(pagination.page)}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                {['all', 'pending', 'published', 'failed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === status
                            ? 'bg-background shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {status === 'all' ? 'Todos' :
                            status === 'pending' ? 'Pendentes' :
                                status === 'published' ? 'Publicados' : 'Falhas'}
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="p-0" />
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Plataforma</TableHead>
                                <TableHead>Agendado Para</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : posts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Nenhum agendamento encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                posts.map(post => (
                                    <TableRow key={post.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={post.products?.image_url || 'https://via.placeholder.com/40'}
                                                    className="w-10 h-10 rounded object-cover border"
                                                    alt="Product"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium truncate max-w-[200px]" title={post.products?.name}>
                                                        {post.products?.name || 'Produto Removido'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {post.products?.category?.name || 'Sem Categoria'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-green-600">
                                                {formatPrice(post.products?.current_price)}
                                            </div>
                                            {post.products?.old_price && post.products.old_price > post.products.current_price && (
                                                <div className="text-xs text-muted-foreground line-through">
                                                    {formatPrice(post.products.old_price)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {post.platform}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(post.scheduled_at)}
                                                </div>
                                                {post.status === 'pending' && (() => {
                                                    const timeInfo = getTimeRemaining(post.scheduled_at);
                                                    return timeInfo && (
                                                        <span className={`text-xs ${timeInfo.color} flex items-center gap-1`}>
                                                            <Clock className="w-3 h-3" />
                                                            {timeInfo.text}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(post.status)}
                                            {post.status === 'failed' && (
                                                <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={post.error_message}>
                                                    {post.error_message}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {post.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                                        title="Publicar Agora"
                                                        onClick={() => handlePublishNow(post.id)}
                                                        disabled={processing.publish === post.id}
                                                    >
                                                        <Play className="h-4 w-4 text-white" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8 w-8 p-0"
                                                        title="Cancelar"
                                                        onClick={() => handleCancel(post.id)}
                                                        disabled={processing.delete === post.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={fetchPosts}
            />

            {/* Modal de Vinculação de Cupom */}
            <Dialog open={couponModalOpen} onOpenChange={setCouponModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Vincular Cupom (Opcional)
                        </DialogTitle>
                        <DialogDescription>
                            Selecione um cupom para vincular a esta publicação. O template "Promoção + Cupom" será usado automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {loadingCoupons ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cupom</label>
                                <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sem cupom" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem cupom</SelectItem>
                                        {availableCoupons.map(coupon => (
                                            <SelectItem key={coupon.id} value={coupon.id}>
                                                <div className="flex items-center gap-2">
                                                    <Tag className="h-3 w-3" />
                                                    <span className="font-mono font-semibold">{coupon.code}</span>
                                                    <span className="text-muted-foreground">-</span>
                                                    <span className="text-green-600">
                                                        {coupon.discount_type === 'percentage'
                                                            ? `${coupon.discount_value}% OFF`
                                                            : `R$ ${coupon.discount_value} OFF`
                                                        }
                                                    </span>
                                                    {coupon.platform && (
                                                        <Badge variant="outline" className="ml-auto text-xs">
                                                            {coupon.platform}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {availableCoupons.length === 0 && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Nenhum cupom ativo disponível.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCouponModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmPublish} disabled={loadingCoupons}>
                            {(selectedCoupon && selectedCoupon !== 'none') ? 'Publicar com Cupom' : 'Publicar Agora'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
