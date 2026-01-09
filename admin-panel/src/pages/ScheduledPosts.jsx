import { useEffect, useState } from 'react';
import api from '../services/api';
import { Trash2, Play, Search, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';

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
        if (!confirm('Deseja forçar a publicação imediata? Isso ignorará o horário otimizado.')) return;

        setProcessing(prev => ({ ...prev, publish: id }));
        try {
            await api.post(`/scheduled-posts/${id}/publish-now`);
            fetchPosts(pagination.page);
            toast({ title: "Sucesso!", description: "Publicação iniciada!", variant: "success" });
        } catch (error) {
            toast({ title: "Erro!", description: "Falha ao publicar.", variant: "destructive" });
        } finally {
            setProcessing(prev => ({ ...prev, publish: null }));
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agendamentos IA</h1>
                    <p className="text-muted-foreground">
                        Fila de publicações inteligentes ({pagination.total})
                    </p>
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
                                                {/* Como não temos motivo salvo no banco ainda, omitimos ou mostramos só data */}
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
        </div>
    );
}
